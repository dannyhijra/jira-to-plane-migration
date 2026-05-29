import { logger } from '../lib/logger';
import { loadConfig } from '../lib/config';
import { JiraClient } from '../clients/jira';
import { PlaneClient } from '../clients/plane';
import { acquireLock, releaseLock } from './lock';
import { getProjectState, saveProjectState } from './syncState';
import { deltaFrom, streamChangedIssues } from './delta';
import {
  formatSummary,
  notifyRollup,
  notifySync,
  type SyncSummary
} from './notify';

const MAX_HIGHLIGHT_KEYS = 5;
import {
  syncIssue,
  prefetchProjectLookups,
  issueFieldsForProject
} from '../migrators/issues';
import { syncComments } from '../migrators/comments';
import { syncAttachments } from '../migrators/attachments';
import { loadManifest } from '../state/manifest';

export interface SyncOptions {
  /** Optional Jira project key. Omit to sync every project in config. */
  project?: string;
  dryRun: boolean;
  /** ISO override for the first-sync baseline. */
  since?: string;
  batch: number;
  /**
   * Backfill mode: ignore the delta window (pull ALL issues since epoch) and
   * re-render existing comment bodies in place. Use to repair already-migrated
   * descriptions/comments after an adfToMarkdown fix. Does NOT change how
   * last_sync_at is advanced, so subsequent normal syncs are unaffected.
   */
  backfill?: boolean;
  /**
   * Cap on issues processed per project (for canary runs). Counts every issue
   * pulled from the delta stream, including ones that turn out unchanged.
   * Omit for no cap (the normal case).
   */
  limit?: number;
}

/**
 * Exit codes (also documented in the migration-sync skill):
 *   0 — clean
 *   1 — partial (item-level failures; state was still advanced)
 *   2 — config/auth error (run didn't start)
 *   3 — locked (another run is in progress)
 */
export async function runSync(opts: SyncOptions): Promise<number> {
  let config: Awaited<ReturnType<typeof loadConfig>>;
  try {
    config = await loadConfig();
  } catch (err) {
    logger.error('Config/auth error:', err);
    return 2;
  }

  if (!(await acquireLock())) return 3;

  let worstCode = 0;
  const summaries: SyncSummary[] = [];

  try {
    const jira = new JiraClient(config);
    const plane = new PlaneClient(config);

    const projects = opts.project
      ? [opts.project]
      : Object.keys(config.projects);
    if (projects.length === 0) {
      logger.error('No projects configured.');
      return 2;
    }

    for (const project of projects) {
      const projectCfg = config.projects[project];
      if (!projectCfg) {
        logger.error(
          `No config for project '${project}' in config/projects.yaml — skipping`
        );
        const summary = zeroSummary(project, 'error');
        summaries.push(summary);
        await notifySync(summary, config, opts.dryRun);
        worstCode = Math.max(worstCode, 1);
        continue;
      }

      // Saved as the new last_sync_at on success — captured BEFORE any query so
      // next run's overlap window comfortably re-covers mid-run changes.
      const runStartedAt = new Date();
      const t0 = Date.now();

      // Resolve baseline.
      const prior = await getProjectState(project);
      let from: Date;
      if (opts.backfill) {
        // Re-pull everything so every mapped issue's description (and comment
        // bodies) get re-rendered with the current adfToMarkdown.
        from = new Date(0);
        logger.warn(
          `Backfill mode for ${project}: ignoring delta window, re-pulling all issues since epoch.`
        );
      } else if (prior?.last_sync_at) {
        from = deltaFrom(prior.last_sync_at, config.sync.overlapMinutes);
      } else if (opts.since) {
        from = new Date(opts.since);
        if (Number.isNaN(from.getTime())) {
          logger.error(`Invalid --since value: ${opts.since}`);
          const summary = zeroSummary(project, 'error');
          summaries.push(summary);
          await notifySync(summary, config, opts.dryRun);
          worstCode = Math.max(worstCode, 2);
          continue;
        }
      } else {
        from = await earliestManifestAt(project);
        logger.warn(
          `First sync for ${project}; baseline derived from manifest = ${from.toISOString()}. ` +
            `Override with --since if this is too broad.`
        );
      }

      // Resolve target Plane project id + per-project lookups (members, states, labels).
      let planeProjectId: string;
      try {
        planeProjectId = await resolvePlaneProjectId(
          plane,
          projectCfg.plane_project_identifier
        );
      } catch (err) {
        logger.error(`resolvePlaneProjectId failed for ${project}:`, err);
        const summary = zeroSummary(project, 'error');
        summaries.push(summary);
        await notifySync(summary, config, opts.dryRun);
        worstCode = Math.max(worstCode, 2);
        continue;
      }

      const lookups = await prefetchProjectLookups(plane, planeProjectId);
      const fields = issueFieldsForProject({
        config,
        jiraProject: project,
        dryRun: opts.dryRun,
        batch: opts.batch,
        resume: false
      });

      let created = 0;
      let updated = 0;
      let comments = 0;
      let commentsUpdated = 0;
      let attachments = 0;
      let failed = 0;
      const createdKeys: string[] = [];
      const updatedKeys: string[] = [];

      let processed = 0;
      try {
        for await (const issue of streamChangedIssues(
          jira,
          project,
          from,
          config,
          fields,
          opts.batch
        )) {
          if (opts.limit && processed >= opts.limit) {
            logger.info(
              `Reached --limit ${opts.limit} for ${project}; stopping (canary run).`
            );
            break;
          }
          processed++;
          const ctx = {
            config,
            jiraProject: project,
            dryRun: opts.dryRun,
            batch: opts.batch,
            resume: false
          };
          const r = await syncIssue({
            ctx,
            plane,
            planeProjectId,
            lookups,
            issue
          });
          // In dry-run, syncIssue returns "skipped" for the no-write preview.
          // Disambiguate by planeId: present → would UPDATE existing, absent →
          // would CREATE new. This makes the dry-run counts honest (otherwise a
          // backfill that touches every issue reports ~0).
          const effectiveAction =
            r.action === 'skipped'
              ? r.planeId
                ? 'updated'
                : 'created'
              : r.action;

          if (effectiveAction === 'created') {
            created++;
            if (createdKeys.length < MAX_HIGHLIGHT_KEYS)
              createdKeys.push(r.jiraKey);
          } else if (effectiveAction === 'updated') {
            updated++;
            if (updatedKeys.length < MAX_HIGHLIGHT_KEYS)
              updatedKeys.push(r.jiraKey);
          } else if (effectiveAction === 'failed') {
            failed++;
            continue;
          }

          // Reconcile comments + attachments. We do this in dry-run too so the
          // operator sees the planned writes for new comments/files; the
          // sub-functions internally short-circuit writes when dryRun=true.
          const planeId = r.planeId;
          if (!planeId) continue;

          try {
            const cRes = await syncComments({
              ctx,
              jira,
              plane,
              planeProjectId,
              jiraKey: r.jiraKey,
              planeWorkItemId: planeId,
              backfill: opts.backfill
            });
            comments += cRes.created;
            commentsUpdated += cRes.updated;
            failed += cRes.failed;
          } catch (err) {
            logger.warn(`syncComments unexpected error for ${r.jiraKey}:`, err);
            failed++;
          }

          try {
            const aRes = await syncAttachments({
              ctx,
              jira,
              plane,
              planeProjectId,
              jiraKey: r.jiraKey,
              planeWorkItemId: planeId
            });
            attachments += aRes.created;
            failed += aRes.failed;
          } catch (err) {
            logger.warn(
              `syncAttachments unexpected error for ${r.jiraKey}:`,
              err
            );
            failed++;
          }
        }
      } catch (err) {
        // A project-level fetch error (e.g. bad JQL/auth). Record and continue.
        logger.error(`Project ${project} sync error:`, err);
        failed++;
      }

      const status: SyncSummary['status'] = failed > 0 ? 'partial' : 'ok';
      const duration_ms = Date.now() - t0;

      if (opts.backfill) {
        logger.info(
          `Backfill ${project}: ${updated} descriptions re-rendered, ${commentsUpdated} comment bodies updated.`
        );
      }

      // Only advance last_sync_at when NOT dry-run.
      if (!opts.dryRun) {
        await saveProjectState(project, {
          last_sync_at: runStartedAt.toISOString(),
          last_sync_status: status,
          last_run: {
            issues_created: created,
            issues_updated: updated,
            comments_created: comments,
            attachments_created: attachments,
            failed,
            duration_ms,
            delta_from: from.toISOString()
          }
        });
      }

      const summary: SyncSummary = {
        project,
        projectName: projectCfg.plane_project_name,
        planeProjectId,
        issues_created: created,
        issues_updated: updated,
        comments_created: comments,
        attachments_created: attachments,
        failed,
        duration_ms,
        status,
        created_keys: createdKeys.length > 0 ? createdKeys : undefined,
        updated_keys: updatedKeys.length > 0 ? updatedKeys : undefined,
        created_total: created,
        updated_total: updated
      };
      summaries.push(summary);
      await notifySync(summary, config, opts.dryRun);

      if (failed > 0) worstCode = Math.max(worstCode, 1);
    }

    // End-of-run roll-up — both to chat (concise) and stdout (detailed).
    await notifyRollup(summaries, config, opts.dryRun);
    // eslint-disable-next-line no-console
    console.log('\n' + formatSummary(summaries) + '\n');
    return worstCode;
  } catch (err) {
    logger.error('Unexpected sync error:', err);
    try {
      // eslint-disable-next-line no-console
      console.log('\n' + formatSummary(summaries) + '\n');
    } catch {
      /* ignore */
    }
    return Math.max(worstCode, 2);
  } finally {
    await releaseLock();
  }
}

/** Look up the Plane project UUID for a given Plane project identifier (e.g. "ENG"). */
async function resolvePlaneProjectId(
  plane: PlaneClient,
  identifier: string
): Promise<string> {
  const all = await plane.listProjects();
  const hit = all.find((p) => p.identifier === identifier);
  if (!hit)
    throw new Error(`Plane project not found by identifier=${identifier}`);
  return hit.id;
}

/**
 * Earliest `at` across all work_item manifest entries for this Jira project.
 * Used as the first-sync baseline when no prior state + no --since override:
 * guaranteed to be before the original migration finished, so we don't miss
 * anything that changed while migration was in flight or shortly after.
 *
 * Falls back to epoch with a warning when the project has no manifest entries
 * (genuinely fresh — sync will pull everything since 1970, which is fine).
 */
async function earliestManifestAt(project: string): Promise<Date> {
  const manifest = await loadManifest();
  let min: number | null = null;
  for (const e of manifest.values()) {
    if (e.project !== project) continue;
    if (e.entity !== 'work_item') continue;
    if (e.status !== 'ok') continue;
    const t = Date.parse(e.at);
    if (Number.isNaN(t)) continue;
    if (min === null || t < min) min = t;
  }
  if (min === null) {
    logger.warn(
      `earliestManifestAt: no work_item entries for ${project}; defaulting to epoch (1970-01-01).`
    );
    return new Date(0);
  }
  return new Date(min);
}

function zeroSummary(
  project: string,
  status: SyncSummary['status']
): SyncSummary {
  return {
    project,
    issues_created: 0,
    issues_updated: 0,
    comments_created: 0,
    attachments_created: 0,
    failed: 0,
    duration_ms: 0,
    status
  };
}
