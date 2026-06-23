---
description: Export Confluence pages as native PDF and upload to Google Drive (stage 2 of the Confluence→Google-Drive migration)
argument-hint: [SPACE_KEY...] [--under PAGE_ID] [--limit N] [--dry-run] [--force] [--keep-local]
---

Export Confluence pages as native PDF and upload them to Google Drive via `scripts/confluence-pdf-to-drive.ts`, mirroring the Confluence page tree as nested Drive folders. This is a thin wrapper — the script does the work (enumerate via the Jira token, export via the native `flyingpdf` exporter, upload via the Drive REST API). Do NOT reimplement the export or upload via MCP calls.

Read the **`migration-confluence-drive` skill** for the full auth model, idempotency, and gotchas before a long run.

Arguments: **$ARGUMENTS** — one or more Confluence **space keys** (e.g. `ENG`), plus optional `--under PAGE_ID`, `--limit N`, `--dry-run`, `--force`, `--keep-local`, `--folder <DRIVE_FOLDER_ID>` (override `GOOGLE_DRIVE_FOLDER_ID`).

Same batching model as `/migrate-confluence-pdf` — both knobs compose and every run is idempotent:

- `--limit N` — upload at most N *fresh* pages this run (skips don't count). Re-run to walk the next N. Default batch ≈ **100–150**.
- `--under PAGE_ID` — restrict to one branch (parent + descendants). Folder structure mirrors the full space tree, so branch and full runs merge cleanly. Find a parent id from a `--dry-run` line.

## Prerequisites

1. **Confluence cookie** (expires in hours): set `CONFLUENCE_COOKIE_HEADER` in `.env` (Chrome → DevTools → Network → reload → copy the `cookie:` header). Leave `CONFLUENCE_BASE_URL` **blank** — a value without `/wiki` silently hits Jira and 404s ("dead link" page). `--dry-run` needs neither cookie nor Drive creds.
2. **Google Drive OAuth** (one-time, long-lived): create a **Desktop-app** OAuth client in Google Cloud Console, put its id/secret in `.env` (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`), then run once:

   ```
   bun run scripts/google-auth.ts        # drive.file scope (narrow). Saves GOOGLE_OAUTH_REFRESH_TOKEN to .env
   ```

   If uploads later 403 because the destination folder wasn't created by the app, re-auth with full scope:

   ```
   bun run scripts/google-auth.ts --scope drive
   ```
3. **Destination**: set `GOOGLE_DRIVE_FOLDER_ID` in `.env` (from the folder's URL). Set `GOOGLE_DRIVE_ID` only for a Shared Drive.

## Steps

1. If no space key is given, ask which space(s). Don't guess.
2. **Plan first** — dry-run (no Confluence/Drive writes, no manifest):

   ```
   bun run scripts/confluence-pdf-to-drive.ts <SPACE...> --under <PAGE_ID> --dry-run
   ```

   Report the page count and a sample of target folder paths. Flag size: ~15–20s/page.
3. **Pilot** a few real pages, then confirm they appear in Drive and open correctly:

   ```
   bun run scripts/confluence-pdf-to-drive.ts <SPACE...> --under <PAGE_ID> --limit 5
   ```
4. Confirm with the user, then run in **batches**, re-running the same command until the summary shows everything skipped (that scope is done):

   ```
   bun run scripts/confluence-pdf-to-drive.ts <SPACE...> --under <PAGE_ID> --limit 120
   ```

   Idempotent two ways — the append-only manifest (`state/confluence-manifest.jsonl`, keyed by pageId+version, `target:"drive"`) skips unchanged pages with no work; if the manifest is lost, an existing up-to-date Drive file (matched by `appProperties.confluencePageId`) is detected and the manifest back-filled, so no duplicate. `--force` re-exports and re-uploads.
5. Report the summary line: `N pages · X uploaded · Y skipped · Z failed`. If `failed > 0`, inspect the manifest (`grep '"status":"failed"' state/confluence-manifest.jsonl`) and re-run — successes are skipped on resume.

## Cookie expired mid-run?

The Confluence cookie lasts only hours. On a long run you may see `refresh CONFLUENCE_COOKIE_HEADER` (401/403) and the run stops. Refresh it in `.env` and re-run the same command — the manifest resumes. The Google refresh token does NOT expire mid-run (access tokens auto-refresh in-process).

## Notes / scope

- `--keep-local` also writes each PDF to `confluence-pdf/<SPACE>/…` (default is upload-only). `--out <dir>` changes that path.
- `--page <id>` is a **debug-only** single-page mode: it uploads straight to the destination folder *root*, with NO manifest entry and NO dedupe — re-running creates duplicates. Use only to smoke-test auth; use `--under`/space mode for real work.
- Only `status=current` pages are exported (archived skipped). Confirm if the user wants archived or personal `~user` spaces.

## Never

- Never reimplement the flyingpdf export or the Drive upload via MCP — only the CLI does it.
- Never hand-edit `state/confluence-manifest.jsonl` — the script owns it (append-only).
- Don't commit `.env`, the cookie, or the refresh token.
