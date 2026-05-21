// Random-sample verification for IHH work items: diff Jira vs Plane for a spread
// of 20 issues (old → recent, so the custom-field footer is exercised on newer
// ones). Applies config mappings and reports PASS/FAIL/INFO per item.
//   Jira side: JiraClient (one JQL batch).  Plane side: REST (MCP retrieve 404s on CE).
import { loadConfig } from "../src/lib/config";
import { JiraClient } from "../src/clients/jira";
import { PlaneClient } from "../src/clients/plane";
import { mapJiraLabels } from "../src/mappers/labels";

const PROJECT = "IHH";
const PROJECT_ID = "0fbdc5d0-2d02-42a2-9f02-2830cbe190f6";
const SAMPLE = 20;

const config = await loadConfig();
const jira = new JiraClient(config);
const plane = new PlaneClient(config);
const req = (plane as any).request.bind(plane);
const projPath = (plane as any).projectPath.bind(plane);

// 1. Sample (jira_key, plane_id) pairs from the manifest, spread across the range.
const lines = require("fs").readFileSync("state/manifest.jsonl", "utf8").trim().split("\n");
const okPairs: { key: string; pid: string; n: number }[] = [];
const seen = new Set<string>();
for (const l of lines) {
  let o: any; try { o = JSON.parse(l); } catch { continue; }
  if (o.project === PROJECT && o.entity === "work_item" && o.status === "ok" && !seen.has(o.jira_key)) {
    seen.add(o.jira_key);
    okPairs.push({ key: o.jira_key, pid: o.plane_id, n: Number(o.jira_key.split("-")[1]) });
  }
}
okPairs.sort((a, b) => a.n - b.n);
const step = Math.floor(okPairs.length / SAMPLE);
const sample = Array.from({ length: SAMPLE }, (_, i) => okPairs[Math.min(i * step, okPairs.length - 1)]);
// Force-include the 3 most-recent (footer-bearing) keys.
for (const p of okPairs.slice(-3)) if (!sample.find((s) => s.key === p.key)) sample[sample.length - 1 - 0] = p;

// 2. Jira batch.
const cfIds = ["customfield_10103", "customfield_10164", "customfield_10131", "customfield_10132"];
const jql = `project = ${PROJECT} AND key in (${sample.map((s) => s.key).join(",")})`;
const jiraIssues = new Map<string, any>();
let token: string | undefined;
do {
  const page = await jira.searchIssues({
    jql,
    fields: ["summary", "status", "priority", "labels", "assignee", ...cfIds],
    nextPageToken: token, pageSize: 100,
  });
  for (const it of page.issues) jiraIssues.set(it.key, it);
  token = page.nextPageToken;
} while (token);

// 3. Plane lookups.
const states = await plane.listStates(PROJECT_ID);
const stateGroup = new Map(states.map((s: any) => [s.id, s.group]));
const labels = await plane.listLabels(PROJECT_ID);
const labelName = new Map(labels.map((l: any) => [l.id, l.name]));
const members = await plane.listProjectMembers(PROJECT_ID);
const memberEmails = new Set(members.map((m: any) => (m.email ?? m.member?.email ?? "").toLowerCase()).filter(Boolean));

const STATUS = config.mappings.status[PROJECT] ?? {};
const PRIORITY = config.mappings.priority;
const STATE_GROUP_OF: Record<string, string> = { Backlog: "backlog", Todo: "unstarted", "To Do": "unstarted", "In Progress": "started", "In Review": "started", Done: "completed", Cancelled: "cancelled" };

let pass = 0, fail = 0, info = 0;
const report: string[] = [];

for (const s of sample) {
  const j = jiraIssues.get(s.key);
  if (!j) { report.push(`### ${s.key} · ❌ FAIL\n- Jira issue not returned`); fail++; continue; }
  const wi: any = await req(projPath(PROJECT_ID, `/issues/${s.pid}/`));
  const f = j.fields;
  const findings: string[] = [];

  // Title
  if (wi.name !== f.summary) findings.push(`Title: jira="${f.summary}" plane="${wi.name}"`);
  // State group
  const expectGroup = STATE_GROUP_OF[STATUS[f.status?.name] ?? ""] ?? null;
  const gotGroup = stateGroup.get(wi.state);
  if (expectGroup && gotGroup !== expectGroup) findings.push(`State: jira ${f.status?.name} → expect ${expectGroup}, got ${gotGroup}`);
  // Priority
  const expectPrio = PRIORITY[f.priority?.name ?? "None"] ?? "none";
  if (wi.priority !== expectPrio) findings.push(`Priority: jira ${f.priority?.name} → expect ${expectPrio}, got ${wi.priority}`);
  // Labels (set equality after rename)
  const expectLabels = new Set(mapJiraLabels(f.labels ?? [], config.mappings));
  const gotLabels = new Set((wi.labels ?? []).map((id: string) => labelName.get(id)));
  for (const l of expectLabels) if (!gotLabels.has(l)) findings.push(`Label missing on Plane: ${l}`);
  for (const l of gotLabels) if (!expectLabels.has(l as string)) findings.push(`Extra label on Plane: ${l}`);
  // Assignee
  const desc: string = wi.description_html ?? "";
  const aEmail = f.assignee?.emailAddress?.toLowerCase();
  const planeAssignees = wi.assignees ?? [];
  if (aEmail) {
    if (memberEmails.has(aEmail)) {
      if (planeAssignees.length === 0) findings.push(`Assignee ${aEmail} is a member but Plane assignees empty (reassign pending)`);
    } else {
      if (planeAssignees.length > 0) findings.push(`Assignee ${aEmail} NOT a member but Plane has assignees`);
      if (!desc.includes(f.assignee.emailAddress)) findings.push(`Assignee ${aEmail} not in description prefix`);
    }
  }
  // Custom-field footer: for each property: field with a value, expect it in footer.
  const footer = desc.includes("migrated-custom-fields");
  const cfWithValue = cfIds.filter((id) => f[id] != null);
  if (cfWithValue.length > 0 && !footer) findings.push(`Has custom-field value(s) ${cfWithValue.join(",")} but no footer`);

  // Classify
  const onlyInfo = findings.length > 0 && findings.every((x) => x.includes("reassign pending"));
  if (findings.length === 0) { pass++; report.push(`### ${s.key} → ${s.pid} · ✅ PASS`); }
  else if (onlyInfo) { info++; pass++; report.push(`### ${s.key} → ${s.pid} · ⚠️ INFO\n- ${findings.join("\n- ")}`); }
  else { fail++; report.push(`### ${s.key} → ${s.pid} · ❌ FAIL\n- ${findings.join("\n- ")}`); }
}

console.log(`SAMPLE=${sample.length} PASS=${pass} FAIL=${fail} INFO=${info}`);
console.log("KEYS:", sample.map((s) => s.key).join(", "));
console.log("\n" + report.join("\n\n"));
