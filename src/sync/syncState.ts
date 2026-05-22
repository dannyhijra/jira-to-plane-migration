import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const SYNC_STATE_PATH = "state/sync-state.json";

export interface ProjectSyncRun {
  issues_created: number;
  issues_updated: number;
  comments_created: number;
  attachments_created: number;
  failed: number;
  duration_ms: number;
  delta_from: string;
}

export interface ProjectSyncState {
  last_sync_at: string | null;
  last_sync_status: "ok" | "partial" | "error" | null;
  last_run: ProjectSyncRun | null;
}

export interface SyncStateFile {
  version: 1;
  projects: Record<string, ProjectSyncState>;
}

const EMPTY: SyncStateFile = { version: 1, projects: {} };

export async function loadSyncState(): Promise<SyncStateFile> {
  if (!existsSync(SYNC_STATE_PATH)) return structuredClone(EMPTY);
  try {
    const raw = await readFile(SYNC_STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SyncStateFile;
    if (!parsed.projects) return structuredClone(EMPTY);
    return parsed;
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function getProjectState(project: string): Promise<ProjectSyncState | null> {
  const state = await loadSyncState();
  return state.projects[project] ?? null;
}

export async function saveProjectState(
  project: string,
  update: ProjectSyncState,
): Promise<void> {
  const state = await loadSyncState();
  state.projects[project] = update;
  await mkdir(dirname(SYNC_STATE_PATH), { recursive: true });
  await writeFile(SYNC_STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}
