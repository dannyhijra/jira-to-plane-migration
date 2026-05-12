import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

/**
 * Migrate Jira comments to Plane comments.
 *
 * Notes:
 * - Run AFTER issues — needs the plane_id from the manifest to know which work item to attach to.
 * - Author mapping: use src/mappers/users.ts; fallback users get a "Originally posted by <email>" prefix.
 * - Timestamps cannot usually be backdated on Plane — surface this loss in the comment body.
 */
export async function migrateComments(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateComments: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
