// Pilot verification helper: dump the current Plane II work items in a compact,
// human-comparable form (REST — the MCP work-item reads 404 on this CE build).
const base = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "hijra";
const key = process.env.PLANE_API_KEY ?? "";
const cookie = process.env.PLANE_COOKIE_HEADER ?? "";
const pid = "90adce1b-a90b-4bde-9898-41f22d23c73c";
const headers: Record<string, string> = { "X-API-Key": key };
if (cookie) headers["Cookie"] = cookie;

const states: Record<string, string> = {
  "8479e576-c356-4284-a094-63141d0785d9": "Backlog",
  "eebc3d85-8f78-43aa-8e74-760c397f856e": "Todo",
  "a2e9a602-e036-41ea-97e0-6d0fba41ce8d": "Done",
  "da23783d-32f9-4f84-98af-ef6f83e7bccf": "In Progress",
  "cea2a90d-82f0-480c-ab2c-e45dfedc943b": "Cancelled",
  "88b67cc1-572b-4b16-94ed-2205c1463aa8": "In Review",
};
const members: Record<string, string> = {
  "21f50e41-656a-4b40-8de2-90fd16bf5f7d": "jnurohman@hijra.id",
  "7613414e-98f4-4eee-b3dd-16c983eb58d7": "ldurachman@alamisharia.co.id",
  "613c1e6514e834007116b1c1": "efazrin@hijra.id",
};

async function get(path: string): Promise<any> {
  const res = await fetch(`${base}/api/v1/workspaces/${slug}/projects/${pid}${path}?per_page=100`, { headers });
  if (res.status !== 200) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

const labelsBody = await get("/labels/");
const labelName: Record<string, string> = {};
for (const l of labelsBody.results ?? labelsBody) labelName[l.id] = l.name;

const issuesBody = await get("/issues/");
const issues = (issuesBody.results ?? issuesBody).sort((a: any, b: any) => a.sequence_id - b.sequence_id);

for (const wi of issues) {
  const desc = (wi.description_html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  console.log(`\n── II-${wi.sequence_id}  «${wi.name}»`);
  console.log(`   state=${states[wi.state] ?? wi.state}  priority=${wi.priority}`);
  console.log(`   assignees=[${(wi.assignees ?? []).map((a: string) => members[a] ?? a).join(", ")}]`);
  console.log(`   labels=[${(wi.labels ?? []).map((l: string) => labelName[l] ?? l).join(", ")}]`);
  console.log(`   desc: ${desc.slice(0, 180)}`);
}
console.log(`\nTotal live Plane II items: ${issues.length}`);
