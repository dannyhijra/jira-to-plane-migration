# Auto-refreshing Plane session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual ~24h DevTools cookie copy-paste for attachment uploads with a Playwright-backed session that auto-refreshes on 401/403.

**Architecture:** A persistent Playwright Chromium profile (`state/.plane-browser/`) holds the one-time Google SSO login. A standalone refresher script harvests fresh cookies into `state/plane-session.json`. A session provider (`src/lib/plane-session.ts`, no Playwright import) reads file-over-env and spawns the refresher single-flight. `PlaneClient.uploadAttachment` reads creds per-call and, on an auth 401/403, refreshes once and retries — falling through to the existing placeholder behavior if that fails.

**Tech Stack:** TypeScript on Bun (no build step), `playwright` (devDependency), system `curl` (unchanged), `bun:test`.

---

## File Structure

- **Create** `src/lib/plane-session.ts` — session provider: `currentSession()`, `refreshSession()`, `withSessionRetry()`. No Playwright import.
- **Create** `src/lib/plane-session.test.ts` — unit tests for the provider + retry helper.
- **Create** `scripts/refresh-plane-session.ts` — the ONLY Playwright consumer. `--login` (headed, one-time SSO) / default (headless harvest).
- **Modify** `src/clients/plane.ts` — add `authFailure` to `PlaneAttachmentStorageError`; split `uploadAttachment` into `attemptUpload` (reads provider creds) + a `withSessionRetry` wrapper; drop the unused cookie fields.
- **Modify** `package.json` — add `"test": "bun test"` script and `playwright` devDependency.
- **Modify** `.gitignore` — ignore `state/.plane-browser/` and `state/plane-session.json`.
- **Modify** `.env.example` — document the new one-time `--login` flow; mark the env vars as optional fallback.

Unchanged: `src/migrators/attachments.ts` (its `catch (PlaneAttachmentStorageError)` placeholder fallback still works — adding `authFailure` keeps `backendDown` semantics), `src/lib/config.ts` (the env fields stay as a representation; the provider reads `process.env` directly), and the 3-step `assets/v2` curl flow.

---

### Task 1: Project setup — test script + Playwright devDependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the `test` script and `playwright` devDependency**

Edit `package.json` so `scripts` and `devDependencies` read exactly:

```json
  "scripts": {
    "migrate": "bun run src/cli.ts",
    "typecheck": "tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": {
    "yaml": "^2.5.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "playwright": "^1.48.0",
    "typescript": "^5.5.0"
  }
```

- [ ] **Step 2: Install dependencies and the Chromium browser**

Run:
```bash
bun install
bunx playwright install chromium
```
Expected: `bun install` adds `playwright`; `playwright install chromium` downloads a Chromium build (one-time, ~150MB) and prints a success/already-installed line.

- [ ] **Step 3: Verify the test runner works (no tests yet)**

Run: `bun test`
Expected: exits 0 with "0 tests" (or "No tests found") — confirms the runner is wired before we write tests.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore(attachments): add bun test script and playwright devDependency"
```
(If `bun.lockb` is absent, just `git add package.json`.)

---

### Task 2: Session provider — `currentSession()`

**Files:**
- Create: `src/lib/plane-session.ts`
- Test: `src/lib/plane-session.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/plane-session.test.ts`:

```ts
import { test, expect, afterEach } from "bun:test";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentSession } from "./plane-session";

const origCookie = process.env.PLANE_COOKIE_HEADER;
const origCsrf = process.env.PLANE_CSRF_TOKEN;
afterEach(() => {
  process.env.PLANE_COOKIE_HEADER = origCookie;
  process.env.PLANE_CSRF_TOKEN = origCsrf;
});

test("currentSession prefers the session file over env", () => {
  const dir = mkdtempSync(join(tmpdir(), "psess-"));
  const file = join(dir, "plane-session.json");
  writeFileSync(file, JSON.stringify({ cookieHeader: "session=FILE", csrfToken: "CSRF_FILE" }));
  process.env.PLANE_COOKIE_HEADER = "session=ENV";
  process.env.PLANE_CSRF_TOKEN = "CSRF_ENV";
  const s = currentSession(file);
  expect(s.cookieHeader).toBe("session=FILE");
  expect(s.csrfToken).toBe("CSRF_FILE");
  rmSync(dir, { recursive: true, force: true });
});

test("currentSession falls back to env when the file is absent", () => {
  process.env.PLANE_COOKIE_HEADER = "session=ENV";
  process.env.PLANE_CSRF_TOKEN = "CSRF_ENV";
  const s = currentSession(join(tmpdir(), "psess-missing-1.json"));
  expect(s.cookieHeader).toBe("session=ENV");
  expect(s.csrfToken).toBe("CSRF_ENV");
});

test("currentSession returns undefined when neither file nor env present", () => {
  delete process.env.PLANE_COOKIE_HEADER;
  delete process.env.PLANE_CSRF_TOKEN;
  const s = currentSession(join(tmpdir(), "psess-missing-2.json"));
  expect(s.cookieHeader).toBeUndefined();
  expect(s.csrfToken).toBeUndefined();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/lib/plane-session.test.ts`
Expected: FAIL — `Cannot find module './plane-session'` / `currentSession is not a function`.

- [ ] **Step 3: Implement `currentSession`**

Create `src/lib/plane-session.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test src/lib/plane-session.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plane-session.ts src/lib/plane-session.test.ts
git commit -m "feat(attachments): add Plane session provider with file-over-env precedence"
```

---

### Task 3: Session provider — `refreshSession()` single-flight

**Files:**
- Modify: `src/lib/plane-session.ts`
- Test: `src/lib/plane-session.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/plane-session.test.ts`:

```ts
import { refreshSession } from "./plane-session";

test("refreshSession runs the refresher once for concurrent callers", async () => {
  let calls = 0;
  const runner = () => {
    calls++;
    return new Promise<void>((r) => setTimeout(r, 20));
  };
  const file = join(tmpdir(), "psess-single.json");
  const [a, b] = await Promise.all([
    refreshSession(runner, file),
    refreshSession(runner, file),
  ]);
  expect(calls).toBe(1);
  expect(a.cookieHeader).toBe(b.cookieHeader);
});

test("refreshSession can run again after the previous run settles", async () => {
  let calls = 0;
  const runner = () => {
    calls++;
    return Promise.resolve();
  };
  const file = join(tmpdir(), "psess-seq.json");
  await refreshSession(runner, file);
  await refreshSession(runner, file);
  expect(calls).toBe(2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/lib/plane-session.test.ts`
Expected: FAIL — `refreshSession is not a function` / import error.

- [ ] **Step 3: Implement `refreshSession`**

Append to `src/lib/plane-session.ts` (add `import { spawn } from "node:child_process";` to the top import group):

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test src/lib/plane-session.test.ts`
Expected: PASS — 5 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plane-session.ts src/lib/plane-session.test.ts
git commit -m "feat(attachments): add single-flight refreshSession that spawns the refresher"
```

---

### Task 4: Session provider — `withSessionRetry()` helper

**Files:**
- Modify: `src/lib/plane-session.ts`
- Test: `src/lib/plane-session.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/plane-session.test.ts`:

```ts
import { withSessionRetry } from "./plane-session";

const isAuth = (e: unknown) => e instanceof Error && e.message === "AUTH";

test("withSessionRetry returns first result without refreshing on success", async () => {
  let attempts = 0;
  let refreshes = 0;
  const out = await withSessionRetry(
    async () => {
      attempts++;
      return "ok";
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  expect(out).toBe("ok");
  expect(attempts).toBe(1);
  expect(refreshes).toBe(0);
});

test("withSessionRetry refreshes once and retries on auth failure", async () => {
  let attempts = 0;
  let refreshes = 0;
  const out = await withSessionRetry(
    async () => {
      attempts++;
      if (attempts === 1) throw new Error("AUTH");
      return "ok";
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  expect(out).toBe("ok");
  expect(attempts).toBe(2);
  expect(refreshes).toBe(1);
});

test("withSessionRetry propagates a second auth failure after one retry", async () => {
  let attempts = 0;
  let refreshes = 0;
  const run = withSessionRetry(
    async () => {
      attempts++;
      throw new Error("AUTH");
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  await expect(run).rejects.toThrow("AUTH");
  expect(attempts).toBe(2);
  expect(refreshes).toBe(1);
});

test("withSessionRetry does not refresh on non-auth errors", async () => {
  let attempts = 0;
  let refreshes = 0;
  const run = withSessionRetry(
    async () => {
      attempts++;
      throw new Error("OTHER");
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  await expect(run).rejects.toThrow("OTHER");
  expect(attempts).toBe(1);
  expect(refreshes).toBe(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/lib/plane-session.test.ts`
Expected: FAIL — `withSessionRetry is not a function` / import error.

- [ ] **Step 3: Implement `withSessionRetry`**

Append to `src/lib/plane-session.ts`:

```ts
/**
 * Run an upload attempt; if it fails an auth/session check, refresh the session
 * once and retry exactly once. Any non-auth error propagates immediately, and a
 * second auth failure propagates too (no infinite loop). Pure orchestration (no
 * I/O) so it is unit-testable. `refresh` is responsible for translating its own
 * failures into the error type the caller expects.
 */
export async function withSessionRetry<T>(
  attempt: () => Promise<T>,
  isAuthFailure: (err: unknown) => boolean,
  refresh: () => Promise<void>,
): Promise<T> {
  try {
    return await attempt();
  } catch (err) {
    if (!isAuthFailure(err)) throw err;
    await refresh();
    return await attempt();
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test src/lib/plane-session.test.ts`
Expected: PASS — 9 tests total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plane-session.ts src/lib/plane-session.test.ts
git commit -m "feat(attachments): add withSessionRetry refresh-and-retry-once helper"
```

---

### Task 5: Wire the provider into `PlaneClient.uploadAttachment`

**Files:**
- Modify: `src/clients/plane.ts` (imports; `PlaneAttachmentStorageError` lines ~500-511; constructor lines 76-77 & 83-84; `uploadAttachment` lines 296-418)

- [ ] **Step 1: Add imports**

At the top of `src/clients/plane.ts`, below the existing `import { withRetry } from "../lib/retry";` line, add:

```ts
import { logger } from "../lib/logger";
import { currentSession, refreshSession, withSessionRetry } from "../lib/plane-session";
```

- [ ] **Step 2: Add `authFailure` to `PlaneAttachmentStorageError`**

Replace the `PlaneAttachmentStorageError` class (currently lines ~500-511) with:

```ts
export class PlaneAttachmentStorageError extends Error {
  /** True when the failure indicates the backend itself is unreachable/down,
   *  vs a per-file issue like 413 (file too large) where the next attachment
   *  could still succeed. The migrator uses this to decide whether to trip
   *  into placeholder-only mode for the rest of the run. */
  readonly backendDown: boolean;
  /** True when the failure is an auth/session rejection (401/403 or a missing
   *  cookie) that re-minting the session might fix. uploadAttachment uses this
   *  to decide whether to refresh-and-retry. */
  readonly authFailure: boolean;
  constructor(message: string, opts: { backendDown?: boolean; authFailure?: boolean } = {}) {
    super(message);
    this.name = "PlaneAttachmentStorageError";
    this.backendDown = opts.backendDown ?? true;
    this.authFailure = opts.authFailure ?? false;
  }
}
```

(The existing `{ backendDown: false }` call sites keep working: `backendDown ?? true` preserves the old default.)

- [ ] **Step 3: Drop the unused cookie fields from the class + constructor**

Delete these two field declarations (lines 76-77):

```ts
  private readonly cookieHeader: string | undefined;
  private readonly csrfToken: string | undefined;
```

And delete these two constructor assignments (lines 83-84):

```ts
    this.cookieHeader = config.plane.cookieHeader;
    this.csrfToken = config.plane.csrfToken;
```

- [ ] **Step 4: Rename the upload body to `attemptUpload` and source creds from the provider**

Replace the `uploadAttachment` method signature/preamble (lines 296-311) so the method is renamed to `private async attemptUpload` and reads creds from `currentSession()`:

```ts
  private async attemptUpload(
    projectId: string,
    workItemId: string,
    blob: Blob,
    filename: string,
    mimeType: string,
  ): Promise<{ id: string }> {
    const { cookieHeader: cookie, csrfToken: csrf } = currentSession();
    if (!cookie) {
      throw new PlaneAttachmentStorageError(
        "no Plane session cookie — run: bun scripts/refresh-plane-session.ts --login (or set PLANE_COOKIE_HEADER)",
        { authFailure: true },
      );
    }

    const size = blob.size;
```

(Everything from `// Step 1: register the asset...` downward stays as-is, except Step 5 below. Note the old `const cookie = this.cookieHeader; const csrf = this.csrfToken;` lines are removed by this replacement.)

- [ ] **Step 5: Mark the 401/403 throw as an auth failure**

Replace the 401/403 block (lines 335-339) with:

```ts
    if (step1.status === 401 || step1.status === 403) {
      throw new PlaneAttachmentStorageError(
        `assets/v2 step 1 ${step1.status} (auth/session expired)`,
        { authFailure: true },
      );
    }
```

- [ ] **Step 6: Add the public `uploadAttachment` wrapper**

Immediately after the `attemptUpload` method's closing brace (the `return { id: reg.asset_id }; }` that was line 417-418), add the new public method:

```ts
  /**
   * Upload an attachment to a work item. On an auth/session rejection, refreshes
   * the Plane session once (via the Playwright refresher) and retries once. A
   * refresh failure or a second rejection surfaces as a PlaneAttachmentStorageError
   * so the migrator's placeholder fallback handles it — the run never crashes.
   */
  async uploadAttachment(
    projectId: string,
    workItemId: string,
    blob: Blob,
    filename: string,
    mimeType: string,
  ): Promise<{ id: string }> {
    return withSessionRetry(
      () => this.attemptUpload(projectId, workItemId, blob, filename, mimeType),
      (err) => err instanceof PlaneAttachmentStorageError && err.authFailure,
      async () => {
        logger.warn("Plane session rejected — refreshing via Playwright and retrying once");
        try {
          await refreshSession();
        } catch (err) {
          throw new PlaneAttachmentStorageError(
            `session refresh failed: ${(err as Error).message}`,
            { backendDown: true },
          );
        }
      },
    );
  }
```

- [ ] **Step 7: Typecheck and run the full test suite**

Run: `bun run typecheck && bun test`
Expected: `tsc --noEmit` reports no errors; `bun test` PASS (9 tests). If tsc flags the `cookie` type, confirm the `if (!cookie) throw` narrows it to `string` before the curl calls.

- [ ] **Step 8: Commit**

```bash
git add src/clients/plane.ts
git commit -m "feat(attachments): refresh Plane session and retry once on upload 401/403"
```

---

### Task 6: Playwright refresher script

**Files:**
- Create: `scripts/refresh-plane-session.ts`

- [ ] **Step 1: Write the refresher script**

Create `scripts/refresh-plane-session.ts`:

```ts
/**
 * Mints/refreshes Plane upload credentials into state/plane-session.json using
 * a persistent Playwright Chromium profile that holds the Google SSO login.
 *
 *   bun scripts/refresh-plane-session.ts --login   # one-time: do Google SSO in a window
 *   bun scripts/refresh-plane-session.ts           # headless: harvest fresh cookies
 *
 * Reads PLANE_BASE_URL and PLANE_WORKSPACE_SLUG from the environment (Bun loads
 * .env automatically). This is the ONLY file that imports Playwright.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROFILE_DIR = join("state", ".plane-browser");
const SESSION_FILE = join("state", "plane-session.json");

const baseUrl = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "";
if (!baseUrl || !slug) {
  console.error("PLANE_BASE_URL and PLANE_WORKSPACE_SLUG must be set");
  process.exit(1);
}

const loginMode = process.argv.includes("--login");
const homeUrl = `${baseUrl}/${slug}`;

mkdirSync(PROFILE_DIR, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: !loginMode,
});
try {
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (loginMode) {
    console.error("Complete Google sign-in in the browser window — waiting up to 5 min…");
    await page.waitForURL(`${homeUrl}**`, { timeout: 300_000 });
  } else {
    // Headless: if we landed on a sign-in / Google page, the saved Google
    // session expired and we cannot recover without a human.
    const url = page.url();
    if (/sign-in|accounts\.google\.com|\/login/.test(url)) {
      console.error(
        `not logged in (landed on ${url}) — run: bun scripts/refresh-plane-session.ts --login`,
      );
      await ctx.close();
      process.exit(1);
    }
  }

  const cookies = await ctx.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const csrfToken = cookies.find((c) => c.name === "csrftoken")?.value;
  if (!csrfToken && !/session/i.test(cookieHeader)) {
    console.error("no Plane session cookies found after navigation — try --login");
    await ctx.close();
    process.exit(1);
  }

  writeFileSync(
    SESSION_FILE,
    JSON.stringify({ cookieHeader, csrfToken, capturedAt: new Date().toISOString() }, null, 2),
  );
  console.error(`wrote ${SESSION_FILE} (${cookies.length} cookies)`);
} finally {
  await ctx.close();
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: no errors. (`scripts/` is outside the tsconfig `include`, so this mainly confirms the import resolves; if Playwright types complain, ensure `bun install` from Task 1 completed.)

- [ ] **Step 3: One-time login — manual verification (headed)**

Run: `bun scripts/refresh-plane-session.ts --login`
Expected: a Chromium window opens at the Plane workspace; complete Google SSO; the script prints `wrote state/plane-session.json (N cookies)` and exits 0.

Then confirm the file:
```bash
cat state/plane-session.json
```
Expected: JSON with a non-empty `cookieHeader`, a `csrfToken`, and a recent `capturedAt`.

- [ ] **Step 4: Headless refresh — manual verification**

Run: `bun scripts/refresh-plane-session.ts`
Expected: no window; prints `wrote state/plane-session.json (N cookies)`; exits 0; `capturedAt` updates to a newer timestamp.

- [ ] **Step 5: Commit**

```bash
git add scripts/refresh-plane-session.ts
git commit -m "feat(attachments): add Playwright session refresher (--login / headless)"
```

---

### Task 7: Ignore runtime artifacts + document the new flow

**Files:**
- Modify: `.gitignore`
- Modify: `.env.example`

- [ ] **Step 1: Ignore the browser profile and creds file**

Add to `.gitignore`, just below the existing `state/failures.jsonl` line:

```
state/.plane-browser/
state/plane-session.json
```

- [ ] **Step 2: Confirm they are ignored**

Run: `git status --short state/`
Expected: neither `state/.plane-browser/` nor `state/plane-session.json` appears (both ignored). The `state/manifest.jsonl` etc. remain ignored as before.

- [ ] **Step 3: Update `.env.example`**

Replace the attachment comment block + the two vars (lines 11-20) with:

```
# Attachments only: the assets/v2 upload endpoint is gated to logged-in users
# and Cloudflare challenges scripted clients. Credentials are now managed
# automatically by a persistent Playwright browser profile.
#
# One-time setup (Google SSO in a real browser window):
#   bunx playwright install chromium
#   bun scripts/refresh-plane-session.ts --login
#
# After that the migrator auto-refreshes the session on 401/403 (headless) and
# writes state/plane-session.json. Leave the two vars below BLANK in normal use.
# They are an optional last-resort fallback: paste a `cookie:` header captured
# from Chrome DevTools (Network → an upload request) if Playwright is unavailable.
PLANE_COOKIE_HEADER=
PLANE_CSRF_TOKEN=
```

- [ ] **Step 4: Final verification — typecheck + tests**

Run: `bun run typecheck && bun test`
Expected: tsc clean; `bun test` PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add .gitignore .env.example
git commit -m "docs(attachments): ignore session artifacts and document --login bootstrap"
```

---

## Self-Review

**Spec coverage:**
- File-over-env precedence → Task 2. ✓
- Single-flight refresh, no Playwright import in provider → Task 3 (uses `spawn`). ✓
- Lazy 401/403 refresh-and-retry-once → Task 4 (`withSessionRetry`) + Task 5 (wiring). ✓
- Existing placeholder fallback untouched → Task 5 wraps refresh failures and second auth failures as `PlaneAttachmentStorageError` so the migrator's `instanceof` catch still handles them; migrator file unchanged. ✓
- Refresher `--login` headed / default headless, mints via `${PLANE_BASE_URL}/${PLANE_WORKSPACE_SLUG}` → Task 6. ✓
- Creds file schema (`cookieHeader`, `csrfToken`, `capturedAt`) → Task 6 write. ✓
- Playwright as devDependency + `chromium` install → Task 1. ✓
- gitignore `state/.plane-browser/` + `state/plane-session.json` → Task 7. ✓
- `.env.example` fallback note + `--login` hint in error messages → Tasks 5, 6, 7. ✓
- Full-SSO-expiry → clear "run --login" message → Task 3 runner + Task 6 headless branch. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code; every command has expected output.

**Type consistency:** `PlaneSession { cookieHeader, csrfToken }` used identically in `currentSession`, `refreshSession`, and `attemptUpload`'s destructure. `withSessionRetry<T>(attempt, isAuthFailure, refresh)` signature matches its call in `uploadAttachment`. `PlaneAttachmentStorageError` opts widened to `{ backendDown?, authFailure? }` — existing `{ backendDown: false }` call sites remain valid. `SESSION_FILE` exported once, reused.

## Open questions

None.
