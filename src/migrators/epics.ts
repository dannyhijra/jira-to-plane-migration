import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import type { PlaneModule } from "../clients/plane";
import { logger } from "../lib/logger";
import { append, hasMigrated, loadManifest } from "../state/manifest";

/**
 * Migrate Jira epics to Plane modules (hierarchy-driven).
 *
 * Jira epics are issues with `issuetype = Epic`; each becomes one Plane module
 * in the same project, named after the epic summary. This is distinct from the
 * field-driven `modules` migrator (which buckets by a custom-field value) —
 * here child issues are linked by the next-gen `parent` field.
 *
 * Two phases:
 *   1. **Seed**: query the epics, ensure a Plane module per epic. Idempotent —
 *      reuses an existing module of the same name; records one manifest entry
 *      per epic, key `<JIRA_PROJECT>#epic#<EPIC_KEY>`, entity `module`.
 *   2. **Assign**: scan every issue's `parent` field, bucket child work-item
 *      plane_ids (from the work_item manifest) by their epic's module, then POST
 *      one bulk add per module. Plane treats re-adds as no-ops, so no per-
 *      assignment manifest bookkeeping is needed.
 *
 * Run AFTER issues — the assignment phase needs plane_ids from the work_item
 * manifest. Epics with no migrated children still get their module created.
 */
export async function migrateEpics(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  const projectCfg = ctx.config.projects[ctx.jiraProject];
  if (!projectCfg) {
    return { ok: false, migrated: 0, skipped: 0, failed: 1, notes: "missing project config" };
  }
  logger.info(`migrateEpics start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`);

  const isDryRunNoProject = ctx.dryRun && planeProjectId === "dry-run-project-id";

  // --- Fetch all Jira epics (summary only) ---
  const epics: { key: string; summary: string }[] = [];
  let nextPageToken: string | undefined;
  while (true) {
    const page = await jira.searchIssues({
      jql: `project = ${ctx.jiraProject} AND issuetype = Epic ORDER BY created ASC`,
      fields: ["summary"],
      pageSize: ctx.batch,
      nextPageToken,
    });
    for (const e of page.issues) epics.push({ key: e.key, summary: e.fields.summary });
    if (!page.nextPageToken) break;
    nextPageToken = page.nextPageToken;
  }
  logger.info(`migrateEpics: ${epics.length} epics found`);

  // --- Phase 1: ensure a module per epic ---
  const existing = isDryRunNoProject ? [] : await plane.listModules(planeProjectId);
  const moduleByName = new Map<string, PlaneModule>(existing.map((m) => [m.name, m]));
  const moduleByEpic = new Map<string, string>(); // epicKey -> moduleId (for phase 2)

  let modulesCreated = 0;
  let failed = 0;
  let processed = 0;

  for (const epic of epics) {
    if (ctx.limit && processed >= ctx.limit) break;
    processed++;
    const manifestKey = `${ctx.jiraProject}#epic#${epic.key}`;

    // Reuse an existing Plane module of the same name (covers prior runs and
    // hand-created modules). Records the mapping + a manifest entry once.
    const hit = moduleByName.get(epic.summary);
    if (hit) {
      moduleByEpic.set(epic.key, hit.id);
      logger.info(`module exists: '${epic.summary}' (${hit.id}) ← ${epic.key}`);
      if (!ctx.dryRun && !(await hasMigrated("module", manifestKey))) {
        await append({
          entity: "module",
          project: ctx.jiraProject,
          jira_key: manifestKey,
          plane_id: hit.id,
          status: "ok",
          at: new Date().toISOString(),
          notes: "existing",
        });
      }
      continue;
    }

    // Resume: epic already done in a prior run but its module isn't in the
    // current listing (shouldn't happen, but stay safe) — skip silently.
    if (ctx.resume && (await hasMigrated("module", manifestKey))) continue;

    try {
      if (ctx.dryRun) {
        logger.info(`[dry-run] would create module: '${epic.summary}' ← ${epic.key}`);
        moduleByEpic.set(epic.key, `dry-run-${epic.key}`);
        continue;
      }
      const created = await plane.createModule(planeProjectId, { name: epic.summary });
      moduleByName.set(epic.summary, created);
      moduleByEpic.set(epic.key, created.id);
      await append({
        entity: "module",
        project: ctx.jiraProject,
        jira_key: manifestKey,
        plane_id: created.id,
        status: "ok",
        at: new Date().toISOString(),
        notes: "created",
      });
      logger.info(`created module: '${epic.summary}' (${created.id}) ← ${epic.key}`);
      modulesCreated++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed to create module for ${epic.key}: ${error}`);
      if (!ctx.dryRun) {
        await append({
          entity: "module",
          project: ctx.jiraProject,
          jira_key: manifestKey,
          status: "failed",
          at: new Date().toISOString(),
          error: error.slice(0, 500),
        });
      }
      failed++;
    }
  }

  // --- Phase 2: assign child work items to their epic's module ---
  if (moduleByEpic.size === 0) {
    logger.info(`migrateEpics: no modules available — skipping assignment phase`);
    return done(modulesCreated, 0, failed);
  }

  // jira_key -> plane_id for migrated work items in this project.
  const manifest = await loadManifest();
  const jiraToPlane = new Map<string, string>();
  for (const e of manifest.values()) {
    if (e.entity === "work_item" && e.project === ctx.jiraProject && e.status === "ok" && e.plane_id) {
      jiraToPlane.set(e.jira_key, e.plane_id);
    }
  }
  if (jiraToPlane.size === 0) {
    logger.warn(`migrateEpics: no migrated work_item entries for ${ctx.jiraProject} — run issues first; skipping assignment phase`);
    return done(modulesCreated, 0, failed);
  }
  logger.info(`migrateEpics: ${jiraToPlane.size} work items eligible for module assignment`);

  // Scan every issue's parent field; bucket plane_ids by target module.
  const buckets = new Map<string, string[]>(); // moduleId -> [plane_id]
  nextPageToken = undefined;
  while (true) {
    const page = await jira.searchIssues({
      jql: `project = ${ctx.jiraProject} ORDER BY created ASC`,
      fields: ["parent"],
      pageSize: ctx.batch,
      nextPageToken,
    });
    for (const issue of page.issues) {
      const parent = issue.fields.parent as { key?: string } | null | undefined;
      const parentKey = parent?.key;
      if (!parentKey) continue;
      const moduleId = moduleByEpic.get(parentKey);
      if (!moduleId) continue; // parent epic not in scope (e.g. limited pilot)
      const planeId = jiraToPlane.get(issue.key);
      if (!planeId) continue; // child not migrated yet — picked up on a later run
      const list = buckets.get(moduleId) ?? [];
      list.push(planeId);
      buckets.set(moduleId, list);
    }
    if (!page.nextPageToken) break;
    nextPageToken = page.nextPageToken;
  }

  let assigned = 0;
  for (const [moduleId, planeIds] of buckets) {
    if (ctx.dryRun) {
      logger.info(`[dry-run] would assign ${planeIds.length} work items to module ${moduleId}`);
      continue;
    }
    try {
      await plane.addWorkItemsToModule(planeProjectId, moduleId, planeIds);
      logger.info(`assigned ${planeIds.length} work items to module ${moduleId}`);
      assigned += planeIds.length;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed to assign work items to module ${moduleId}: ${error}`);
      failed++;
    }
  }

  return done(modulesCreated, assigned, failed);
}

/** modules_created surfaces as `migrated`; assignment count rides in `skipped` (matches modules.ts CLI summary). */
function done(modulesCreated: number, assigned: number, failed: number): MigrationResult {
  logger.info(`migrateEpics done: modules_created=${modulesCreated} work_items_assigned=${assigned} failed=${failed}`);
  return { ok: failed === 0, migrated: modulesCreated, skipped: assigned, failed };
}
