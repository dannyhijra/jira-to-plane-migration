---
description: Download Confluence pages as PDF (stage 1 of the Confluence→Google-Drive migration)
argument-hint: [SPACE_KEY...] [--under PAGE_ID] [--limit N] [--dry-run] [--force]
---

Download Confluence pages as PDF via `scripts/confluence-export-pdf.ts`. This is a thin wrapper — the script does the work (enumerate via the Jira token, export via the native `flyingpdf` exporter, write a mirrored tree). Do NOT reimplement the export via MCP calls.

Arguments: **$ARGUMENTS** — one or more Confluence **space keys** (e.g. `ENG TD PM`), plus optional `--under PAGE_ID`, `--limit N`, `--dry-run`, `--force`.

Big spaces (ENG ≈ 2500 pages) should NOT be run in one shot. Chunk the work — both knobs compose and every run is idempotent (resumes via the manifest):

- `--limit N` — export at most N *fresh* pages this run (skips don't count). Re-run the same command to walk the next N. Default batch size ≈ **100–150**.
- `--under PAGE_ID` — restrict to one branch: a parent page + all its descendants. Output paths still mirror the full space tree, so branch runs and full runs merge cleanly. Find a parent's id from a `--dry-run` line (`… → ENG/…/<Title>__<ID>.pdf`).

## Prerequisite — the cookie (one-time per session, expires in hours)

The native PDF export is session-gated; the Jira token alone gets 403. Set `CONFLUENCE_COOKIE_HEADER` in `.env` (same pattern as `PLANE_COOKIE_HEADER`):

1. Open any Confluence page in Chrome → DevTools → Network → reload.
2. Copy the request's `cookie:` header verbatim → paste into `.env` as `CONFLUENCE_COOKIE_HEADER=…`.
3. Leave `CONFLUENCE_BASE_URL` blank (defaults to `<JIRA_BASE_URL>/wiki` — a value WITHOUT `/wiki` silently hits Jira and 404s).

`--dry-run` (enumeration + plan only) does NOT need the cookie.

## Steps

1. If no space key is given, ask which space(s). Don't guess.
2. **Plan first** — always dry-run unless the user says skip:

   ```
   bun run scripts/confluence-export-pdf.ts <SPACE...> --dry-run
   ```

   Report the page count and a sample of target paths. Flag size: ~8s/page (e.g. a 2500-page space ≈ 5–6h — resumable).
3. **Pilot** a few real pages and confirm they look right before committing to a long run:

   ```
   bun run scripts/confluence-export-pdf.ts <SPACE...> --limit 5
   ```

   Spot-check a couple of the produced PDFs under `confluence-pdf/<SPACE>/…`.
4. Ask the user to confirm, then run in **batches** rather than one giant run. Pick a branch and/or a count cap, then re-run the same command until the summary shows `0 downloaded` (everything skipped = that scope is done):

   ```
   # whole space in batches of ~120, resuming each time:
   bun run scripts/confluence-export-pdf.ts <SPACE...> --limit 120

   # or one branch at a time, batched:
   bun run scripts/confluence-export-pdf.ts <SPACE...> --under <PAGE_ID> --limit 120
   ```

   It is idempotent (manifest `state/confluence-manifest.jsonl`, keyed by pageId+version): unchanged pages are skipped, edited pages re-downloaded. Safe to re-run anytime.
5. Report the summary line: `N pages · X downloaded · Y skipped · Z failed`. If `failed > 0`, inspect the `failed` entries in the manifest (`grep '"status":"failed"' state/confluence-manifest.jsonl`) and re-run — successes are skipped on resume.

## Cookie expired mid-run?

The cookie lasts only hours. On a long run you may see `refresh CONFLUENCE_COOKIE_HEADER` (401/403) and the run stops. Refresh the cookie in `.env` per the prerequisite, then re-run the same command — the manifest resumes where it left off.

## Notes / scope

- Only `status=current` pages are exported (archived pages skipped). Confirm with the user if they want archived or personal `~user` spaces too.
- Output, manifest, and `--debug` dumps are all gitignored (large binaries / local audit).
- `--page <id> --debug` exports a single page and dumps raw start HTML + progress JSON — use when diagnosing an export failure.

## Never

- Never reimplement the flyingpdf export flow via MCP — only the CLI does it.
- Never hand-edit `state/confluence-manifest.jsonl` — the script owns it (append-only, last line per page wins).
- Don't commit `confluence-pdf/` or the cookie.

Stage 2 (upload the PDFs to Google Drive) is a separate, not-yet-built step that consumes this manifest.
