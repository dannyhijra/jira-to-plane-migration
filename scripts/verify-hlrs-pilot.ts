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

const SAMPLE: [string, string][] = [
  ["HLRS-1", "a88ae5b1-6200-44c9-93ea-2a5de1c620f8"],
  ["HLRS-2", "3fe7233a-9f4b-49d0-b3a7-51caae22649d"],
  ["HLRS-3", "2227ff03-234d-4089-b3ed-f664734208d3"],
  ["HLRS-4", "15080603-a6f9-4651-9c44-7a1ce91a5b74"],
  ["HLRS-5", "43627d21-11f0-4a72-859c-d3961aee7d64"],
];

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
  for (let attempt = 0; attempt < 8; attempt++) {
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
  await new Promise((res) => setTimeout(res, 800));
  const [j, p, planeComments] = await Promise.all([
    fetchJira(jk, ["summary","status","priority","labels","assignee","creator","duedate","customfield_10015","customfield_10424","customfield_10565","customfield_10425","customfield_10426","comment","attachment"]),
    planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/`),
    planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/comments/`),
  ]);

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

  // Labels
  const planeLabels = (p.labels ?? []).map((id: string) => labelById.get(id)).filter(Boolean) as string[];
  const jiraLabels = (j.fields?.labels ?? []) as string[];
  const jiraSet = new Set(jiraLabels);
  const planeSet = new Set(planeLabels);
  const missing = [...jiraSet].filter((l) => !planeSet.has(l));
  const extra = [...planeSet].filter((l) => !jiraSet.has(l));
  if (missing.length) issues.push(`labels missing on plane: ${JSON.stringify(missing)}`);
  if (extra.length) issues.push(`labels unexpected on plane: ${JSON.stringify(extra)}`);

  // Assignees — expected empty (no HLRS users in Plane workspace yet)
  const planeAssignees = (p.assignees ?? []) as string[];
  const jiraAssigneeEmail = j.fields?.assignee?.emailAddress ?? null;
  const hasPrefixEmail = (p.description_html ?? p.description_stripped ?? "").includes(jiraAssigneeEmail ?? "___nope___");
  if (planeAssignees.length === 0) {
    if (jiraAssigneeEmail && !hasPrefixEmail) issues.push(`assignee email "${jiraAssigneeEmail}" missing from description prefix`);
  } else {
    issues.push(`unexpected assignees on plane (no HLRS users in workspace yet): ${JSON.stringify(planeAssignees)}`);
  }

  // Start date (customfield_10015 → start_date)
  const jStart = j.fields?.customfield_10015 ?? null;
  const pStart = p.start_date ?? null;
  if (jStart !== pStart) issues.push(`start_date mismatch: jira=${jStart} plane=${pStart}`);

  // Target date (duedate → target_date) — HLRS is first project using builtin:target_date
  const jDue = j.fields?.duedate ?? null;
  const pTarget = p.target_date ?? null;
  if (jDue !== pTarget) issues.push(`target_date mismatch: jira_duedate=${jDue} plane_target=${pTarget}`);

  // Comments — count match
  const jCommentsCount = j.fields?.comment?.total ?? 0;
  const pCommentsCount = (planeComments.results ?? planeComments.result ?? planeComments)?.length ?? 0;
  if (jCommentsCount > 0 && pCommentsCount === 0) {
    issues.push(`INFO: jira has ${jCommentsCount} comments, plane has ${pCommentsCount} (expected — only 'issues' was migrated; comments are a separate entity)`);
  }

  // Attachments — count match (HLRS has attachments deferred per projects.yaml)
  const jAttachCount = (j.fields?.attachment ?? []).length;
  if (jAttachCount > 0) {
    issues.push(`INFO: jira has ${jAttachCount} attachments — attachments are deferred for HLRS per projects.yaml migrate_entities`);
  }

  const status = issues.length === 0 ? "PASS" : issues.every((s) => s.startsWith("INFO:")) ? "INFO" : "FAIL";
  findings.push({ jira: jk, plane_seq: planeSeq, status, issues });
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const passed = findings.filter((f) => f.status === "PASS").length;
const info = findings.filter((f) => f.status === "INFO").length;
const failed = findings.filter((f) => f.status === "FAIL").length;

const lines: string[] = [];
lines.push(`# Verification: HLRS pilot — ${new Date().toISOString()}`);
lines.push(``);
lines.push(`Sample size: ${findings.length}  ·  Passed: ${passed}  ·  INFO: ${info}  ·  Failed: ${failed}`);
lines.push(``);
lines.push(`Plane project: \`HLRS\` (id \`${projId}\`)`);
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

const report = lines.join("\n") + "\n";
const path = `verification/HLRS-pilot-${ts}.md`;
await Bun.write(path, report);
console.log(report);
console.log(`Report written to ${path}`);
