// Random-sample verification for II work items: diff Jira vs Plane.
// Plane via REST (MCP work-item reads 404 on this CE build); Jira via REST search.
//   bun run scripts/verify-ii-sample.ts [N]    (default N=20)
import { readFileSync } from "fs";

const N = Number(process.argv[2] ?? 20);
const pid = "90adce1b-a90b-4bde-9898-41f22d23c73c";
const base = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "hijra";
const pHeaders: Record<string, string> = { "X-API-Key": process.env.PLANE_API_KEY ?? "" };
if (process.env.PLANE_COOKIE_HEADER) pHeaders["Cookie"] = process.env.PLANE_COOKIE_HEADER;
const jbase = (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
const jAuth = "Basic " + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString("base64");

const stateName: Record<string, string> = {
  "8479e576-c356-4284-a094-63141d0785d9": "Backlog", "eebc3d85-8f78-43aa-8e74-760c397f856e": "Todo",
  "a2e9a602-e036-41ea-97e0-6d0fba41ce8d": "Done", "da23783d-32f9-4f84-98af-ef6f83e7bccf": "In Progress",
  "cea2a90d-82f0-480c-ab2c-e45dfedc943b": "Cancelled", "88b67cc1-572b-4b16-94ed-2205c1463aa8": "In Review",
};
const memberEmailById: Record<string, string> = {
  "b898280f-70bf-4964-9f70-1d4c97e52e75": "apaksi@hijra.id", "2ca18977-01d5-4818-9056-e562d5cc736e": "tjafar@hijra.id",
  "bc98142a-b544-4c1a-abca-f78a6d5c062f": "maidzola@hijra.id", "d8c431e0-966e-4ac5-9396-a6afb9cdcc1b": "eariyansyah@hijra.id",
  "cae459a5-9072-4c3c-b97b-528b1a2ca780": "muzizat@hijra.id", "f799f9fe-ed67-427c-8e51-199de6cd54a6": "dcahyono@hijra.id",
  "20c34118-71a9-412d-8f85-06a705034b3b": "smaizir@alamisharia.co.id", "aec14099-3a9b-4647-bd69-5a7c8a24f092": "efazrin@hijra.id",
  "21f50e41-656a-4b40-8de2-90fd16bf5f7d": "jnurohman@hijra.id", "deb0c128-4a39-4214-9940-f6202f835676": "lukman@cnrg-labs.id",
  "7613414e-98f4-4eee-b3dd-16c983eb58d7": "ldurachman@alamisharia.co.id",
};
const memberEmails = new Set(Object.values(memberEmailById).map((e) => e.toLowerCase()));
const statusMap: Record<string, string> = { Backlog: "Backlog", Todo: "Todo", "In Progress": "In Progress", "Need Review": "In Review", Done: "Done", Cancelled: "Cancelled" };
const prioMap: Record<string, string> = { Highest: "urgent", High: "high", Medium: "medium", Low: "low", Lowest: "low", None: "none" };

async function pAll(path: string): Promise<any[]> {
  let url: string | null = `${base}/api/v1/workspaces/${slug}/projects/${pid}${path}?per_page=100`;
  const out: any[] = [];
  while (url) {
    const r = await fetch(url, { headers: pHeaders });
    if (r.status !== 200) throw new Error(`GET ${path} -> ${r.status}`);
    const b: any = await r.json();
    out.push(...(Array.isArray(b) ? b : b.results ?? []));
    url = !Array.isArray(b) && b.next_page_results && b.next_cursor
      ? `${base}/api/v1/workspaces/${slug}/projects/${pid}${path}?per_page=100&cursor=${b.next_cursor}` : null;
  }
  return out;
}

// 1. sample from manifest (latest plane_id per jira_key)
const latest = new Map<string, string>();
for (const line of readFileSync("state/manifest.jsonl", "utf8").trim().split("\n")) {
  const e = JSON.parse(line);
  if (e.entity === "work_item" && e.project === "II" && e.status === "ok" && e.plane_id) latest.set(e.jira_key, e.plane_id);
}
const pool = [...latest.entries()];
const sample = pool.sort(() => Math.random() - 0.5).slice(0, N);

// 2. Plane side
const labels = await pAll("/labels/");
const labelName: Record<string, string> = {};
for (const l of labels) labelName[l.id] = l.name;
const planeById: Record<string, any> = {};
for (const i of await pAll("/issues/")) planeById[i.id] = i;

// 3. Jira side (one search)
const keys = sample.map(([k]) => k);
const jr = await fetch(`${jbase}/rest/api/3/search/jql`, {
  method: "POST", headers: { Authorization: jAuth, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ jql: `key IN (${keys.join(",")})`, fields: ["summary", "status", "priority", "labels", "assignee"], maxResults: 100 }),
});
const jBody: any = await jr.json();
const jById: Record<string, any> = {};
for (const i of jBody.issues ?? []) jById[i.key] = i.fields;

// 4. compare
let pass = 0, fail = 0, info = 0;
const lines: string[] = [];
for (const [jkey, planeId] of sample) {
  const jf = jById[jkey], p = planeById[planeId];
  const probs: string[] = [], notes: string[] = [];
  if (!jf) probs.push("Jira issue not found");
  if (!p) probs.push(`Plane item ${planeId} not found`);
  if (jf && p) {
    if ((jf.summary || "").trim() !== (p.name || "").trim()) probs.push(`title: jira«${jf.summary}» ≠ plane«${p.name}»`);
    const expState = statusMap[jf.status?.name] ?? "?", gotState = stateName[p.state] ?? p.state;
    if (expState !== gotState) probs.push(`state: expected ${expState}, got ${gotState} (jira '${jf.status?.name}')`);
    const expPrio = prioMap[jf.priority?.name] ?? "none";
    if (expPrio !== p.priority) probs.push(`priority: expected ${expPrio}, got ${p.priority}`);
    const jl = new Set((jf.labels ?? []).map(String));
    const pl = new Set((p.labels ?? []).map((id: string) => labelName[id] ?? id));
    const miss = [...jl].filter((x) => !pl.has(x as string)), extra = [...pl].filter((x) => !jl.has(x as string));
    if (miss.length || extra.length) probs.push(`labels: missing[${miss}] extra[${extra}]`);
    const aEmail = jf.assignee?.emailAddress?.toLowerCase();
    const nPlaneAssignees = (p.assignees ?? []).length;
    const desc = p.description_html ?? "";
    if (aEmail && memberEmails.has(aEmail)) {
      if (nPlaneAssignees === 0) probs.push(`assignee ${aEmail} is a member but Plane assignees empty`);
    } else {
      if (nPlaneAssignees > 0) probs.push(`assignee should be empty (jira ${aEmail ?? "none"} not a member) but Plane has ${nPlaneAssignees}`);
      if (aEmail && !desc.includes(aEmail)) probs.push(`assignee email ${aEmail} missing from description prefix`);
      if (aEmail) notes.push(`unassigned on Plane — ${aEmail} not yet a member, captured in prefix (reassign later)`);
    }
    if (!desc.includes(`Migrated from Jira ${jkey}`)) probs.push(`migration prefix missing`);
  }
  const seq = p ? `II-${p.sequence_id}` : "?";
  if (probs.length === 0) { pass++; if (notes.length) { info++; lines.push(`⚠️ ${jkey} → ${seq} (INFO)\n   - ${notes.join("\n   - ")}`); } else lines.push(`✅ ${jkey} → ${seq}`); }
  else { fail++; lines.push(`❌ ${jkey} → ${seq}\n   - ${probs.join("\n   - ")}`); }
}

console.log(`Sample: ${sample.length} | Passed: ${pass} | Failed: ${fail} | (INFO: ${info})\n`);
for (const l of lines) console.log(l);
