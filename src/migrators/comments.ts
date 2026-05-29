import type { MigratorArgs } from './issues';
import type { MigrationContext, MigrationResult } from '../state/types';
import type { JiraClient, JiraComment } from '../clients/jira';
import type { PlaneClient } from '../clients/plane';
import { logger } from '../lib/logger';
import { append, getEntry, hasMigrated, loadManifest } from '../state/manifest';
import { adfToMarkdown } from '../lib/adf';

/**
 * Migrate Jira comments to Plane comments.
 *
 * - Runs AFTER issues — looks up plane_id from manifest `work_item` entries.
 * - Author and created_at on Plane are always the API key owner / migration time
 *   (Plane API constraint). Original author + date are preserved in a prefix line.
 * - Manifest key: `<JIRA_ISSUE_KEY>#<COMMENT_ID>` (e.g. `LRP-3#107553`).
 */
export async function migrateComments(
  args: MigratorArgs
): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  logger.info(
    `migrateComments start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`
  );

  const manifest = await loadManifest();
  const workItems = [...manifest.values()].filter(
    (e) =>
      e.entity === 'work_item' &&
      e.project === ctx.jiraProject &&
      e.status === 'ok' &&
      e.plane_id
  );
  logger.info(
    `migrateComments: ${workItems.length} work_item manifest entries to scan for comments`
  );

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const wi of workItems) {
    if (ctx.limit && processed >= ctx.limit) break;

    let comments: JiraComment[];
    try {
      comments = await jira.listComments(wi.jira_key, ctx.batch);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`listComments failed for ${wi.jira_key}: ${error}`);
      continue;
    }

    for (const c of comments) {
      if (ctx.limit && processed >= ctx.limit) break;
      processed++;

      const commentKey = `${wi.jira_key}#${c.id}`;
      if (ctx.resume && (await hasMigrated('comment', commentKey))) continue;

      try {
        const commentHtml = wrapAsHtml(buildCommentBody(c));

        if (ctx.dryRun) {
          logger.info(`[dry-run] ${commentKey} → ${commentHtml.slice(0, 160)}`);
          skipped++;
          continue;
        }

        const created = await plane.addComment(planeProjectId, wi.plane_id!, {
          comment_html: commentHtml
        });
        await append({
          entity: 'comment',
          project: ctx.jiraProject,
          jira_key: commentKey,
          plane_id: created.id,
          status: 'ok',
          at: new Date().toISOString()
        });
        migrated++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn(`failed: ${commentKey}: ${error}`);
        if (!ctx.dryRun) {
          await append({
            entity: 'comment',
            project: ctx.jiraProject,
            jira_key: commentKey,
            status: 'failed',
            at: new Date().toISOString(),
            error: error.slice(0, 500)
          });
        }
        failed++;
      }
    }
  }

  logger.info(
    `migrateComments done: migrated=${migrated} skipped=${skipped} failed=${failed}`
  );
  return { ok: failed === 0, migrated, skipped, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Incremental sync helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncCommentsArgs {
  ctx: MigrationContext;
  jira: JiraClient;
  plane: PlaneClient;
  planeProjectId: string;
  /** The Jira issue key whose comments we should reconcile. */
  jiraKey: string;
  /** Plane work-item UUID for that Jira issue. */
  planeWorkItemId: string;
  /**
   * Backfill mode: re-render and PATCH the bodies of comments already migrated
   * (status=ok), instead of skipping them. Used to repair comment bodies after
   * an adfToMarkdown fix. New comments are still created as usual.
   */
  backfill?: boolean;
}

export interface SyncCommentsResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Reconcile Jira comments on one issue → Plane. New-comments-only:
 *   - For each Jira comment, look up manifest entry keyed by
 *     `<JIRA_ISSUE_KEY>#<COMMENT_ID>`.
 *   - If absent → POST to Plane, append manifest entry, count as created.
 *   - If present → skip (edits to existing comments are ignored per locked policy).
 * Honors `ctx.dryRun`.
 */
export async function syncComments(
  args: SyncCommentsArgs
): Promise<SyncCommentsResult> {
  const {
    ctx,
    jira,
    plane,
    planeProjectId,
    jiraKey,
    planeWorkItemId,
    backfill
  } = args;
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  let comments: JiraComment[];
  try {
    comments = await jira.listComments(jiraKey, ctx.batch);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.warn(`syncComments listComments failed for ${jiraKey}: ${error}`);
    return { created, updated, skipped, failed: failed + 1 };
  }

  for (const c of comments) {
    const commentKey = `${jiraKey}#${c.id}`;
    const existing = await getEntry('comment', commentKey);
    if (existing?.status === 'ok') {
      // Already migrated. Normally skip (new-comments-only locked policy).
      // In backfill mode, re-render the body and PATCH it in place so an
      // adfToMarkdown fix reaches comments that Jira hasn't otherwise changed.
      if (!backfill || !existing.plane_id) {
        skipped++;
        continue;
      }
      try {
        const commentHtml = wrapAsHtml(buildCommentBody(c));
        if (ctx.dryRun) {
          logger.info(
            `[dry-run] would BACKFILL comment ${commentKey} → ${existing.plane_id}`
          );
          // Count the would-do work so the dry-run preview is honest, matching
          // the issue-side counting (no Plane write happens here).
          updated++;
          continue;
        }
        await plane.updateComment(
          planeProjectId,
          planeWorkItemId,
          existing.plane_id,
          {
            comment_html: commentHtml
          }
        );
        logger.info(`backfilled comment ${commentKey} → ${existing.plane_id}`);
        updated++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn(`syncComments backfill failed: ${commentKey}: ${error}`);
        failed++;
      }
      continue;
    }

    try {
      const commentHtml = wrapAsHtml(buildCommentBody(c));

      if (ctx.dryRun) {
        logger.info(`[dry-run] would CREATE comment ${commentKey}`);
        skipped++;
        continue;
      }

      const out = await plane.addComment(planeProjectId, planeWorkItemId, {
        comment_html: commentHtml
      });
      await append({
        entity: 'comment',
        project: ctx.jiraProject,
        jira_key: commentKey,
        plane_id: out.id,
        status: 'ok',
        at: new Date().toISOString(),
        notes: `sync:${jiraKey}`
      });
      created++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`syncComments failed: ${commentKey}: ${error}`);
      if (!ctx.dryRun) {
        await append({
          entity: 'comment',
          project: ctx.jiraProject,
          jira_key: commentKey,
          status: 'failed',
          at: new Date().toISOString(),
          error: error.slice(0, 500),
          notes: `sync:${jiraKey}`
        });
      }
      failed++;
    }
  }

  return { created, updated, skipped, failed };
}

function buildCommentBody(c: JiraComment): string {
  const authorEmail = c.author?.emailAddress ?? null;
  const authorName = c.author?.displayName ?? null;
  const who = authorEmail
    ? `\`${authorEmail}\``
    : authorName
      ? `\`${authorName}\``
      : '`unknown`';
  const date = (c.created ?? '').slice(0, 10);
  const prefix = `> _Originally posted by ${who} on ${date}_`;
  const body = adfToMarkdown(c.body);
  return [prefix, body].filter((s) => s.length > 0).join('\n\n');
}

/**
 * Same HTML wrapping rule as work-item descriptions: wrap in <p>, neutralise
 * raw HTML tags, leave markdown chars (`>`, `_`, `*`, backticks) literal.
 */
function wrapAsHtml(markdown: string): string {
  if (!markdown) return '';
  const safe = markdown.replace(/<(\/?[a-zA-Z][^>]*)>/g, '&lt;$1&gt;');
  return `<p>${safe}</p>`;
}
