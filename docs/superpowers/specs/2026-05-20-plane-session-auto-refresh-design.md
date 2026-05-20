# Auto-refreshing Plane session for attachment uploads

- **Date:** 2026-05-20
- **Status:** Approved (design) — pending implementation plan
- **Topic:** Eliminate manual `PLANE_COOKIE_HEADER` / `PLANE_CSRF_TOKEN` refresh during attachment migration.

## Problem

The attachment migrator (`src/clients/plane.ts:uploadAttachment`) shells out to system `curl` against Plane's `assets/v2` endpoint, which is gated to logged-in users. It passes `-b "<PLANE_COOKIE_HEADER>"` and `-H "x-csrftoken: <PLANE_CSRF_TOKEN>"`, both read from `.env` via `config.ts`. The Plane login session cookie expires roughly every 24h, so today the operator keeps a browser tab active and re-copies the `cookie:` header from DevTools by hand. On a `401/403` the migrator trips into placeholder-only mode after 3 consecutive failures.

System `curl`'s TLS fingerprint already passes Cloudflare Bot Management (per `.env.example`), so the only thing actually expiring is the **Plane login session** (Django session cookie + `csrftoken`) — not Cloudflare `cf_clearance`. The task is therefore "re-mint a login session automatically," not "defeat Cloudflare."

Login to the instance is via **Google / SSO**, which rules out a scripted credential replay.

## Goals

- Operator never copies a cookie from DevTools again during steady-state migration.
- Fresh cookie + CSRF are obtained automatically when the current ones are stale.
- The existing placeholder-fallback safety net is preserved unchanged.
- Playwright is isolated so the lean core client never imports it.

## Non-goals

- Defeating or scripting around Cloudflare (already handled by system `curl`).
- Automating the Google OAuth click-through (SSO requires a human once).
- Changing how attachments themselves are uploaded (the 3-step `assets/v2` curl flow stays identical).

## Locked decisions

| Decision | Choice |
| --- | --- |
| Trigger model | Lazy / on-demand: refresh on `401/403`, retry once |
| Auth strategy | Persistent Playwright Chromium profile holding the Google login |
| Playwright dep | `devDependency` (CLI only ever runs locally) |
| Storage path | `state/.plane-browser/` (profile) + `state/plane-session.json` (creds), both gitignored |
| Mint URL | Workspace home: `${PLANE_BASE_URL}/${PLANE_WORKSPACE_SLUG}` |
| Full SSO expiry | Headless refresh errors with a "run `--login`" message; one-time manual re-auth is acceptable |

## Architecture

Three units with clean seams:

### 1. Refresher script — `scripts/refresh-plane-session.ts`

The **only** file that imports Playwright. Run via `bun`.

- `--login` (headed): launches a real Chromium window via `launchPersistentContext(state/.plane-browser, { headless: false })`, navigates to the workspace home, and waits for the operator to complete Google SSO (`page.waitForURL(\`${baseUrl}/**\`)`). Once authenticated, extracts and writes creds. This is the one-time bootstrap and the rare re-login.
- default (headless): `launchPersistentContext(state/.plane-browser, { headless: true })`, navigates to the workspace home, reusing the saved Google login.
  - If bounced to a sign-in / Google URL → write nothing, exit non-zero, stderr: `Google session expired — run: bun scripts/refresh-plane-session.ts --login`.
  - Otherwise → extract cookies and write the creds file.
- Cookie extraction: `const cookies = await context.cookies()` →
  - `cookieHeader = cookies.map(c => \`${c.name}=${c.value}\`).join("; ")`
  - `csrfToken = cookies.find(c => c.name === "csrftoken")?.value`
- Writes `state/plane-session.json` (see schema), then closes the context.

### 2. Session provider — `src/lib/plane-session.ts`

No Playwright import. Pure I/O + subprocess spawn.

```ts
export interface PlaneSession {
  cookieHeader: string | undefined;
  csrfToken: string | undefined;
}

// Reads state/plane-session.json; falls back to process.env
// (PLANE_COOKIE_HEADER / PLANE_CSRF_TOKEN) when the file is absent.
// Read fresh on every call — no stale cache.
export function currentSession(): PlaneSession;

// Single-flight: spawns `bun scripts/refresh-plane-session.ts`, waits for
// exit, then re-reads the file. Concurrent callers share one in-flight
// promise so only one browser ever launches. Throws if the subprocess
// exits non-zero (e.g. SSO expired).
export function refreshSession(): Promise<PlaneSession>;
```

### 3. `src/clients/plane.ts` integration

- `uploadAttachment` reads creds from `currentSession()` at call time instead of from constructor-cached fields.
- On a step-1 `401/403`, if it has **not** already refreshed during this call: `await refreshSession()`, re-read creds, retry the full 3-step upload **once**.
- If the retry still returns `401/403`, or `refreshSession()` throws (SSO expired / browser failure): throw the **existing** `PlaneAttachmentStorageError({ backendDown: true })`. The migrator's existing 3-strikes placeholder fallback is untouched.

## Data flow

```
migrator → uploadAttachment → currentSession() → curl (3-step assets/v2)
                                   │
                            step-1 401/403 (first time this call)
                                   ▼
                            refreshSession() ──spawn──> bun scripts/refresh-plane-session.ts
                                   │                          │ (headless Chromium, reuses Google login)
                                   │                          ▼
                                   │                    write state/plane-session.json
                                   ▼
                            currentSession() (reloaded) → curl retried once
                                   │
                            still 401/403 OR refresh failed
                                   ▼
                            throw PlaneAttachmentStorageError → existing placeholder fallback
```

## Lifecycle

1. **One-time bootstrap:** `bun scripts/refresh-plane-session.ts --login` → click through Google SSO once → login saved in `state/.plane-browser/`, first `plane-session.json` written.
2. **Steady state:** migration runs; stale cookie → lazy headless refresh → fresh creds → retry. No operator action.
3. **Rare re-login:** Google session fully expires → headless refresh errors with the `--login` hint → operator reruns step 1 once.

`.env` `PLANE_COOKIE_HEADER` / `PLANE_CSRF_TOKEN` become an optional last-resort fallback (left blank in normal use); the provider prefers `plane-session.json`.

## Creds file schema — `state/plane-session.json`

```json
{
  "cookieHeader": "session=...; csrftoken=...; ...",
  "csrfToken": "...",
  "capturedAt": "2026-05-20T10:30:00.000Z"
}
```

`capturedAt` is informational (logging / debugging staleness); freshness is determined reactively by `401/403`, not by reading this timestamp.

## Error handling

| Situation | Behavior |
| --- | --- |
| Headless refresh, not logged in | Refresher exits non-zero with `--login` hint; `refreshSession()` throws; `uploadAttachment` throws existing error → placeholder fallback |
| Browser launch / navigation timeout | Refresher exits non-zero; same as above |
| Concurrent refresh requests | Single-flight: one browser, shared promise (migrator uploads are sequential anyway) |
| Retry still `401/403` | Throw existing `PlaneAttachmentStorageError`; no further refresh attempts this call |
| Creds file + env both empty, no `--login` done | First upload `401/403` → refresh → not logged in → `--login` hint |

The mechanism never wedges a run: every failure path falls through to the placeholder behavior that already exists.

## Testing

- **`plane-session.test.ts`** (`bun:test`):
  - file present → returns file creds (precedence over env);
  - file absent → returns env creds;
  - both absent → `undefined` fields;
  - single-flight: two concurrent `refreshSession()` calls spawn the subprocess once (mocked spawn).
- **`plane.ts` retry logic:** mock `currentSession`/`refreshSession` + curl; simulate step-1 `401` then success → assert one refresh, one retry; simulate persistent `401` → assert existing error thrown, refresh called at most once.
- **Refresher script:** manually verified once against live Plane (live SSO I/O — no meaningful unit test). Verify both `--login` (headed) and default (headless) write a valid `plane-session.json`.

## Dependencies & setup

- Add `playwright` to `devDependencies`.
- One-time: `bunx playwright install chromium`.
- `.gitignore`: add `state/.plane-browser/` and `state/plane-session.json`.
- Confine all Playwright usage to `scripts/refresh-plane-session.ts`; core client only spawns it as a subprocess.

## Out of scope / future

- Proactive (timestamp-based) refresh before expiry — current reactive approach is simpler and sufficient.
- Background `/loop` warming — explicitly rejected (wasteful).
- Reusing the operator's real system Chrome profile — fragile (profile locks); a dedicated Playwright profile is cleaner.

## Open questions

None — all design forks resolved.
