import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface PlaneSession {
  cookieHeader: string | undefined;
  csrfToken: string | undefined;
}

/** Where the Playwright refresher writes harvested credentials. */
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
  } catch {
    // missing / unreadable / malformed file → fall through to env
  }
  return {
    cookieHeader: process.env.PLANE_COOKIE_HEADER || undefined,
    csrfToken: process.env.PLANE_CSRF_TOKEN || undefined,
  };
}
