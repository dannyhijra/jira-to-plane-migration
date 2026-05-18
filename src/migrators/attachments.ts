import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import type { JiraAttachment } from "../clients/jira";
import { PlaneAttachmentStorageError } from "../clients/plane";
import { logger } from "../lib/logger";
import { append, hasMigrated, loadManifest } from "../state/manifest";

/**
 * Migrate Jira issue attachments to Plane.
 *
 * Two write modes, chosen per-attachment based on what works at runtime:
 *  1. **upload**  — real file transfer via Plane's POST /issue-attachments/.
 *  2. **placeholder** — when upload returns 5xx (storage backend down on this
 *     Plane instance), post a comment on the work item with filename, size,
 *     mime type, original Jira download URL, and original uploader. The data
 *     is preserved; users can still retrieve the file via Jira.
 *
 * The migrator switches into "placeholder-only" mode for the remainder of the
 * run after `PLACEHOLDER_TRIP_THRESHOLD` consecutive storage errors, to avoid
 * downloading + retrying every file when storage is clearly misconfigured.
 *
 * Manifest key: `<JIRA_ISSUE_KEY>#attachment#<JIRA_ATTACHMENT_ID>`
 *   `notes` records the mode (`uploaded` | `placeholder`).
 */
const PLACEHOLDER_TRIP_THRESHOLD = 3;

export async function migrateAttachments(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  logger.info(`migrateAttachments start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`);

  const manifest = await loadManifest();
  const workItems = [...manifest.values()].filter(
    (e) => e.entity === "work_item" && e.project === ctx.jiraProject && e.status === "ok" && e.plane_id,
  );
  logger.info(`migrateAttachments: scanning ${workItems.length} work items for attachments`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  let placeholderOnly = false;
  let consecutiveStorageErrors = 0;

  for (const wi of workItems) {
    if (ctx.limit && processed >= ctx.limit) break;

    let attachments: JiraAttachment[];
    try {
      attachments = await jira.listAttachments(wi.jira_key);
    } catch (err) {
      logger.warn(`listAttachments failed for ${wi.jira_key}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    if (attachments.length === 0) continue;

    for (const a of attachments) {
      if (ctx.limit && processed >= ctx.limit) break;
      processed++;

      const key = `${wi.jira_key}#attachment#${a.id}`;
      if (ctx.resume && (await hasMigrated("attachment", key))) continue;

      try {
        if (ctx.dryRun) {
          logger.info(
            `[dry-run] ${key} → ${a.filename} (${a.size}B ${a.mimeType}) ` +
            `target=${placeholderOnly ? "placeholder" : "upload (with placeholder fallback)"}`,
          );
          skipped++;
          continue;
        }

        let mode: "uploaded" | "placeholder" = "placeholder";
        let planeId: string | undefined;

        if (!placeholderOnly) {
          try {
            const { blob } = await jira.downloadAttachment(a.content);
            const uploaded = await plane.uploadAttachment(
              planeProjectId,
              wi.plane_id!,
              blob,
              a.filename,
              a.mimeType,
            );
            planeId = uploaded.id;
            mode = "uploaded";
            consecutiveStorageErrors = 0;
          } catch (err) {
            if (err instanceof PlaneAttachmentStorageError) {
              logger.warn(
                `attachment upload failed for ${key}: ${err.message.slice(0, 200)} — falling back to placeholder`,
              );
              // Only count toward trip threshold when the backend itself is
              // down — per-file issues (413 file too large) shouldn't cause
              // the migrator to give up on subsequent attachments.
              if (err.backendDown) {
                consecutiveStorageErrors++;
                if (consecutiveStorageErrors >= PLACEHOLDER_TRIP_THRESHOLD) {
                  placeholderOnly = true;
                  logger.warn(
                    `attachment storage tripped ${PLACEHOLDER_TRIP_THRESHOLD}× — switching to placeholder-only mode for remainder of run`,
                  );
                }
              }
            } else {
              throw err;
            }
          }
        }

        if (mode === "placeholder") {
          const placeholder = await plane.addComment(planeProjectId, wi.plane_id!, {
            comment_html: renderPlaceholderHtml(a, wi.jira_key),
          });
          planeId = placeholder.id;
        }

        await append({
          entity: "attachment",
          project: ctx.jiraProject,
          jira_key: key,
          plane_id: planeId,
          status: "ok",
          at: new Date().toISOString(),
          notes: mode,
        });
        migrated++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn(`failed: ${key}: ${error}`);
        if (!ctx.dryRun) {
          await append({
            entity: "attachment",
            project: ctx.jiraProject,
            jira_key: key,
            status: "failed",
            at: new Date().toISOString(),
            error: error.slice(0, 500),
          });
        }
        failed++;
      }
    }
  }

  logger.info(
    `migrateAttachments done: migrated=${migrated} skipped=${skipped} failed=${failed}` +
    (placeholderOnly ? " (placeholder-only mode was active)" : ""),
  );
  return { ok: failed === 0, migrated, skipped, failed };
}

/**
 * Render a placeholder comment body for an attachment whose file could not be
 * transferred. Format mirrors the migration prefix idiom — machine-parseable
 * on the `Migrated attachment from Jira` literal.
 */
function renderPlaceholderHtml(a: JiraAttachment, jiraKey: string): string {
  const date = (a.created ?? "").slice(0, 10);
  const uploader = a.author?.emailAddress
    ? `\`${a.author.emailAddress}\``
    : a.author?.displayName
    ? `\`${a.author.displayName}\``
    : "`unknown`";
  const sizeKb = (a.size / 1024).toFixed(1);
  const lines = [
    `> **Migrated attachment from Jira ${jiraKey}** — original file not transferred (Plane storage unavailable at migration time).`,
    "",
    `- **Filename:** ${a.filename}`,
    `- **Size:** ${sizeKb} KB (${a.mimeType})`,
    `- **Uploaded by:** ${uploader} on ${date}`,
    `- **Original (Jira):** <${a.content}>`,
  ];
  const md = lines.join("\n");
  const safe = md.replace(/<(\/?[a-zA-Z][^>]*)>/g, "&lt;$1&gt;");
  return `<p>${safe}</p>`;
}
