import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

/**
 * Migrate Jira epics to Plane modules.
 *
 * Notes:
 * - Jira epics are issues with issuetype=Epic. Query separately.
 * - Each epic → one Plane module within the same project.
 * - Child issues link via the `Epic Link` custom field (legacy) or parent field (next-gen).
 * - If you want cross-project rollups, consider Plane Initiatives instead — but that's a workspace-level concept.
 */
export async function migrateEpics(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateEpics: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
