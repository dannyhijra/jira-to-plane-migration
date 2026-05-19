/**
 * One-shot cleanup for HIJ placeholder attachments.
 *
 * For every manifest entry where entity=attachment, project=HIJ, status=ok, notes=placeholder
 * (and the line is the most-recent entry for that jira_key):
 *   1. DELETE the placeholder comment from Plane
 *   2. APPEND a new manifest entry with status=deleted_placeholder
 *      → loadManifest's last-wins map will surface this new entry, so
 *        hasMigrated() returns false for that key, and the next
 *        `migrate --only attachments --resume` will re-attempt the upload.
 *
 * The original placeholder lines are NOT rewritten — the manifest stays append-only.
 */
import { loadConfig } from '../src/lib/config';

await loadConfig();
const planeKey = process.env.PLANE_API_KEY!;
const planeBase = process.env.PLANE_BASE_URL!;
const ws = process.env.PLANE_WORKSPACE_SLUG || 'hijra';
const projId = 'e89c3f8b-5603-41af-9187-11638d1f65ce';

const manifestText = await Bun.file('state/manifest.jsonl').text();
const lines = manifestText.split('\n');

// Build (jira_key → most recent entry) so we only touch placeholders that haven't already been superseded.
const latestAttByKey = new Map<string, any>();
const wiMap = new Map<string, string>();
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const e = JSON.parse(line);
    if (e.project !== 'HIJ') continue;
    if (e.entity === 'attachment' && e.jira_key)
      latestAttByKey.set(e.jira_key, e);
    else if (
      e.entity === 'work_item' &&
      e.status === 'ok' &&
      e.jira_key &&
      e.plane_id
    )
      wiMap.set(e.jira_key, e.plane_id);
  } catch {}
}

type Job = { entry: any; workItemPlaneId: string };
const jobs: Job[] = [];
for (const [jiraKey, e] of latestAttByKey) {
  if (e.status !== 'ok' || e.notes !== 'placeholder') continue;
  const baseJiraKey = String(jiraKey).split('#')[0];
  const wiPlaneId = wiMap.get(baseJiraKey);
  if (!wiPlaneId) {
    console.warn(`SKIP ${jiraKey} — no work_item map for ${baseJiraKey}`);
    continue;
  }
  if (!e.plane_id) {
    console.warn(`SKIP ${jiraKey} — entry has no plane_id`);
    continue;
  }
  jobs.push({ entry: e, workItemPlaneId: wiPlaneId });
}

console.log(`Found ${jobs.length} HIJ placeholder attachments to clean up`);

let deleted = 0;
let alreadyGone = 0;
let failedDeletes = 0;
const newEntries: string[] = [];

for (const job of jobs) {
  const url = `${planeBase}/api/v1/workspaces/${ws}/projects/${projId}/issues/${job.workItemPlaneId}/comments/${job.entry.plane_id}/`;
  let ok = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, {
      method: 'DELETE',
      headers: { 'X-API-Key': planeKey }
    });
    if (r.status === 429) {
      const ra = parseInt(r.headers.get('retry-after') ?? '0', 10);
      await new Promise((res) =>
        setTimeout(res, Math.max(ra * 1000, 1000 * (attempt + 1)))
      );
      continue;
    }
    if (r.status === 204 || r.status === 200) {
      ok = true;
      deleted++;
      break;
    }
    if (r.status === 404) {
      ok = true;
      alreadyGone++;
      break;
    }
    const body = await r.text();
    console.warn(
      `DELETE ${job.entry.jira_key} → ${r.status}: ${body.slice(0, 200)}`
    );
    break;
  }
  if (ok) {
    newEntries.push(
      JSON.stringify({
        entity: 'attachment',
        project: 'HIJ',
        jira_key: job.entry.jira_key,
        status: 'deleted_placeholder',
        at: new Date().toISOString(),
        notes: 'placeholder_deleted_for_retry'
      })
    );
  } else {
    failedDeletes++;
  }
  const total = deleted + alreadyGone + failedDeletes;
  if (total % 50 === 0)
    console.log(
      `...progress: deleted=${deleted} alreadyGone=${alreadyGone} failed=${failedDeletes} (of ${jobs.length})`
    );
  await new Promise((res) => setTimeout(res, 50));
}

if (newEntries.length > 0) {
  const append = newEntries.join('\n') + '\n';
  // Read current manifest text (in case the migrator appended anything since we started — unlikely
  // here since we hold the only run, but safer).
  const current = await Bun.file('state/manifest.jsonl').text();
  await Bun.write('state/manifest.jsonl', current + append);
}

console.log(
  `\nDone. deleted=${deleted} alreadyGone=${alreadyGone} failedDeletes=${failedDeletes}`
);
console.log(
  `Manifest appended with ${newEntries.length} deleted_placeholder entries.`
);
