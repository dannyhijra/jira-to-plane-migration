// One-off discovery: enumerate all live work items in Plane II via the canonical
// /api/v1 issues endpoint (the MCP's list_work_items hits a path CE 404s on).
const base = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "hijra";
const key = process.env.PLANE_API_KEY ?? "";
const cookie = process.env.PLANE_COOKIE_HEADER ?? "";
const pid = "90adce1b-a90b-4bde-9898-41f22d23c73c";

const states: Record<string, string> = {
  "8479e576-c356-4284-a094-63141d0785d9": "Backlog",
  "eebc3d85-8f78-43aa-8e74-760c397f856e": "Todo",
  "a2e9a602-e036-41ea-97e0-6d0fba41ce8d": "Done",
  "da23783d-32f9-4f84-98af-ef6f83e7bccf": "In Progress",
  "cea2a90d-82f0-480c-ab2c-e45dfedc943b": "Cancelled",
  "88b67cc1-572b-4b16-94ed-2205c1463aa8": "In Review",
};

const headers: Record<string, string> = { "X-API-Key": key };
if (cookie) headers["Cookie"] = cookie;

let url: string | null =
  `${base}/api/v1/workspaces/${slug}/projects/${pid}/issues/?per_page=100`;
const all: any[] = [];
let pages = 0;
while (url) {
  const res = await fetch(url, { headers });
  if (res.status !== 200) {
    console.error(`HTTP ${res.status} on ${url}`);
    console.error((await res.text()).slice(0, 400));
    process.exit(1);
  }
  const body: any = await res.json();
  const results = Array.isArray(body) ? body : (body.results ?? []);
  all.push(...results);
  pages++;
  url = body && !Array.isArray(body) ? (body.next_page_results ? null : body.next) ?? null : null;
  if (typeof body?.next_cursor === "string" && body?.next_page_results) {
    url = `${base}/api/v1/workspaces/${slug}/projects/${pid}/issues/?per_page=100&cursor=${body.next_cursor}`;
  }
}

console.log(`pages=${pages} total_live_items=${all.length}`);
const byState: Record<string, number> = {};
for (const wi of all) {
  const s = states[wi.state] ?? wi.state ?? "(none)";
  byState[s] = (byState[s] ?? 0) + 1;
}
console.log("by state:", JSON.stringify(byState));

// Emit TSV: seq, state, name  (sorted by seq)
const rows = all
  .map((wi) => ({ seq: wi.sequence_id, state: states[wi.state] ?? "?", name: wi.name }))
  .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
const fs = await import("node:fs");
fs.writeFileSync(
  "/tmp/ii_diff/plane.tsv",
  rows.map((r) => `II-${r.seq}\t${r.state}\t${r.name}`).join("\n") + "\n",
);
console.log("wrote /tmp/ii_diff/plane.tsv");
