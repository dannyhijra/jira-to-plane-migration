import { logger } from '../lib/logger';
import type { Config } from '../lib/config';

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface SyncSummary {
  project: string;
  /** Human-readable Plane project name (from config). */
  projectName?: string;
  /** Plane project UUID — present once resolution succeeds. Used for deep links. */
  planeProjectId?: string;
  issues_created: number;
  issues_updated: number;
  comments_created: number;
  attachments_created: number;
  failed: number;
  duration_ms: number;
  status: 'ok' | 'partial' | 'error';
  /** Up to MAX_HIGHLIGHT_KEYS Jira keys created this run; rest collapse to "+N more". */
  created_keys?: string[];
  /** Up to MAX_HIGHLIGHT_KEYS Jira keys updated this run; rest collapse to "+N more". */
  updated_keys?: string[];
  /** Total counts (>= created_keys.length / updated_keys.length) for the "+N more" rendering. */
  created_total?: number;
  updated_total?: number;
}

const MAX_HIGHLIGHT_KEYS = 5;

export function formatSyncMessage(
  s: SyncSummary,
  dryRun: boolean,
  config: Config
): string {
  const icon = statusIcon(s.status);
  const dryTag = dryRun ? ' (dry-run)' : '';
  const head = `${icon} *Plane sync · ${renderProjectHeader(s, config)}* — ${s.status}${dryTag}`;
  if (s.status === 'error') {
    return `${head}\n_Sync did not start (see logs)._`;
  }
  const stats =
    `issues +${s.issues_created}/~${s.issues_updated} · ` +
    `comments +${s.comments_created} · ` +
    `attachments +${s.attachments_created} · ` +
    `failed ${s.failed} · ${Math.round(s.duration_ms / 1000)}s`;

  const highlights = renderHighlights(s);
  return highlights ? `${head}\n${stats}\n${highlights}` : `${head}\n${stats}`;
}

/**
 * Renders the project portion of the header: `KEY (Name)` or just `KEY`,
 * optionally wrapped in a Google Chat / Slack hyperlink to the Plane project
 * board when both PLANE_WEBAPP_URL and planeProjectId are available.
 *
 * Decision: link target is the Plane PROJECT (board view), not Jira — readers
 * of these notifications care about what changed in Plane.
 */
function renderProjectHeader(s: SyncSummary, config: Config): string {
  const label = s.projectName ? `${s.project} (${s.projectName})` : s.project;
  const url = planeProjectUrl(s.planeProjectId, config);
  return url ? `<${url}|${label}>` : label;
}

function renderHighlights(s: SyncSummary): string | null {
  const parts: string[] = [];
  if (s.created_keys && s.created_keys.length > 0) {
    parts.push(`created: ${formatKeyList(s.created_keys, s.created_total)}`);
  }
  if (s.updated_keys && s.updated_keys.length > 0) {
    parts.push(`updated: ${formatKeyList(s.updated_keys, s.updated_total)}`);
  }
  return parts.length === 0 ? null : parts.join(' · ');
}

function formatKeyList(keys: string[], total?: number): string {
  const shown = keys.join(', ');
  const all = total ?? keys.length;
  const extra = all - keys.length;
  return extra > 0 ? `${shown}, +${extra} more` : shown;
}

function planeProjectUrl(
  planeProjectId: string | undefined,
  config: Config
): string | null {
  if (!planeProjectId) return null;
  const base = config.plane.baseUrl.replace(/\/$/, '');
  return `${base}/${config.plane.workspaceSlug}/projects/${planeProjectId}/issues`;
}

/** Format the multi-project roll-up (still printed to stdout at the end of a run). */
export function formatSummary(summaries: SyncSummary[]): string {
  const lines: string[] = ['Jira → Plane sync summary:'];
  for (const s of summaries) {
    lines.push(
      `• ${s.project} [${s.status}] — issues +${s.issues_created}/~${s.issues_updated}, ` +
        `comments +${s.comments_created}, attachments +${s.attachments_created}, ` +
        `failed ${s.failed} (${Math.round(s.duration_ms / 1000)}s)`
    );
  }
  return lines.join('\n');
}

/**
 * Format the end-of-run roll-up message for chat. Distinct from formatSummary
 * (which is the stdout-only diagnostic dump): this one is meant to look good
 * in a Google Chat / Slack thread.
 */
export function formatRollupMessage(
  summaries: SyncSummary[],
  dryRun: boolean
): string {
  const totals = summaries.reduce(
    (acc, s) => ({
      created: acc.created + s.issues_created,
      updated: acc.updated + s.issues_updated,
      comments: acc.comments + s.comments_created,
      attachments: acc.attachments + s.attachments_created,
      failed: acc.failed + s.failed,
      duration: acc.duration + s.duration_ms
    }),
    {
      created: 0,
      updated: 0,
      comments: 0,
      attachments: 0,
      failed: 0,
      duration: 0
    }
  );
  const overall: SyncSummary['status'] = summaries.some(
    (s) => s.status === 'error'
  )
    ? 'error'
    : summaries.some((s) => s.status === 'partial' || s.failed > 0)
      ? 'partial'
      : 'ok';
  const icon = statusIcon(overall);
  const dryTag = dryRun ? ' (dry-run)' : '';
  const projectCount = summaries.length;
  const activeCount = summaries.filter(
    (s) =>
      s.issues_created +
        s.issues_updated +
        s.comments_created +
        s.attachments_created >
      0
  ).length;

  return [
    `${icon} *Plane sync · roll-up* — ${overall}${dryTag}`,
    `${projectCount} projects · ${activeCount} with changes · ${Math.round(totals.duration / 1000)}s total`,
    `issues +${totals.created}/~${totals.updated} · comments +${totals.comments} · attachments +${totals.attachments} · failed ${totals.failed}`
  ].join('\n');
}

// ─── Bulk migration (`bun run migrate run`) ─────────────────────────────────

export interface RunSummary {
  project: string;
  entity?: string;
  migrated: number;
  skipped: number;
  failed: number;
  duration_ms: number;
  status: 'ok' | 'partial' | 'error';
  dryRun: boolean;
}

export function formatRunMessage(s: RunSummary): string {
  const icon = statusIcon(s.status);
  const dryTag = s.dryRun ? ' (dry-run)' : '';
  const scope = s.entity ? `${s.project} · ${s.entity}` : s.project;
  const head = `${icon} *Plane migration · ${scope}* — ${s.status}${dryTag}`;
  if (s.status === 'error') {
    return `${head}\n_Migration did not run cleanly (see logs)._`;
  }
  const stats =
    `migrated ${s.migrated} · skipped ${s.skipped} · failed ${s.failed} · ` +
    `${Math.round(s.duration_ms / 1000)}s`;
  return `${head}\n${stats}`;
}

// ─── Transport ───────────────────────────────────────────────────────────────

function statusIcon(status: 'ok' | 'partial' | 'error'): string {
  if (status === 'ok') return '✅';
  if (status === 'partial') return '⚠️';
  return '❌';
}

/**
 * Post one message to the configured webhook (Google Chat or Slack). Always
 * mirrors to stdout. Webhook failures never propagate — they're logged and
 * swallowed so a flaky notification channel can't break a migration.
 */
export async function postMessage(
  text: string,
  config: Config,
  dryRun: boolean
): Promise<void> {
  // Always emit to stdout (manual runs see this in the terminal).
  // eslint-disable-next-line no-console
  console.log('\n' + text + '\n');

  const url = config.sync.notifyWebhookUrl;
  if (!url) return;

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log('[dry-run: webhook suppressed]');
    return;
  }

  try {
    // {"text": "..."} works for both Google Chat and Slack incoming webhooks.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) {
      logger.warn(`Notification webhook returned ${res.status}`);
    }
  } catch (err) {
    // Never fail a migration because notification failed.
    logger.warn('Notification webhook error:', err);
  }
}

/** Convenience: send one per-project sync message. */
export async function notifySync(
  summary: SyncSummary,
  config: Config,
  dryRun: boolean
): Promise<void> {
  await postMessage(formatSyncMessage(summary, dryRun, config), config, dryRun);
}

/** Convenience: send the end-of-run roll-up message. */
export async function notifyRollup(
  summaries: SyncSummary[],
  config: Config,
  dryRun: boolean
): Promise<void> {
  if (summaries.length === 0) return;
  await postMessage(formatRollupMessage(summaries, dryRun), config, dryRun);
}

/** Convenience: send one per-project bulk-migration message. */
export async function notifyRun(
  summary: RunSummary,
  config: Config
): Promise<void> {
  await postMessage(formatRunMessage(summary), config, false);
}
