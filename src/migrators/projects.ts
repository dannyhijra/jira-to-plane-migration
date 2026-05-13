import { logger } from "../lib/logger";
import { JiraClient } from "../clients/jira";
import { PlaneClient, type PlaneProject } from "../clients/plane";
import type { ProjectConfig } from "../lib/config";
import type { MigrationContext, MigrationResult } from "../state/types";
import { migrateIssues } from "./issues";
import { migrateComments } from "./comments";
import { migrateSprints } from "./sprints";
import { migrateEpics } from "./epics";
import { migrateAttachments } from "./attachments";
import { migrateLinks } from "./links";

export async function runMigration(ctx: MigrationContext): Promise<MigrationResult> {
  const jira = new JiraClient(ctx.config);
  const plane = new PlaneClient(ctx.config);
  const projectCfg = ctx.config.projects[ctx.jiraProject];

  if (!projectCfg) {
    logger.error(`No config for project '${ctx.jiraProject}' in config/projects.yaml`);
    return { ok: false, migrated: 0, skipped: 0, failed: 1, notes: "missing project config" };
  }

  const entities = ctx.only ? [ctx.only] : projectCfg.migrate_entities;
  logger.info(`Migrating entities: ${entities.join(", ")}`);

  const planeProjectId = await ensurePlaneProject(plane, projectCfg, ctx.dryRun);
  if (!planeProjectId) {
    return { ok: false, migrated: 0, skipped: 0, failed: 1, notes: "plane project unresolved" };
  }

  const results: MigrationResult[] = [];
  if (entities.includes("issues")) results.push(await migrateIssues({ ctx, jira, plane, planeProjectId }));
  if (entities.includes("comments")) results.push(await migrateComments({ ctx, jira, plane, planeProjectId }));
  if (entities.includes("sprints")) results.push(await migrateSprints({ ctx, jira, plane, planeProjectId }));
  if (entities.includes("epics")) results.push(await migrateEpics({ ctx, jira, plane, planeProjectId }));
  if (entities.includes("attachments")) results.push(await migrateAttachments({ ctx, jira, plane, planeProjectId }));
  if (entities.includes("links")) results.push(await migrateLinks({ ctx, jira, plane, planeProjectId }));

  const total = results.reduce(
    (acc, r) => ({
      ok: acc.ok && r.ok,
      migrated: acc.migrated + r.migrated,
      skipped: acc.skipped + r.skipped,
      failed: acc.failed + r.failed,
    }),
    { ok: true, migrated: 0, skipped: 0, failed: 0 },
  );

  logger.info(`Done. migrated=${total.migrated} skipped=${total.skipped} failed=${total.failed}`);
  return total;
}

/**
 * Find or create the Plane project for this Jira project, then ensure the
 * configured states and labels exist. Returns the Plane project id, or null
 * if the project is missing and `create_if_missing` is false.
 */
async function ensurePlaneProject(
  plane: PlaneClient,
  cfg: ProjectConfig,
  dryRun: boolean,
): Promise<string | null> {
  const existing = await findProjectByIdentifier(plane, cfg.plane_project_identifier);

  let projectId: string;
  if (existing) {
    logger.info(`Plane project exists: ${existing.identifier} (${existing.id})`);
    projectId = existing.id;
  } else if (!cfg.create_if_missing) {
    logger.error(`Plane project '${cfg.plane_project_identifier}' missing and create_if_missing=false`);
    return null;
  } else if (dryRun) {
    logger.info(`[dry-run] would create Plane project: ${cfg.plane_project_identifier} (${cfg.plane_project_name})`);
    return "dry-run-project-id";
  } else {
    const created = await plane.createProject({
      name: cfg.plane_project_name,
      identifier: cfg.plane_project_identifier,
    });
    logger.info(`Created Plane project: ${created.identifier} (${created.id})`);
    projectId = created.id;
  }

  await ensureStates(plane, projectId, cfg, dryRun);
  await ensureLabels(plane, projectId, cfg, dryRun);
  // Custom work-item properties intentionally deferred — see mappers/description.ts.

  return projectId;
}

async function findProjectByIdentifier(plane: PlaneClient, identifier: string): Promise<PlaneProject | undefined> {
  const all = await plane.listProjects();
  return all.find((p) => p.identifier === identifier);
}

async function ensureStates(
  plane: PlaneClient,
  projectId: string,
  cfg: ProjectConfig,
  dryRun: boolean,
): Promise<void> {
  if (!cfg.state_seed || cfg.state_seed.length === 0) return;
  if (dryRun) {
    for (const seed of cfg.state_seed) {
      logger.info(`[dry-run] would ensure state: ${seed.name} (${seed.group})`);
    }
    return;
  }
  const existing = await plane.listStates(projectId);
  const existingNames = new Set(existing.map((s) => s.name));
  let seq = 15000;
  for (const seed of cfg.state_seed) {
    seq += 10000;
    if (existingNames.has(seed.name)) {
      logger.info(`state exists: ${seed.name}`);
      continue;
    }
    await plane.createState(projectId, {
      name: seed.name,
      group: seed.group,
      sequence: seq,
      default: seed.default,
    });
    logger.info(`created state: ${seed.name} (${seed.group})`);
  }
}

async function ensureLabels(
  plane: PlaneClient,
  projectId: string,
  cfg: ProjectConfig,
  dryRun: boolean,
): Promise<void> {
  if (!cfg.label_seed || cfg.label_seed.length === 0) return;
  if (dryRun) {
    for (const name of cfg.label_seed) logger.info(`[dry-run] would ensure label: ${name}`);
    return;
  }
  const existing = await plane.listLabels(projectId);
  const existingNames = new Set(existing.map((l) => l.name));
  for (const name of cfg.label_seed) {
    if (existingNames.has(name)) {
      logger.info(`label exists: ${name}`);
      continue;
    }
    await plane.createLabel(projectId, { name });
    logger.info(`created label: ${name}`);
  }
}
