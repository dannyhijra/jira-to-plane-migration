import type { JiraClient } from "../clients/jira";
import type { PlaneClient } from "../clients/plane";
import type { MigrationContext, MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

export interface MigratorArgs {
  ctx: MigrationContext;
  jira: JiraClient;
  plane: PlaneClient;
  planeProjectId: string;
}

/**
 * Migrate Jira issues to Plane work items.
 *
 * Implementation outline:
 * 1. JQL: `project = <key> ORDER BY created ASC`
 * 2. For each page (use src/lib/paginate.ts):
 *    a. For each issue: skip if hasMigrated("work_item", key) and ctx.resume
 *    b. Map fields via src/mappers/* (status, priority, labels, custom fields, assignee)
 *    c. If !ctx.dryRun, call plane.createWorkItem(planeProjectId, payload)
 *    d. append({ entity: "work_item", jira_key, plane_id, status, ... }) to manifest
 * 3. Honor ctx.limit and ctx.batch
 */
export async function migrateIssues(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateIssues: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
