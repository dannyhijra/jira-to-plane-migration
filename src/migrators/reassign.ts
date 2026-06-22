import { logger } from '../lib/logger';
import { withRetry } from '../lib/retry';
import { append, hasMigrated, loadManifest } from '../state/manifest';
import { buildPlaneMemberLookup } from '../mappers/users';
import { parseMigrationPrefix } from '../mappers/description';
import type { MigratorArgs } from './issues';
import type { MigrationResult } from '../state/types';

/**
 * Stage 3 — reassignment.
 *
 * An UPDATER, not a creator. For every work item this project migrated, read
 * the live Plane work item, parse the migration prefix to recover the original
 * Jira assignee email, and — if that email now belongs to a current project
 * member AND the item has no assignee yet — PATCH `assignees`.
 *
 * Never creates work items. Drives off the manifest's `work_item` entries
 * (status="ok", with a plane_id), so it only ever touches things we migrated.
 *
 * Idempotent two ways:
 *   - it skips any live item that already has an assignee (so re-runs are safe
 *     even without --resume);
 *   - a successful reassignment writes an `entity: "reassign"` manifest entry,
 *     and `--resume` skips those. Items that were merely *pending* last run are
 *     recorded as `skipped` (not "ok"), so they get re-evaluated on the next
 *     run as more members join — which is the whole point of running this
 *     periodically.
 *
 * The prefix is intentionally left in the description (audit trail).
 */
export async function migrateReassign(
  args: MigratorArgs
): Promise<MigrationResult> {
  const { ctx, plane, planeProjectId } = args;
  logger.info(
    `migrateReassign start: project=${ctx.jiraProject} dryRun=${ctx.dryRun} resume=${ctx.resume}`
  );

  // Current members of the target Plane project → Map<lowercase_email, user_id>.
  const members = await withRetry(() =>
    plane.listProjectMembers(planeProjectId)
  );
  const memberLookup = buildPlaneMemberLookup(members);
  logger.info(`Resolved ${memberLookup.size} current project members.`);

  // Map every Plane work item we migrated for this project (status="ok", has a
  // plane_id) back to its Jira key. We only ever touch items in this set, so a
  // stray non-migrated Plane item is never reassigned.
  const manifest = await loadManifest();
  const jiraKeyByPlaneId = new Map<string, string>();
  for (const e of manifest.values()) {
    if (
      e.entity === 'work_item' &&
      e.project === ctx.jiraProject &&
      e.status === 'ok' &&
      e.plane_id
    ) {
      jiraKeyByPlaneId.set(e.plane_id, e.jira_key);
    }
  }
  logger.info(`${jiraKeyByPlaneId.size} migrated work items in manifest.`);

  // One bulk paginated sweep of the project's live work items (~100/page),
  // instead of a GET per item — orders of magnitude fewer requests.
  const liveItems = await withRetry(() => plane.listWorkItems(planeProjectId));
  logger.info(`Fetched ${liveItems.length} live work items from Plane.`);

  let migrated = 0; // reassigned this run
  let skipped = 0; // nothing to do (no assignee in prefix / not yet a member / already assigned)
  let failed = 0;
  let processed = 0;

  for (const item of liveItems) {
    const jiraKey = jiraKeyByPlaneId.get(item.id);
    if (!jiraKey) continue; // not one of ours — skip silently

    if (ctx.limit && processed >= ctx.limit) break;
    processed++;

    // Resume: skip items already successfully reassigned. Pending items were
    // recorded as "skipped", so hasMigrated (status==="ok" only) returns false
    // for them and they are correctly re-checked.
    if (ctx.resume && (await hasMigrated('reassign', jiraKey))) {
      continue;
    }

    try {
      // Already assigned (by an earlier reassign run, or originally) → leave it.
      if (item.assignees && item.assignees.length > 0) {
        skipped++;
        continue;
      }

      const parsed = parseMigrationPrefix(item.description_html ?? '');
      const email = parsed?.assigneeEmail ?? null;

      if (!email) {
        // No original assignee captured — nothing to reassign, ever.
        skipped++;
        continue;
      }

      const userId = memberLookup.get(email);
      if (!userId) {
        // Original assignee hasn't joined Plane yet. Record as "skipped" (not
        // "ok") so the next run re-checks once they sign up.
        if (!ctx.dryRun) {
          await append({
            entity: 'reassign',
            project: ctx.jiraProject,
            jira_key: jiraKey,
            plane_id: item.id,
            status: 'skipped',
            at: new Date().toISOString(),
            notes: `pending: ${email} not yet a project member`
          });
        }
        skipped++;
        continue;
      }

      if (ctx.dryRun) {
        logger.info(
          `[dry-run] would reassign ${jiraKey} (${item.id}) → ${email} (${userId})`
        );
        migrated++;
        continue;
      }

      await withRetry(() =>
        plane.updateWorkItem(planeProjectId, item.id, {
          assignees: [userId]
        })
      );

      await append({
        entity: 'reassign',
        project: ctx.jiraProject,
        jira_key: jiraKey,
        plane_id: item.id,
        status: 'ok',
        at: new Date().toISOString(),
        notes: `resolved: ${email} → ${userId}`
      });
      logger.info(`reassigned ${jiraKey} → ${email}`);
      migrated++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed: ${jiraKey}: ${error}`);
      if (!ctx.dryRun) {
        await append({
          entity: 'reassign',
          project: ctx.jiraProject,
          jira_key: jiraKey,
          plane_id: item.id,
          status: 'failed',
          at: new Date().toISOString(),
          error: error.slice(0, 500)
        });
      }
      failed++;
    }
  }

  logger.info(
    `migrateReassign done: reassigned=${migrated} skipped=${skipped} failed=${failed}`
  );
  return { ok: failed === 0, migrated, skipped, failed };
}
