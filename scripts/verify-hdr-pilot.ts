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
  ["HDR-1", "a91a41d1-2d6a-4249-9036-597b6b1b9258"],
  ["HDR-2", "2a25df26-4897-42cb-b10e-536a1e9b6dc1"],
  ["HDR-3", "b6e879b8-a29f-4ac8-80ee-a43d72dc9837"],
  ["HDR-4", "0f50a15c-94a4-40be-a0fc-c8fa1de306e4"],
  ["HDR-5", "54903605-e46c-4afe-814b-04764f129adf"],
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
    fetchJira(jk, ["summary","status","priority","labels","assignee","creator","duedate","customfield_10015","comment","attachment"]),
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

  // Labels (Plane labels reflect what was applied — pre-seeded both auto-form labels)
  const planeLabels = (p.labels ?? []).map((id: string) => labelById.get(id)).filter(Boolean) as string[];
  const jiraLabels = (j.fields?.labels ?? []) as string[];
  const jiraSet = new Set(jiraLabels);
  const planeSet = new Set(planeLabels);
  const missing = [...jiraSet].filter((l) => !planeSet.has(l));
  const extra = [...planeSet].filter((l) => !jiraSet.has(l));
  if (missing.length) issues.push(`labels missing on plane: ${JSON.stringify(missing)}`);
  if (extra.length) issues.push(`labels unexpected on plane: ${JSON.stringify(extra)}`);

  // Assignees — expected empty (no HDR users in Plane workspace yet)
  const planeAssignees = (p.assignees ?? []) as string[];
  const jiraAssigneeEmail = j.fields?.assignee?.emailAddress ?? null;
  const hasPrefixEmail = (p.description_html ?? p.description_stripped ?? "").includes(jiraAssigneeEmail ?? "___nope___");
  if (planeAssignees.length === 0) {
    if (jiraAssigneeEmail && !hasPrefixEmail) issues.push(`assignee email "${jiraAssigneeEmail}" missing from description prefix`);
  } else {
    issues.push(`unexpected assignees on plane (no HDR users in workspace yet): ${JSON.stringify(planeAssignees)}`);
  }

  // Start date
  const jStart = j.fields?.customfield_10015 ?? null;
  const pStart = p.start_date ?? null;
  if (jStart !== pStart) issues.push(`start_date mismatch: jira=${jStart} plane=${pStart}`);

  // Comments — count match
  const jCommentsCount = j.fields?.comment?.total ?? 0;
  const pCommentsCount = (planeComments.results ?? planeComments.result ?? planeComments)?.length ?? 0;
  if (jCommentsCount > 0 && pCommentsCount === 0 && !(p as any).__skip_comments) {
    // Comments may not be migrated yet (only --only issues was run). Mark as INFO.
    issues.push(`INFO: jira has ${jCommentsCount} comments, plane has ${pCommentsCount} (expected — only 'issues' was migrated; comments are a separate entity)`);
  }

  // Attachments — count match (HDR has attachments deferred per projects.yaml)
  const jAttachCount = (j.fields?.attachment ?? []).length;
  if (jAttachCount > 0) {
    issues.push(`INFO: jira has ${jAttachCount} attachments — attachments are deferred for HDR per projects.yaml migrate_entities`);
  }

  const status = issues.length === 0 ? "PASS" : issues.every((s) => s.startsWith("INFO:")) ? "INFO" : "FAIL";
  findings.push({ jira: jk, plane_seq: planeSeq, status, issues });
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const passed = findings.filter((f) => f.status === "PASS").length;
const info = findings.filter((f) => f.status === "INFO").length;
const failed = findings.filter((f) => f.status === "FAIL").length;

const lines: string[] = [];
lines.push(`# Verification: HDR pilot — ${new Date().toISOString()}`);
lines.push(``);
lines.push(`Sample size: ${findings.length}  ·  Passed: ${passed}  ·  INFO: ${info}  ·  Failed: ${failed}`);
lines.push(``);
lines.push(`Plane project: \`HDR\` (id \`${projId}\`)`);
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

const report = lines.join("\n") + "\n";
const path = `verification/HDR-${ts}.md`;
await Bun.write(path, report);
console.log(report);
console.log(`Report written to ${path}`);
