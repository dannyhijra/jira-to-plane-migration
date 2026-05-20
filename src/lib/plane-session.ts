import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { logger } from "./logger";

export interface PlaneSession {
  cookieHeader: string | undefined;
  csrfToken: string | undefined;
}

/**
 * Where the Playwright refresher writes harvested credentials. Resolved
 * relative to process.cwd() — consistent with the repo's other state paths
 * (e.g. state/manifest.jsonl); callers run from the repo root.
 */
export const SESSION_FILE = join("state", "plane-session.json");

/**
 * Current Plane upload credentials. Prefers state/plane-session.json (written
 * by scripts/refresh-plane-session.ts); falls back to the PLANE_COOKIE_HEADER /
 * PLANE_CSRF_TOKEN env vars so the legacy manual workflow still works. Read
 * fresh on every call (no caching) so a mid-run refresh is picked up. The
 * `filePath` argument exists for tests.
 */
export function currentSession(filePath: string = SESSION_FILE): PlaneSession {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      cookieHeader?: string;
      csrfToken?: string;
    };
    if (parsed.cookieHeader) {
      return {
        cookieHeader: parsed.cookieHeader,
        csrfToken: parsed.csrfToken || undefined,
      };
    }
  } catch (err) {
    // ENOENT is the normal "no file yet" case → silently use env. Any other
    // error means the file exists but is unreadable/malformed; warn so a stale
    // fallback is debuggable, then still fall through to env.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn(`plane-session.json unreadable/malformed, falling back to env: ${String(err)}`);
    }
  }
  return {
    cookieHeader: process.env.PLANE_COOKIE_HEADER || undefined,
    csrfToken: process.env.PLANE_CSRF_TOKEN || undefined,
  };
}

let inFlight: Promise<PlaneSession> | null = null;

export type RefreshRunner = () => Promise<void>;

/** Default runner: spawn the Playwright refresher as a subprocess so this
 *  module never imports Playwright. Inherits stdio so its logs surface. */
const defaultRunner: RefreshRunner = () =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("bun", ["scripts/refresh-plane-session.ts"], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `refresh-plane-session exited ${code} — Google session may be expired; ` +
              `run: bun scripts/refresh-plane-session.ts --login`,
          ),
        );
    });
  });

/**
 * Re-mint the Plane session by running the refresher, then reload credentials.
 * Single-flight: concurrent callers share one run so we never launch two
 * browsers. `runner` and `filePath` are injectable for tests.
 */
export function refreshSession(
  runner: RefreshRunner = defaultRunner,
  filePath: string = SESSION_FILE,
): Promise<PlaneSession> {
  if (inFlight) return inFlight;
  inFlight = runner()
    .then(() => currentSession(filePath))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
