import { loadConfig } from "../src/lib/config";

const env = await Bun.file(".env").text();
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const cfg = await loadConfig();
const planeKey = process.env.PLANE_API_KEY!;
const planeBase = process.env.PLANE_BASE_URL!;
const ws = process.env.PLANE_WORKSPACE_SLUG || "hijra";
const projId = "6328c439-cf0b-4e44-b779-73c82201fa29";

const jiraBase = cfg.jira.baseUrl.replace(/\/$/, "");
const jiraAuth = "Basic " + btoa(`${cfg.jira.email}:${cfg.jira.apiToken}`);

// Random sample of 20 HLRS work_items with status=ok from the manifest.
// Also collect per-issue attachment counts from the manifest (authoritative — the
// Plane assets/v2 GET endpoint is session-cookie + Cloudflare gated and rejects X-API-Key,
// so we can't read attachments back via the same client used for issues/comments).
const manifestText = await Bun.file("state/manifest.jsonl").text();
const allOk: Array<{ jira_key: string; plane_id: string }> = [];
const attachByJiraKey = new Map<string, number>(); // base jira_key → migrated attachment count
for (const line of manifestText.split("\n")) {
  if (!line.trim()) continue;
  try {
    const e = JSON.parse(line);
    if (e.project !== "HLRS" || e.status !== "ok") continue;
    if (e.entity === "work_item" && e.jira_key && e.plane_id) {
      allOk.push({ jira_key: e.jira_key, plane_id: e.plane_id });
    } else if (e.entity === "attachment" && e.jira_key) {
      // jira_key shape for attachments: "HLRS-123#attachment#12345"
      const base = String(e.jira_key).split("#")[0];
      attachByJiraKey.set(base, (attachByJiraKey.get(base) ?? 0) + 1);
    }
  } catch { /* skip malformed */ }
}
const shuffled = [...allOk].sort(() => Math.random() - 0.5);
const SAMPLE: [string, string][] = shuffled.slice(0, 20).map((e) => [e.jira_key, e.plane_id]);
console.log(`Sampling ${SAMPLE.length} of ${allOk.length} HLRS work_items...`);

const PRIORITY_MAP: Record<string, string> = {
  Highest: "urgent", High: "high", Medium: "medium", Low: "low", Lowest: "low", None: "none",
};
const STATUS_NAME_MAP: Record<string, string> = {
  "PERMINTAAN MASUK": "PERMINTAAN MASUK",
  "REVIEW TIM LEGAL": "REVIEW TIM LEGAL",
  "FOLLOW UP USER": "FOLLOW UP USER",
  "FINAL": "FINAL",
};

async function fetchJira(key: string, fields: string[]): Promise<any> {
  const r = await fetch(`${jiraBase}/rest/api/3/issue/${key}?fields=${fields.join(",")}`, {
    headers: { Authorization: jiraAuth, Accept: "application/json" },
  });
  return r.json();
}
async function planeGet(path: string): Promise<any> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const r = await fetch(`${planeBase}${path}`, { headers: { "X-API-Key": planeKey } });
    if (r.status === 429) {
      const ra = parseInt(r.headers.get("retry-after") ?? "0", 10);
      const wait = Math.max(ra * 1000, 5000 * (attempt + 1));
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    return r.json();
  }
  throw new Error(`planeGet exhausted retries: ${path}`);
}

const states = await planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/states/`);
const stateById = new Map<string, { name: string; group: string }>();
for (const s of (states.results ?? states.result ?? states)) stateById.set(s.id, { name: s.name, group: s.group });

const labels = await planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/labels/`);
const labelById = new Map<string, string>();
for (const l of (labels.results ?? labels.result ?? labels)) labelById.set(l.id, l.name);

const findings: Array<{ jira: string; plane_seq: number | null; status: "PASS"|"FAIL"|"INFO"; issues: string[] }> = [];

for (const [jk, pid] of SAMPLE) {
  await new Promise((res) => setTimeout(res, 1000)); // throttle to avoid 429
  let j: any, p: any, planeComments: any;
  try {
    [j, p, planeComments] = await Promise.all([
      fetchJira(jk, ["summary","status","priority","labels","assignee","creator","duedate","customfield_10015","customfield_10424","customfield_10565","customfield_10425","customfield_10426","comment","attachment"]),
      planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/`),
      planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/comments/`),
    ]);
  } catch (e: any) {
    findings.push({ jira: jk, plane_seq: null, status: "FAIL", issues: [`fetch error: ${e.message}`] });
    continue;
  }

  const issues: string[] = [];
  const planeSeq = p?.sequence_id ?? null;

  if (!p || !p.name) { issues.push(`Plane fetch failed (${JSON.stringify(p).slice(0, 200)})`); findings.push({ jira: jk, plane_seq: planeSeq, status: "FAIL", issues }); continue; }

  // Title — trim trailing whitespace (Plane normalizes; cosmetic-only difference is INFO)
  const jTitle = (j.fields?.summary ?? "");
  const pTitle = (p.name ?? "");
  if (jTitle !== pTitle) {
    if (jTitle.trim() === pTitle.trim()) issues.push(`INFO: title whitespace-only difference: jira="${jTitle}" plane="${pTitle}"`);
    else issues.push(`title mismatch: jira="${jTitle}" plane="${pTitle}"`);
  }

  // State
  const expectedStateName = STATUS_NAME_MAP[j.fields?.status?.name] ?? null;
  const planeState = p.state ? stateById.get(p.state) : null;
  if (!expectedStateName) issues.push(`unmapped Jira status "${j.fields?.status?.name}"`);
  else if (!planeState || planeState.name !== expectedStateName) issues.push(`state mismatch: expected "${expectedStateName}", got "${planeState?.name ?? "?"}" (group=${planeState?.group ?? "?"})`);

  // Priority
  const expectedPriority = PRIORITY_MAP[j.fields?.priority?.name] ?? null;
  if (expectedPriority && p.priority !== expectedPriority) issues.push(`priority mismatch: expected "${expectedPriority}", got "${p.priority}"`);

  // Labels
  const planeLabels = (p.labels ?? []).map((id: string) => labelById.get(id)).filter(Boolean) as string[];
  const jiraLabels = (j.fields?.labels ?? []) as string[];
  const jiraSet = new Set(jiraLabels);
  const planeSet = new Set(planeLabels);
  const missing = [...jiraSet].filter((l) => !planeSet.has(l));
  const extra = [...planeSet].filter((l) => !jiraSet.has(l));
  if (missing.length) issues.push(`labels missing on plane: ${JSON.stringify(missing)}`);
  if (extra.length) issues.push(`labels unexpected on plane: ${JSON.stringify(extra)}`);

  // Assignees — expected empty (no HLRS users in Plane workspace yet); email must be in prefix
  const planeAssignees = (p.assignees ?? []) as string[];
  const jiraAssigneeEmail = j.fields?.assignee?.emailAddress ?? null;
  const descHaystack = (p.description_html ?? "") + " " + (p.description_stripped ?? "");
  const hasPrefixEmail = jiraAssigneeEmail ? descHaystack.includes(jiraAssigneeEmail) : true;
  if (planeAssignees.length === 0) {
    if (jiraAssigneeEmail && !hasPrefixEmail) issues.push(`assignee email "${jiraAssigneeEmail}" missing from description prefix`);
  } else {
    issues.push(`unexpected assignees on plane (no HLRS users in workspace yet): ${JSON.stringify(planeAssignees)}`);
  }

  // Start date
  const jStart = j.fields?.customfield_10015 ?? null;
  const pStart = p.start_date ?? null;
  if (jStart !== pStart) issues.push(`start_date mismatch: jira=${jStart} plane=${pStart}`);

  // Target date (HLRS uses builtin:target_date)
  const jDue = j.fields?.duedate ?? null;
  const pTarget = p.target_date ?? null;
  if (jDue !== pTarget) issues.push(`target_date mismatch: jira_duedate=${jDue} plane_target=${pTarget}`);

  // Comments — count match (comments WERE migrated this run)
  const jCommentsCount = j.fields?.comment?.total ?? 0;
  const planeCommentsList = (planeComments.results ?? planeComments.result ?? planeComments) ?? [];
  const pCommentsCount = Array.isArray(planeCommentsList) ? planeCommentsList.length : 0;
  if (jCommentsCount !== pCommentsCount) issues.push(`comment count mismatch: jira=${jCommentsCount} plane=${pCommentsCount}`);

  // Attachments — count match (via manifest, since Plane GET endpoint is session-cookie gated)
  const jAttachCount = (j.fields?.attachment ?? []).length;
  const mAttachCount = attachByJiraKey.get(jk) ?? 0;
  if (jAttachCount !== mAttachCount) issues.push(`attachment count mismatch: jira=${jAttachCount} manifest=${mAttachCount}`);

  const onlyInfos = issues.length > 0 && issues.every((s) => s.startsWith("INFO:"));
  const status = issues.length === 0 ? "PASS" : onlyInfos ? "INFO" : "FAIL";
  findings.push({ jira: jk, plane_seq: planeSeq, status, issues });
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const passed = findings.filter((f) => f.status === "PASS").length;
const info = findings.filter((f) => f.status === "INFO").length;
const failed = findings.filter((f) => f.status === "FAIL").length;

const lines: string[] = [];
lines.push(`# Verification: HLRS — ${new Date().toISOString()}`);
lines.push(``);
lines.push(`Sample: ${findings.length}  ·  Passed: ${passed}  ·  INFO: ${info}  ·  Failed: ${failed}`);
lines.push(``);
lines.push(`Plane project: \`HLRS\` (id \`${projId}\`)`);
lines.push(`Selection: 20 random work_items from manifest with status=ok`);
lines.push(``);
lines.push(`## Per-item findings`);
for (const f of findings) {
  const icon = f.status === "PASS" ? "✅" : f.status === "INFO" ? "ℹ️" : "❌";
  lines.push(``);
  lines.push(`### ${f.jira} → HLRS-${f.plane_seq ?? "?"} · ${icon} ${f.status}`);
  lines.push(``);
  if (f.issues.length === 0) lines.push(`(no findings)`);
  else for (const s of f.issues) lines.push(`- ${s}`);
}

// Pattern analysis
const failedItems = findings.filter((f) => f.status === "FAIL");
if (failedItems.length > 0) {
  lines.push(``);
  lines.push(`## Pattern analysis`);
  const byPrefix = new Map<string, number>();
  for (const f of failedItems) {
    for (const issue of f.issues) {
      if (issue.startsWith("INFO:")) continue;
      const prefix = issue.split(":")[0];
      byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
    }
  }
  for (const [prefix, count] of [...byPrefix.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${count}× ${prefix}`);
  }
}

const report = lines.join("\n") + "\n";
const path = `verification/HLRS-${ts}.md`;
await Bun.write(path, report);
console.log(`\n=== SUMMARY ===\nSample: ${findings.length} | Passed: ${passed} | INFO: ${info} | Failed: ${failed}\nReport: ${path}`);
if (failed > 0) {
  console.log(`\n=== FAILED ITEMS ===`);
  for (const f of failedItems) console.log(`  ${f.jira} → HLRS-${f.plane_seq}: ${f.issues.filter(i => !i.startsWith("INFO:")).join("; ")}`);
}
