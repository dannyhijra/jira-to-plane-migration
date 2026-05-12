import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

/**
 * Migrate Jira issue links to Plane relations.
 *
 * Run as a SECOND PASS after all issues are migrated, since both sides of a link
 * must already exist in Plane.
 *
 * Jira link types → Plane relation types: blocks, is blocked by, relates to, duplicates, etc.
 */
export async function migrateLinks(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateLinks: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
