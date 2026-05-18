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
const projId = "ef603ac8-09d4-413f-ab6e-b9aea65af65a";

const jiraBase = cfg.jira.baseUrl.replace(/\/$/, "");
const jiraAuth = "Basic " + btoa(`${cfg.jira.email}:${cfg.jira.apiToken}`);

// Sample loaded from /tmp/arh-sample2.json
const SAMPLE: [string, string][] = JSON.parse(
  await Bun.file("/tmp/arh-sample2.json").text(),
);

const PRIORITY_MAP: Record<string, string> = {
  Highest: "urgent", High: "high", Medium: "medium", Low: "low", Lowest: "low", None: "none",
};
const STATUS_GROUP_MAP: Record<string, string> = {
  Final: "completed", "Finalisasi Draft": "started", "Followup User": "started",
  "Review Tim Legal": "started", "Permintaan Masuk": "unstarted",
};
const MODULE_FROM_KA: Record<string, string> = {
  PEMBIAYAAN: "PEMBIAYAAN", PENDANAAN: "PENDANAAN", "KERJA SAMA": "KERJA SAMA",
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

const modules = await planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/modules/`);
const moduleByName = new Map<string, string>();
const moduleById = new Map<string, string>();
const moduleWorkItems = new Map<string, Set<string>>(); // module_name -> Set<work_item_plane_id>
for (const m of (modules.results ?? modules.result ?? modules)) {
  moduleByName.set(m.name, m.id); moduleById.set(m.id, m.name);
  // Plane quirk: work_item.module_ids is not populated; module-issues IS authoritative.
  const mi = await planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/modules/${m.id}/module-issues/`);
  const list = Array.isArray(mi) ? mi : (mi.results ?? mi.result ?? []);
  moduleWorkItems.set(m.name, new Set(list.map((x: any) => x.issue ?? x.id)));
}

const findings: Array<{ jira: string; plane_seq: number | null; status: "PASS"|"FAIL"|"INFO"; issues: string[] }> = [];

for (const [jk, pid] of SAMPLE) {
  await new Promise((res) => setTimeout(res, 800)); // throttle to avoid 429
  const [j, p, planeComments, planeAttachs] = await Promise.all([
    fetchJira(jk, ["summary","status","priority","labels","assignee","creator","duedate","customfield_10015","customfield_10419","customfield_10420","comment","attachment"]),
    planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/`),
    planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/comments/`),
    planeGet(`/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/issue-attachments/`),
  ]);
  const issues: string[] = [];

  if (j.fields.summary.trim() !== (p.name ?? "").trim()) {
    issues.push(`Title: jira="${j.fields.summary}" plane="${p.name}"`);
  }

  const jiraStatusName = j.fields.status?.name;
  const expectedGroup = STATUS_GROUP_MAP[jiraStatusName];
  const planeState = stateById.get(p.state);
  if (!expectedGroup) issues.push(`Unknown Jira status "${jiraStatusName}"`);
  else if (planeState?.group !== expectedGroup) issues.push(`State group: Jira "${jiraStatusName}" → expected "${expectedGroup}", Plane "${planeState?.name}" (${planeState?.group})`);

  const jiraPriorityName = j.fields.priority?.name;
  const expectedPriority = jiraPriorityName ? PRIORITY_MAP[jiraPriorityName] : "none";
  if (expectedPriority && p.priority !== expectedPriority) issues.push(`Priority: Jira "${jiraPriorityName}" → expected "${expectedPriority}", Plane "${p.priority}"`);

  const jiraLabels = new Set<string>((j.fields.labels ?? []) as string[]);
  const planeLabels = new Set<string>((p.labels ?? []).map((id: string) => labelById.get(id) ?? `?${id}`));
  for (const l of jiraLabels) if (!planeLabels.has(l)) issues.push(`Label missing on Plane: "${l}"`);
  for (const l of planeLabels) if (!jiraLabels.has(l)) issues.push(`Extra label on Plane: "${l}"`);

  if ((p.assignees ?? []).length > 0) issues.push(`Assignees not empty (${p.assignees.length}; expected empty during Stage 2)`);
  const desc = (p.description_html ?? "") + "";
  const creatorEmail = j.fields.creator?.emailAddress;
  if (creatorEmail && !desc.includes(creatorEmail)) issues.push(`Creator "${creatorEmail}" not in description prefix`);
  const assigneeEmail = j.fields.assignee?.emailAddress;
  if (assigneeEmail && !desc.includes(assigneeEmail)) issues.push(`Assignee "${assigneeEmail}" not in description prefix`);

  // KEPERLUAN ANYUR footer + module assignment
  const ka = j.fields.customfield_10419?.value;
  if (ka) {
    if (!desc.includes(ka)) issues.push(`KEPERLUAN ANYUR "${ka}" missing from description footer`);
    const expectedModuleName = MODULE_FROM_KA[ka];
    if (expectedModuleName) {
      const wis = moduleWorkItems.get(expectedModuleName);
      if (!wis || !wis.has(pid)) issues.push(`Module assignment: work item not in module "${expectedModuleName}" (via module-issues endpoint)`);
    }
  }

  // KETERANGAN REQUEST
  const kr = j.fields.customfield_10420;
  if (kr && typeof kr === "object" && (kr as any).type === "doc") {
    const firstText = JSON.stringify(kr).match(/"text":"([^"]+)"/)?.[1];
    if (firstText) {
      if (!desc.includes("KETERANGAN REQUEST")) issues.push(`KETERANGAN REQUEST label missing from footer`);
      const excerpt = firstText.slice(0, Math.min(40, firstText.length));
      if (excerpt.length > 5 && !desc.includes(excerpt)) issues.push(`KETERANGAN REQUEST excerpt "${excerpt}" not in description`);
    }
  }

  // Dates (swap-if-inverted)
  let expStart = j.fields.customfield_10015 || null;
  let expTarget = j.fields.duedate || null;
  if (expStart && expTarget && expStart > expTarget) [expStart, expTarget] = [expTarget, expStart];
  if (expStart && p.start_date !== expStart) issues.push(`start_date: expected "${expStart}", Plane "${p.start_date}"`);
  if (expTarget && p.target_date !== expTarget) issues.push(`target_date: expected "${expTarget}", Plane "${p.target_date}"`);

  // Comment count: subtract attachment-placeholder comments (those start with "**Migrated attachment from Jira ...")
  const jiraCommentN = j.fields.comment?.total ?? (j.fields.comment?.comments?.length ?? 0);
  const planeCommentArr = Array.isArray(planeComments) ? planeComments : (planeComments.results ?? planeComments.result ?? []);
  const planeRealCommentN = planeCommentArr.filter(
    (c: any) => !((c.comment_html ?? "") + "").includes("Migrated attachment from Jira"),
  ).length;
  if (planeRealCommentN !== jiraCommentN) issues.push(`Comment count: jira=${jiraCommentN} plane=${planeRealCommentN} (excluding placeholder-comments)`);

  // Attachment count: Plane should == Jira (after dedupe). Gaps mean placeholder fallback, recorded as INFO.
  const jiraAttN = (j.fields.attachment ?? []).length;
  const planeAttArr = Array.isArray(planeAttachs) ? planeAttachs : (planeAttachs.results ?? planeAttachs.result ?? []);
  if (planeAttArr.length > jiraAttN) issues.push(`Extra Plane attachments: jira=${jiraAttN} plane=${planeAttArr.length}`);
  else if (planeAttArr.length < jiraAttN) issues.push(`INFO: attachment gap: jira=${jiraAttN} plane=${planeAttArr.length} (placeholder fallback in description)`);

  const status = issues.length === 0 ? "PASS" : (issues.every(s => s.startsWith("INFO:")) ? "INFO" : "FAIL");
  findings.push({ jira: jk, plane_seq: p.sequence_id ?? null, status, issues });
  console.log(jk, "→ ARH-" + p.sequence_id, status, issues.length ? "·" + issues.join(" | ") : "");
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const passed = findings.filter(f => f.status === "PASS").length;
const info = findings.filter(f => f.status === "INFO").length;
const failed = findings.filter(f => f.status === "FAIL").length;
const reportPath = `verification/ARH-${ts}.md`;

const lines: string[] = [];
lines.push(`# Verification: ARH — ${new Date().toISOString()}`);
lines.push("");
lines.push(`Sample size: ${findings.length}`);
lines.push(`Passed: ${passed}`);
lines.push(`Info-only: ${info}`);
lines.push(`Failed: ${failed}`);
lines.push("");
lines.push("Scope: work_item title, state group, priority, labels, assignee (Stage 2 empty + prefix), creator-in-prefix, KEPERLUAN ANYUR footer + module assignment, KETERANGAN REQUEST footer, start/target date (swap-if-inverted), comment count, attachment count.");
lines.push("");
lines.push("## Per-item findings");
lines.push("");
for (const f of findings) {
  const icon = f.status === "PASS" ? "✅" : f.status === "INFO" ? "⚠️" : "❌";
  lines.push(`### ${f.jira} → ARH-${f.plane_seq} · ${icon} ${f.status}`);
  lines.push("");
  if (f.issues.length === 0) lines.push("(no findings)");
  else for (const i of f.issues) lines.push(`- ${i}`);
  lines.push("");
}

lines.push("## Pattern analysis");
lines.push("");
if (failed === 0 && info === 0) lines.push("All sampled items pass with no notes.");
else {
  const byPattern = new Map<string, number>();
  for (const f of findings) for (const i of f.issues) {
    const k = (i.startsWith("INFO:") ? "INFO: " : "") + i.split(":").slice(0, 2).join(":");
    byPattern.set(k, (byPattern.get(k) ?? 0) + 1);
  }
  for (const [k, n] of [...byPattern.entries()].sort((a,b)=>b[1]-a[1])) lines.push(`- ${n} × ${k}`);
}
lines.push("");

await Bun.write(reportPath, lines.join("\n"));
console.log("\nReport written:", reportPath);
console.log(`Sample: ${findings.length} | Passed: ${passed} | Info: ${info} | Failed: ${failed}`);
