import type { JiraClient, JiraIssue } from "../clients/jira";
import type { Config } from "../lib/config";
import { paginate } from "../lib/paginate";
import { logger } from "../lib/logger";

/**
 * Format an instant as a JQL-safe datetime string in the Jira user's timezone.
 * JQL expects "yyyy-MM-dd HH:mm" and interprets it in the requesting user's tz.
 * We therefore render the wall-clock time in JIRA_TIMEZONE.
 */
export function toJqlDateTime(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? "00";
  // en-CA gives yyyy-mm-dd ordering for the date parts
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/**
 * Compute the delta-from instant for a project's sync run.
 * - If lastSyncAt is set → lastSyncAt minus the overlap buffer.
 * - If null (first sync) → caller must supply a baseline (see resolveBaseline).
 */
export function deltaFrom(lastSyncAt: string, overlapMinutes: number): Date {
  return new Date(new Date(lastSyncAt).getTime() - overlapMinutes * 60 * 1000);
}

/**
 * Async stream of changed Jira issues for a project since `from`.
 * Yields JiraIssue values; uses `paginate` over the new /search/jql endpoint.
 */
export async function* streamChangedIssues(
  jira: JiraClient,
  project: string,
  from: Date,
  config: Config,
  fields: string[],
  batch: number,
): AsyncGenerator<JiraIssue, void, unknown> {
  const fromStr = toJqlDateTime(from, config.sync.jiraTimezone);
  const jql = `project = "${project}" AND updated >= "${fromStr}" ORDER BY updated ASC`;
  logger.info(`delta JQL: ${jql}`);

  yield* paginate<JiraIssue, string>(async (cursor) => {
    const page = await jira.searchIssues({
      jql,
      fields,
      pageSize: batch,
      nextPageToken: cursor ?? undefined,
    });
    return { items: page.issues, nextCursor: page.nextPageToken ?? null };
  });
}
