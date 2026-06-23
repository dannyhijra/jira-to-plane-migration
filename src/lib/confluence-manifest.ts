// Append-only manifest shared by the Confluence PDF exporters.
//
// One JSON line per page export. Keyed by pageId (last line wins). The local
// exporter records `file` + `bytes`; the Drive exporter records `driveFileId` +
// `target:"drive"`. A re-run skips a page whose recorded version is still
// current for the SAME target.
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";

export const MANIFEST = "state/confluence-manifest.jsonl";

export interface ManifestEntry {
  ts: string;
  spaceKey: string;
  pageId: string;
  version: number;
  title: string;
  /** "disk" (default, local PDF) or "drive" (uploaded to Google Drive). */
  target?: "disk" | "drive";
  /** Path relative to outDir — present for disk targets. */
  file?: string;
  /** Google Drive file id — present for drive targets. */
  driveFileId?: string;
  status: "ok" | "failed";
  bytes?: number;
  error?: string;
}

/** Load the manifest into a pageId → latest-entry map (last line wins). */
export async function loadManifest(): Promise<Map<string, ManifestEntry>> {
  const map = new Map<string, ManifestEntry>();
  let raw: string;
  try {
    raw = await readFile(MANIFEST, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return map;
    throw err;
  }
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as ManifestEntry;
      map.set(e.pageId, e);
    } catch {
      /* skip malformed line */
    }
  }
  return map;
}

export async function appendManifest(entry: ManifestEntry): Promise<void> {
  await mkdir(dirname(MANIFEST), { recursive: true });
  await appendFile(MANIFEST, JSON.stringify(entry) + "\n");
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
