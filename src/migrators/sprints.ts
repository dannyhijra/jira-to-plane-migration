import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

/**
 * Migrate Jira sprints to Plane cycles.
 *
 * Notes:
 * - Sprints come from Jira's Agile API. Find the board associated with this project first.
 * - One Plane cycle per Jira sprint. Map start/end dates directly.
 * - After creating cycles, associate work items: requires the issues manifest to be populated.
 */
export async function migrateSprints(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateSprints: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
