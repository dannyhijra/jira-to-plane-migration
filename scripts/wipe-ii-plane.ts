// One-off: wipe Plane II to a clean slate before the fresh full-history migration.
// Deletes ALL live work items + ALL modules + ALL cycles in II (per discovery/II.md Q1).
// DRY-RUN by default — prints what WOULD be deleted. Set EXECUTE=1 to actually delete.
//
//   bun run scripts/wipe-ii-plane.ts            # dry-run
//   EXECUTE=1 bun run scripts/wipe-ii-plane.ts  # perform deletions
//
// ⚠️ Irreversible. Plane has no API-level undo for deleted work items.
const base = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "hijra";
const key = process.env.PLANE_API_KEY ?? "";
const cookie = process.env.PLANE_COOKIE_HEADER ?? "";
const pid = "90adce1b-a90b-4bde-9898-41f22d23c73c";
const EXECUTE = process.env.EXECUTE === "1" || process.argv.includes("--execute");

const headers: Record<string, string> = { "X-API-Key": key };
if (cookie) headers["Cookie"] = cookie;

async function getAll(path: string): Promise<any[]> {
  let url: string | null = `${base}/api/v1/workspaces/${slug}/projects/${pid}${path}?per_page=100`;
  const out: any[] = [];
  while (url) {
    const res = await fetch(url, { headers });
    if (res.status !== 200) throw new Error(`GET ${url} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    const body: any = await res.json();
    out.push(...(Array.isArray(body) ? body : body.results ?? []));
    url = !Array.isArray(body) && body.next_page_results && body.next_cursor
      ? `${base}/api/v1/workspaces/${slug}/projects/${pid}${path}?per_page=100&cursor=${body.next_cursor}`
      : null;
  }
  return out;
}

async function del(path: string): Promise<number> {
  const res = await fetch(`${base}/api/v1/workspaces/${slug}/projects/${pid}${path}`, { method: "DELETE", headers });
  return res.status;
}

const [issues, modules, cycles] = await Promise.all([getAll("/issues/"), getAll("/modules/"), getAll("/cycles/")]);

console.log(`MODE: ${EXECUTE ? "🔴 EXECUTE (deleting)" : "DRY-RUN (no deletes)"}`);
console.log(`Plane II target: ${issues.length} work items, ${modules.length} modules, ${cycles.length} cycles\n`);
for (const i of issues) console.log(`  issue   II-${i.sequence_id}\t${i.name}`);
for (const m of modules) console.log(`  module  ${m.name}\t(${m.id})`);
for (const c of cycles) console.log(`  cycle   ${c.name}\t(${c.id})`);

if (!EXECUTE) {
  console.log(`\nDry-run only — nothing deleted. Re-run with EXECUTE=1 to delete the above.`);
  process.exit(0);
}

let ok = 0, fail = 0;
const tryDel = async (label: string, path: string) => {
  const s = await del(path);
  if (s === 204 || s === 200) { ok++; } else { fail++; console.error(`  FAIL ${label} -> HTTP ${s}`); }
};
for (const i of issues) await tryDel(`issue II-${i.sequence_id}`, `/issues/${i.id}/`);
for (const m of modules) await tryDel(`module ${m.name}`, `/modules/${m.id}/`);
for (const c of cycles) await tryDel(`cycle ${c.name}`, `/cycles/${c.id}/`);
console.log(`\nDeleted ${ok}, failed ${fail}`);
process.exit(fail === 0 ? 0 : 1);
