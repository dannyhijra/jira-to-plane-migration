import { writeFile, readFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { logger } from "../lib/logger";

const LOCK_PATH = "state/.sync.lock";
// A lock older than this is considered stale (a previous run crashed without releasing).
const STALE_MS = 60 * 60 * 1000; // 1 hour

interface LockInfo {
  pid: number;
  startedAt: string;
}

/** Returns true if the lock was acquired, false if another live run holds it. */
export async function acquireLock(): Promise<boolean> {
  if (existsSync(LOCK_PATH)) {
    try {
      const raw = await readFile(LOCK_PATH, "utf8");
      const info = JSON.parse(raw) as LockInfo;
      const age = Date.now() - new Date(info.startedAt).getTime();
      if (age < STALE_MS) {
        logger.error(
          `Sync already running (pid=${info.pid}, started ${info.startedAt}). Exiting.`,
        );
        return false;
      }
      logger.warn(`Stale lock found (age ${Math.round(age / 1000)}s). Reclaiming.`);
    } catch {
      logger.warn("Unreadable lock file. Reclaiming.");
    }
  }
  await mkdir(dirname(LOCK_PATH), { recursive: true });
  const info: LockInfo = { pid: process.pid, startedAt: new Date().toISOString() };
  await writeFile(LOCK_PATH, JSON.stringify(info), "utf8");
  return true;
}

export async function releaseLock(): Promise<void> {
  try {
    if (existsSync(LOCK_PATH)) await unlink(LOCK_PATH);
  } catch (err) {
    logger.warn("Failed to release lock:", err);
  }
}
