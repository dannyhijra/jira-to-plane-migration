import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import { logger } from "../lib/logger";

/**
 * Migrate Jira issue attachments to Plane.
 *
 * Notes:
 * - This is the slowest and most failure-prone step. Expect partial failures and resume.
 * - Stream the download from Jira and pipe to Plane's upload endpoint to avoid buffering large files.
 * - Rewrite attachment references in issue descriptions/comments if they use Jira's internal URLs.
 */
export async function migrateAttachments(args: MigratorArgs): Promise<MigrationResult> {
  logger.info(`migrateAttachments: not implemented yet (project=${args.ctx.jiraProject})`);
  return { ok: true, migrated: 0, skipped: 0, failed: 0, notes: "stub" };
}
