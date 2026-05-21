// Pilot verification: pull the 5 migrated INFRA work items via REST and dump
// the fields that matter for the diff (name, state, priority, assignees, labels,
// description prefix). MCP retrieve 404s on this CE build — REST works.
const base = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "hijra";
const key = process.env.PLANE_API_KEY ?? "";
const cookie = process.env.PLANE_COOKIE_HEADER ?? "";
const pid = "af8c625b-52f6-4cd1-be09-e2605cccb95c";
const headers: Record<string, string> = { "X-API-Key": key };
if (cookie) headers["Cookie"] = cookie;

// state id -> name
const stRes = await fetch(`${base}/api/v1/workspaces/${slug}/projects/${pid}/states/?per_page=100`, { headers });
const stBody: any = await stRes.json();
const states: Record<string, string> = {};
for (const s of stBody.results ?? stBody) states[s.id] = `${s.name} (${s.group})`;

// labels id -> name
const lbRes = await fetch(`${base}/api/v1/workspaces/${slug}/projects/${pid}/labels/?per_page=100`, { headers });
const lbBody: any = await lbRes.json();
const labels: Record<string, string> = {};
for (const l of lbBody.results ?? lbBody) labels[l.id] = l.name;

let url: string | null = `${base}/api/v1/workspaces/${slug}/projects/${pid}/issues/?per_page=100`;
const all: any[] = [];
while (url) {
  const res = await fetch(url, { headers });
  const body: any = await res.json();
  all.push(...(body.results ?? (Array.isArray(body) ? body : [])));
  url = body?.next_page_results && body?.next_cursor
    ? `${base}/api/v1/workspaces/${slug}/projects/${pid}/issues/?per_page=100&cursor=${body.next_cursor}`
    : null;
}

console.log(`total live INFRA work items: ${all.length}\n`);
for (const wi of all.sort((a, b) => (a.sequence_id ?? 0) - (b.sequence_id ?? 0))) {
  const desc = (wi.description_html ?? wi.description_stripped ?? "").toString();
  const prefix = desc.split("\n")[0].slice(0, 160);
  console.log(`INFRA-${wi.sequence_id}: ${wi.name}`);
  console.log(`  state:     ${states[wi.state] ?? wi.state}`);
  console.log(`  priority:  ${wi.priority}`);
  console.log(`  assignees: ${JSON.stringify(wi.assignees ?? [])}`);
  console.log(`  labels:    ${JSON.stringify((wi.labels ?? []).map((id: string) => labels[id] ?? id))}`);
  console.log(`  start/target: ${wi.start_date} / ${wi.target_date}`);
  console.log(`  desc[0]:   ${prefix}`);
  console.log("");
}
