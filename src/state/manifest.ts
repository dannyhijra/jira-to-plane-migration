import { appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { ManifestEntry, Entity } from "./types";

const MANIFEST_PATH = "state/manifest.jsonl";
const FAILURES_PATH = "state/failures.jsonl";

/** In-memory index of already-migrated entries, keyed by `${entity}:${jira_key}`. Loaded lazily. */
let cache: Map<string, ManifestEntry> | null = null;

function keyOf(entity: Entity, jiraKey: string): string {
  return `${entity}:${jiraKey}`;
}

export async function loadManifest(): Promise<Map<string, ManifestEntry>> {
  if (cache) return cache;
  cache = new Map();
  if (!existsSync(MANIFEST_PATH)) return cache;

  const raw = await readFile(MANIFEST_PATH, "utf8");
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line) as ManifestEntry;
      cache.set(keyOf(entry.entity, entry.jira_key), entry);
    } catch {
      // Skip malformed lines but don't fail — manifest is append-only and a partial write could happen
    }
  }
  return cache;
}

export async function hasMigrated(entity: Entity, jiraKey: string): Promise<boolean> {
  const m = await loadManifest();
  const entry = m.get(keyOf(entity, jiraKey));
  return entry?.status === "ok";
}

export async function getEntry(entity: Entity, jiraKey: string): Promise<ManifestEntry | undefined> {
  const m = await loadManifest();
  return m.get(keyOf(entity, jiraKey));
}

export async function append(entry: ManifestEntry): Promise<void> {
  const line = JSON.stringify(entry) + "\n";
  await appendFile(MANIFEST_PATH, line, "utf8");
  if (entry.status === "failed") {
    await appendFile(FAILURES_PATH, line, "utf8");
  }
  // Keep the in-memory cache in sync
  const m = await loadManifest();
  m.set(keyOf(entry.entity, entry.jira_key), entry);
}

export async function summary(project: string): Promise<{ ok: number; failed: number; skipped: number }> {
  const m = await loadManifest();
  let ok = 0,
    failed = 0,
    skipped = 0;
  for (const entry of m.values()) {
    if (entry.project !== project) continue;
    if (entry.status === "ok") ok++;
    else if (entry.status === "failed") failed++;
    else if (entry.status === "skipped") skipped++;
  }
  return { ok, failed, skipped };
}
