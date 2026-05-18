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
const projId = "a9f5d28f-72e0-4e3c-af57-d8357c22c7cf";

const jiraBase = cfg.jira.baseUrl.replace(/\/$/, "");
const jiraAuth = "Basic " + btoa(`${cfg.jira.email}:${cfg.jira.apiToken}`);

const SAMPLE: [string, string][] = [
  ["HDR-26", "c2e416fb-c56d-4c77-a0d4-88947b2a0724"],
  ["HDR-41", "7fa6554d-ceff-4e0c-9b54-52249a9eab2b"],
  ["HDR-25", "9a3cb988-be1c-47d4-a0f6-a3228a18fa45"],
  ["HDR-11", "b171f506-b5fd-4716-852d-4d7723ef3f6a"],
  ["HDR-36", "c8db7e8d-4eaf-442f-9d6c-c662f157c3e2"],
  ["HDR-21", "2b483da6-7b3e-42e2-be32-e163231f8497"],
  ["HDR-18", "5b283332-9c2f-4043-bc29-d0f8cc4d9f09"],
  ["HDR-42", "221ca726-6007-42f9-ba88-90a1a52669df"],
  ["HDR-12", "9c47a197-a166-40e6-ab29-2a0467a62692"],
  ["HDR-45", "73213daf-01f3-405d-846a-370c1ea46e61"],
  ["HDR-38", "fa21b0db-b4b8-4868-8baa-73c68164f377"],
  ["HDR-2",  "2a25df26-4897-42cb-b10e-536a1e9b6dc1"],
  ["HDR-29", "dab41151-cfa9-4df2-9192-1af4cb9ffcee"],
  ["HDR-10", "a9d1ee1e-3dce-4273-b17e-da12b4270504"],
  ["HDR-47", "5dd2f6e5-7764-44b6-93de-5cdf16e806da"],
  ["HDR-40", "ae2830f5-68ec-4868-9dbd-62f3cbc1c89b"],
  ["HDR-28", "c1d80dca-61f4-4a47-8bf9-d99e4435e9ac"],
  ["HDR-31", "301f0d42-f716-41df-a0c9-ab758f786c91"],
  ["HDR-53", "8cad6b97-77a1-41bd-80e6-26d5554a0039"],
  ["HDR-43", "11663bf9-b5d8-4127-912b-83c489963693"],
];

const PRIORITY_MAP: Record<string, string> = {
  Highest: "urgent", High: "high", Medium: "medium", Low: "low", Lowest: "low", None: "none",
};
const STATUS_NAME_MAP: Record<string, string> = {
  "PERMINTAAN MASUK": "PERMINTAAN MASUK",
  "LEGAL REVIEW": "LEGAL REVIEW",
  "USER PROSES": "USER PROSES",
  "Done": "Done",
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
      fetchJira(jk, ["summary","status","priority","labels","assignee","creator","duedate","customfield_10015","comment","attachment"]),
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

  // Title
  if ((p.name ?? "") !== (j.fields?.summary ?? "")) issues.push(`title mismatch: jira="${j.fields?.summary}" plane="${p.name}"`);

  // State
  const expectedStateName = STATUS_NAME_MAP[j.fields?.status?.name] ?? null;
  const planeState = p.state ? stateById.get(p.state) : null;
  if (!expectedStateName) issues.push(`unmapped Jira status "${j.fields?.status?.name}"`);
  else if (!planeState || planeState.name !== expectedStateName) issues.push(`state mismatch: expected "${expectedStateName}", got "${planeState?.name ?? "?"}" (group=${planeState?.group ?? "?"})`);

  // Priority
  const expectedPriority = PRIORITY_MAP[j.fields?.priority?.name] ?? null;
  if (expectedPriority && p.priority !== expectedPriority) issues.push(`priority mismatch: expected "${expectedPriority}", got "${p.priority}"`);

  // Labels — only auto-form labels expected on issues that have them in Jira
  const planeLabels = (p.labels ?? []).map((id: string) => labelById.get(id)).filter(Boolean) as string[];
  const jiraLabels = (j.fields?.labels ?? []) as string[];
  const jiraSet = new Set(jiraLabels);
  const planeSet = new Set(planeLabels);
  const missing = [...jiraSet].filter((l) => !planeSet.has(l));
  const extra = [...planeSet].filter((l) => !jiraSet.has(l));
  if (missing.length) issues.push(`labels missing on plane: ${JSON.stringify(missing)}`);
  if (extra.length) issues.push(`labels unexpected on plane: ${JSON.stringify(extra)}`);

  // Assignees — expected empty (no HDR users in Plane workspace yet); email must be in prefix
  const planeAssignees = (p.assignees ?? []) as string[];
  const jiraAssigneeEmail = j.fields?.assignee?.emailAddress ?? null;
  const descHaystack = (p.description_html ?? "") + " " + (p.description_stripped ?? "");
  const hasPrefixEmail = jiraAssigneeEmail ? descHaystack.includes(jiraAssigneeEmail) : true;
  if (planeAssignees.length === 0) {
    if (jiraAssigneeEmail && !hasPrefixEmail) issues.push(`assignee email "${jiraAssigneeEmail}" missing from description prefix`);
  } else {
    issues.push(`unexpected assignees on plane (no HDR users in workspace yet): ${JSON.stringify(planeAssignees)}`);
  }

  // Start date
  const jStart = j.fields?.customfield_10015 ?? null;
  const pStart = p.start_date ?? null;
  if (jStart !== pStart) issues.push(`start_date mismatch: jira=${jStart} plane=${pStart}`);

  // Comments — count match (comments WERE migrated this run)
  const jCommentsCount = j.fields?.comment?.total ?? 0;
  const planeCommentsList = (planeComments.results ?? planeComments.result ?? planeComments) ?? [];
  const pCommentsCount = Array.isArray(planeCommentsList) ? planeCommentsList.length : 0;
  if (jCommentsCount !== pCommentsCount) issues.push(`comment count mismatch: jira=${jCommentsCount} plane=${pCommentsCount}`);

  // Attachments deferred for HDR
  const jAttachCount = (j.fields?.attachment ?? []).length;
  if (jAttachCount > 0) issues.push(`INFO: jira has ${jAttachCount} attachments — deferred for HDR per projects.yaml`);

  const onlyInfos = issues.length > 0 && issues.every((s) => s.startsWith("INFO:"));
  const status = issues.length === 0 ? "PASS" : onlyInfos ? "INFO" : "FAIL";
  findings.push({ jira: jk, plane_seq: planeSeq, status, issues });
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const passed = findings.filter((f) => f.status === "PASS").length;
const info = findings.filter((f) => f.status === "INFO").length;
const failed = findings.filter((f) => f.status === "FAIL").length;

const lines: string[] = [];
lines.push(`# Verification: HDR — ${new Date().toISOString()}`);
lines.push(``);
lines.push(`Sample: ${findings.length}  ·  Passed: ${passed}  ·  INFO: ${info}  ·  Failed: ${failed}`);
lines.push(``);
lines.push(`Plane project: \`HDR\` (id \`${projId}\`)`);
lines.push(`Selection: 20 random work_items from manifest with status=ok`);
lines.push(``);
lines.push(`## Per-item findings`);
for (const f of findings) {
  const icon = f.status === "PASS" ? "✅" : f.status === "INFO" ? "ℹ️" : "❌";
  lines.push(``);
  lines.push(`### ${f.jira} → HDR-${f.plane_seq ?? "?"} · ${icon} ${f.status}`);
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
const path = `verification/HDR-${ts}.md`;
await Bun.write(path, report);
console.log(`\n=== SUMMARY ===\nSample: ${findings.length} | Passed: ${passed} | INFO: ${info} | Failed: ${failed}\nReport: ${path}`);
if (failed > 0) {
  console.log(`\n=== FAILED ITEMS ===`);
  for (const f of failedItems) console.log(`  ${f.jira} → HDR-${f.plane_seq}: ${f.issues.filter(i => !i.startsWith("INFO:")).join("; ")}`);
}
