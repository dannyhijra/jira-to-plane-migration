import { logger } from "../lib/logger";
import type { Config } from "../lib/config";

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface SyncSummary {
  project: string;
  issues_created: number;
  issues_updated: number;
  comments_created: number;
  attachments_created: number;
  failed: number;
  duration_ms: number;
  status: "ok" | "partial" | "error";
}

export function formatSyncMessage(s: SyncSummary, dryRun: boolean): string {
  const icon = statusIcon(s.status);
  const dryTag = dryRun ? " (dry-run)" : "";
  const head = `${icon} *Plane sync · ${s.project}* — ${s.status}${dryTag}`;
  if (s.status === "error") {
    return `${head}\n_Sync did not start (see logs)._`;
  }
  const stats =
    `issues +${s.issues_created}/~${s.issues_updated} · ` +
    `comments +${s.comments_created} · ` +
    `attachments +${s.attachments_created} · ` +
    `failed ${s.failed} · ${Math.round(s.duration_ms / 1000)}s`;
  return `${head}\n${stats}`;
}

/** Format the multi-project roll-up (still printed to stdout at the end of a run). */
export function formatSummary(summaries: SyncSummary[]): string {
  const lines: string[] = ["Jira → Plane sync summary:"];
  for (const s of summaries) {
    lines.push(
      `• ${s.project} [${s.status}] — issues +${s.issues_created}/~${s.issues_updated}, ` +
        `comments +${s.comments_created}, attachments +${s.attachments_created}, ` +
        `failed ${s.failed} (${Math.round(s.duration_ms / 1000)}s)`,
    );
  }
  return lines.join("\n");
}

// ─── Bulk migration (`bun run migrate run`) ─────────────────────────────────

export interface RunSummary {
  project: string;
  entity?: string;
  migrated: number;
  skipped: number;
  failed: number;
  duration_ms: number;
  status: "ok" | "partial" | "error";
  dryRun: boolean;
}

export function formatRunMessage(s: RunSummary): string {
  const icon = statusIcon(s.status);
  const dryTag = s.dryRun ? " (dry-run)" : "";
  const scope = s.entity ? `${s.project} · ${s.entity}` : s.project;
  const head = `${icon} *Plane migration · ${scope}* — ${s.status}${dryTag}`;
  if (s.status === "error") {
    return `${head}\n_Migration did not run cleanly (see logs)._`;
  }
  const stats =
    `migrated ${s.migrated} · skipped ${s.skipped} · failed ${s.failed} · ` +
    `${Math.round(s.duration_ms / 1000)}s`;
  return `${head}\n${stats}`;
}

// ─── Transport ───────────────────────────────────────────────────────────────

function statusIcon(status: "ok" | "partial" | "error"): string {
  if (status === "ok") return "✅";
  if (status === "partial") return "⚠️";
  return "❌";
}

/**
 * Post one message to the configured webhook (Google Chat or Slack). Always
 * mirrors to stdout. Webhook failures never propagate — they're logged and
 * swallowed so a flaky notification channel can't break a migration.
 */
export async function postMessage(text: string, config: Config): Promise<void> {
  // Always emit to stdout (manual runs see this in the terminal).
  // eslint-disable-next-line no-console
  console.log("\n" + text + "\n");

  const url = config.sync.notifyWebhookUrl;
  if (!url) return;

  try {
    // {"text": "..."} works for both Google Chat and Slack incoming webhooks.
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      logger.warn(`Notification webhook returned ${res.status}`);
    }
  } catch (err) {
    // Never fail a migration because notification failed.
    logger.warn("Notification webhook error:", err);
  }
}

/** Convenience: send one per-project sync message. */
export async function notifySync(
  summary: SyncSummary,
  config: Config,
  dryRun: boolean,
): Promise<void> {
  await postMessage(formatSyncMessage(summary, dryRun), config);
}

/** Convenience: send one per-project bulk-migration message. */
export async function notifyRun(summary: RunSummary, config: Config): Promise<void> {
  await postMessage(formatRunMessage(summary), config);
}
