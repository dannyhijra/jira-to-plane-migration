import { readFileSync, writeFileSync, renameSync } from "node:fs";

const env = await Bun.file(".env").text();
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const base = process.env.PLANE_BASE_URL!;
const ws = process.env.PLANE_WORKSPACE_SLUG || "hijra";
const key = process.env.PLANE_API_KEY!;
const projId = "ef603ac8-09d4-413f-ab6e-b9aea65af65a";

const manifestPath = "state/manifest.jsonl";
const raw = readFileSync(manifestPath, "utf8");
const lines = raw.split("\n").filter((l) => l.length > 0);

// Group manifest lines by (jira_key) where jira_key is e.g. "ARH-115#attachment#115381"
// For each duplicate set (>1 ok+uploaded entries), keep the FIRST plane_id (oldest manifest line),
// delete the rest from Plane, prune their manifest lines.
type Entry = { idx: number; obj: any };
const byKey = new Map<string, Entry[]>();
lines.forEach((line, idx) => {
  const o = JSON.parse(line);
  if (
    o.project === "ARH" &&
    o.entity === "attachment" &&
    o.status === "ok" &&
    o.notes === "uploaded"
  ) {
    const k = o.jira_key;
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push({ idx, obj: o });
  }
});

const toDelete: { jira_key: string; plane_id: string; idx: number }[] = [];
const keptByKey = new Map<string, string>();
for (const [k, entries] of byKey.entries()) {
  if (entries.length <= 1) continue;
  // Keep the first (oldest) by manifest order; delete the rest.
  keptByKey.set(k, entries[0].obj.plane_id);
  for (let i = 1; i < entries.length; i++) {
    toDelete.push({ jira_key: k, plane_id: entries[i].obj.plane_id, idx: entries[i].idx });
  }
}
console.log(`Plane attachments to delete: ${toDelete.length}`);

// Need the parent work_item plane_id for the DELETE URL.
// Pull from manifest where entity=work_item and jira_key matches the stripped prefix.
const workItemByJira = new Map<string, string>();
for (const line of lines) {
  const o = JSON.parse(line);
  if (o.project === "ARH" && o.entity === "work_item" && o.status === "ok") {
    workItemByJira.set(o.jira_key, o.plane_id);
  }
}

let deleted = 0;
let failed = 0;
const failedDetail: string[] = [];
const droppedIdx = new Set<number>();
for (const d of toDelete) {
  const issueJiraKey = d.jira_key.split("#")[0]; // "ARH-115"
  const wid = workItemByJira.get(issueJiraKey);
  if (!wid) {
    failed++;
    failedDetail.push(`${d.jira_key}: no work_item plane_id`);
    continue;
  }
  const url = `${base}/api/assets/v2/workspaces/${ws}/projects/${projId}/issues/${wid}/attachments/${d.plane_id}/`;
  const cookie = process.env.PLANE_COOKIE_HEADER ?? "";
  const csrf = process.env.PLANE_CSRF_TOKEN ?? "";
  const args = [
    "-sS", "-X", "DELETE",
    "-o", "/dev/null", "-w", "%{http_code}",
    "-H", `x-api-key: ${key}`,
    "-H", `accept: application/json`,
    "-H", `cookie: ${cookie}`,
    "-H", `origin: ${base}`,
    "-H", `referer: ${base}/${ws}/projects/${projId}/issues/`,
    "-H", "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  ];
  if (csrf) {
    args.push("-H", `x-csrftoken: ${csrf}`);
    args.push("-H", `x-xsrf-token: ${csrf}`);
  }
  args.push(url);
  const proc = Bun.spawn(["curl", ...args], { stdout: "pipe", stderr: "pipe" });
  const statusStr = await new Response(proc.stdout).text();
  await proc.exited;
  const code = parseInt(statusStr.trim() || "0", 10);
  const r = { ok: code >= 200 && code < 300, status: code, text: async () => statusStr };
  if (r.ok || r.status === 204) {
    deleted++;
    droppedIdx.add(d.idx);
  } else {
    failed++;
    failedDetail.push(`${d.jira_key} (${d.plane_id}): HTTP ${r.status} ${(await r.text()).slice(0, 80)}`);
  }
}
console.log(`deleted: ${deleted}`);
console.log(`failed:  ${failed}`);
for (const f of failedDetail.slice(0, 5)) console.log("  ·", f);

// Prune the manifest lines for successful deletes.
const newLines = lines.filter((_, i) => !droppedIdx.has(i));
const backupPath = `${manifestPath}.bak-pre-dedupe-${new Date().toISOString().replace(/[:.]/g, "")}`;
writeFileSync(backupPath, raw, "utf8");
writeFileSync(manifestPath + ".tmp", newLines.join("\n") + "\n", "utf8");
renameSync(manifestPath + ".tmp", manifestPath);
console.log(`manifest pruned: ${lines.length - newLines.length} lines removed (backup ${backupPath})`);
