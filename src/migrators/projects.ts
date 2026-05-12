import { logger } from "../lib/logger";
import { JiraClient } from "../clients/jira";
import { PlaneClient } from "../clients/plane";
import type { MigrationContext, MigrationResult } from "../state/types";
import { migrateIssues } from "./issues";
import { migrateComments } from "./comments";
import { migrateSprints } from "./sprints";
import { migrateEpics } from "./epics";
import { migrateAttachments } from "./attachments";
import { migrateLinks } from "./links";

/**
 * Top-level entry point: orchestrates per-entity migrators for a single Jira project.
 */
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

  // TODO: ensure Plane project exists (create if create_if_missing), then resolve planeProjectId
  const planeProjectId = "TODO";
  logger.info(`Plane project id: ${planeProjectId} (placeholder)`);

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
