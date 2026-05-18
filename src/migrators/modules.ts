import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import type { PlaneModule } from "../clients/plane";
import { logger } from "../lib/logger";
import { append, hasMigrated, loadManifest } from "../state/manifest";

/**
 * Migrate modules to Plane and assign work items by Jira custom-field value.
 *
 * Two phases:
 *   1. **Seed**: for each name in `projectCfg.module_seed`, ensure a Plane
 *      module with that name exists. Idempotent — skips existing modules.
 *      Manifest key: `<JIRA_PROJECT>#module#<MODULE_NAME>`.
 *   2. **Assign**: if `modules_from_field` is set, pull every Jira issue's
 *      value for that field via a single JQL search, bucket work items by
 *      the value (matched against module names), then POST one bulk add per
 *      module. Plane treats re-adds as no-ops so no per-assignment manifest
 *      bookkeeping is needed.
 *
 * Run AFTER issues — needs plane_ids from the work_item manifest.
 */
export async function migrateModules(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  const projectCfg = ctx.config.projects[ctx.jiraProject];
  if (!projectCfg) {
    return { ok: false, migrated: 0, skipped: 0, failed: 1, notes: "missing project config" };
  }
  const seed = projectCfg.module_seed ?? [];
  if (seed.length === 0) {
    logger.info(`migrateModules: no module_seed for ${ctx.jiraProject} — nothing to do`);
    return { ok: true, migrated: 0, skipped: 0, failed: 0 };
  }
  logger.info(`migrateModules start: project=${ctx.jiraProject} dryRun=${ctx.dryRun} seed=${seed.length}`);

  // --- Phase 1: ensure modules ---
  const existing = ctx.dryRun && planeProjectId === "dry-run-project-id"
    ? []
    : await plane.listModules(planeProjectId);
  const byName = new Map<string, PlaneModule>(existing.map((m) => [m.name, m]));

  let migrated = 0;
  let failed = 0;
  const moduleByName = new Map<string, PlaneModule>();

  for (const name of seed) {
    const seedKey = `${ctx.jiraProject}#module#${name}`;
    const hit = byName.get(name);
    if (hit) {
      moduleByName.set(name, hit);
      logger.info(`module exists: ${name} (${hit.id})`);
      // Record in manifest if not already there — fills gaps from older runs.
      if (!(await hasMigrated("module", seedKey)) && !ctx.dryRun) {
        await append({
          entity: "module",
          project: ctx.jiraProject,
          jira_key: seedKey,
          plane_id: hit.id,
          status: "ok",
          at: new Date().toISOString(),
          notes: "existing",
        });
      }
      continue;
    }

    if (ctx.resume && (await hasMigrated("module", seedKey))) continue;

    try {
      if (ctx.dryRun) {
        logger.info(`[dry-run] would create module: ${name}`);
        // Stub entry so the assignment phase can preview bucket sizes too.
        moduleByName.set(name, { id: `dry-run-${name}`, name });
        continue;
      }
      const created = await plane.createModule(planeProjectId, { name });
      moduleByName.set(name, created);
      logger.info(`created module: ${name} (${created.id})`);
      await append({
        entity: "module",
        project: ctx.jiraProject,
        jira_key: seedKey,
        plane_id: created.id,
        status: "ok",
        at: new Date().toISOString(),
        notes: "created",
      });
      migrated++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed to create module ${name}: ${error}`);
      if (!ctx.dryRun) {
        await append({
          entity: "module",
          project: ctx.jiraProject,
          jira_key: seedKey,
          status: "failed",
          at: new Date().toISOString(),
          error: error.slice(0, 500),
        });
      }
      failed++;
    }
  }

  // --- Phase 2: assign work items by custom-field value ---
  const fieldId = projectCfg.modules_from_field;
  if (!fieldId) {
    logger.info(`migrateModules: modules_from_field not set — skipping assignment phase`);
    return finish(migrated, 0, failed);
  }
  if (moduleByName.size === 0) {
    logger.warn(`migrateModules: no modules available — skipping assignment phase`);
    return finish(migrated, 0, failed);
  }

  // Build jira_key → plane_id from the work_item manifest.
  const manifest = await loadManifest();
  const jiraToPlane = new Map<string, string>();
  for (const e of manifest.values()) {
    if (e.entity === "work_item" && e.project === ctx.jiraProject && e.status === "ok" && e.plane_id) {
      jiraToPlane.set(e.jira_key, e.plane_id);
    }
  }
  if (jiraToPlane.size === 0) {
    logger.warn(`migrateModules: no migrated work_item entries for ${ctx.jiraProject} — assignment phase has nothing to do`);
    return finish(migrated, 0, failed);
  }
  logger.info(`migrateModules: ${jiraToPlane.size} work items eligible for module assignment`);

  // Paginated JQL fetch of just the routing field.
  const buckets = new Map<string, string[]>();  // moduleName -> [plane_id]
  let nextPageToken: string | undefined;
  while (true) {
    const page = await jira.searchIssues({
      jql: `project = ${ctx.jiraProject} ORDER BY created ASC`,
      fields: [fieldId],
      pageSize: ctx.batch,
      nextPageToken,
    });
    for (const issue of page.issues) {
      const planeId = jiraToPlane.get(issue.key);
      if (!planeId) continue;
      const raw = (issue.fields as Record<string, unknown>)[fieldId];
      const value = extractFieldValue(raw);
      if (!value) continue;
      if (!moduleByName.has(value)) {
        logger.warn(`work item ${issue.key} has ${fieldId}='${value}' but no module of that name — skipping`);
        continue;
      }
      const list = buckets.get(value) ?? [];
      list.push(planeId);
      buckets.set(value, list);
    }
    if (!page.nextPageToken) break;
    nextPageToken = page.nextPageToken;
  }

  let assigned = 0;
  for (const [name, planeIds] of buckets) {
    const mod = moduleByName.get(name)!;
    if (ctx.dryRun) {
      logger.info(`[dry-run] would assign ${planeIds.length} work items to module '${name}' (${mod.id})`);
      continue;
    }
    try {
      await plane.addWorkItemsToModule(planeProjectId, mod.id, planeIds);
      logger.info(`assigned ${planeIds.length} work items to module '${name}'`);
      assigned += planeIds.length;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed to assign work items to module '${name}': ${error}`);
      failed++;
    }
  }

  logger.info(`migrateModules: assigned=${assigned}`);
  return finish(migrated, assigned, failed);
}

function finish(modulesCreated: number, assigned: number, failed: number): MigrationResult {
  logger.info(`migrateModules done: modules_created=${modulesCreated} work_items_assigned=${assigned} failed=${failed}`);
  return {
    ok: failed === 0,
    migrated: modulesCreated,
    skipped: assigned, // re-use the field to surface the assignment count in CLI summary
    failed,
  };
}

/**
 * Pull a comparable string out of a Jira field value. Handles:
 *   - single-select object `{ value: "PKS" }`
 *   - bare string `"PKS"`
 *   - everything else → null (caller treats as "no module")
 */
function extractFieldValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.name === "string") return obj.name;
  }
  return null;
}
