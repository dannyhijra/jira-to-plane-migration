---
name: migration-confluence-drive
description: How the Confluence→Google-Drive side-channel exports pages as native PDF and uploads them to Drive. Covers the two-auth model (Jira token for enumeration, browser cookie for the flyingpdf export, Google OAuth for Drive), the flyingpdf async export flow, tree-mirroring, dual idempotency (manifest + Drive appProperties), and the gotchas. Use when running, debugging, or explaining /migrate-confluence-pdf or /migrate-confluence-drive.
---

# Confluence → PDF → Google Drive

A side-channel, separate from the Jira→Plane migration: Confluence docs are preserved by exporting each page as a **native PDF** (full visual fidelity — chosen over Google-Docs conversion, which keeps only structure) and uploading to Google Drive. Run **locally, by hand, on demand** — not n8n, not scheduled. The cookie dependency is acceptable precisely because a human runs it and refreshes the cookie when it 403s.

Two CLIs, one shared manifest:

- `scripts/confluence-export-pdf.ts` — export to **local disk** (`/migrate-confluence-pdf`).
- `scripts/confluence-pdf-to-drive.ts` — export and **upload to Drive** (`/migrate-confluence-drive`).

Both are thin CLIs over `src/clients/confluence.ts` + `src/clients/googleDrive.ts` and the shared helpers in `src/lib/confluence-tree.ts` (subtree/path mirroring) and `src/lib/confluence-manifest.ts` (append-only state). Never reimplement the flow via MCP.

## Three auths, three purposes

1. **Page enumeration** → Jira API token (Basic `email:token`, base64). `getSpaceByKey`, `listPages` against the v2 REST API. The same Atlassian token works for Confluence.
2. **PDF export** → browser **session cookie** (`CONFLUENCE_COOKIE_HEADER`). The native `flyingpdf` exporter is session-gated; the token alone gets **403**. Cookie expires in **hours** — refresh from a logged-in browser (DevTools → Network → copy the `cookie:` header) and re-run; the manifest resumes.
3. **Drive upload** → Google **OAuth refresh token** (`GOOGLE_OAUTH_REFRESH_TOKEN`, obtained once via `scripts/google-auth.ts`). Long-lived; the client exchanges it for a ~55-min access token in-process, so it does NOT expire mid-run.

`CONFLUENCE_BASE_URL` must be **left blank** → it defaults to `<JIRA_BASE_URL>/wiki`. A value WITHOUT `/wiki` silently hits Jira and every export returns a 404 "dead link" HTML page (no `ajs-taskId`). This was hit live.

## The flyingpdf export flow (validated; mirrors the in-page exporter JS)

1. `GET /wiki/spaces/flyingpdf/pdfpageexport.action?pageId=ID` → SPA HTML shell; taskId = the `ajs-taskId` `<meta>` tag.
2. poll `GET /wiki/api/v2/pdfexporttask/progress/{taskId}` (JSON `{progress,state,result}`) until `progress>=100`; HTTP 500 = task failed.
3. `result` is a ready-to-GET `api.media.atlassian.com/...?token=` URL → fetch = PDF bytes. Do NOT send the Confluence cookie to the media host; its own token authorizes.

Dead ends (do not retry): legacy `runningtaskxml.action` ("Task Not Found" on v3), `POST /api/v2/pdfexporttask` (collides with a generic content-type route). ~8s/page export; with the Drive upload, ~15–20s/page.

## Google Drive client (`src/clients/googleDrive.ts`)

Raw `fetch` only (repo rule — no `googleapis` SDK). OAuth refresh-token → access-token (cached). `findOrCreateFolder` (cached by `parentId/name`), `ensureFolderPath` (resolves a nested chain), `findExisting` (looks up a page by `appProperties.confluencePageId`), `uploadPdf` (multipart/related). Shared-Drive aware: set `GOOGLE_DRIVE_ID` → adds `supportsAllDrives` + `driveId`/`corpora`.

**OAuth setup**: create a **Desktop-app** OAuth client (loopback redirect). `scripts/google-auth.ts` runs the installed-app loopback flow (`access_type=offline&prompt=consent`), writes the refresh token to `.env`, and smoke-tests `files.list`. Default scope `drive.file` (app sees only files it creates) — sufficient when the destination folder is created by the app. If uploads 403 into a pre-existing folder, re-auth with `--scope drive`.

## Tree mirroring

`ancestorTitles(spaceKey, pages, pageId)` returns `[spaceKey, …ancestor titles]` (filesystem-/Drive-safe via `safeSeg`). The disk script joins these into a path `<SPACE>/<ancestors…>/<title>__<id>.pdf`; the Drive script creates the same chain as nested folders under `GOOGLE_DRIVE_FOLDER_ID`, then uploads the leaf PDF. Paths are always computed over the **full** space tree, so `--under` (branch) runs and full runs merge into one identical structure. A page appears both as a file at its parent's level and as a folder holding its own children.

## Dual idempotency

- **Manifest** (primary): `state/confluence-manifest.jsonl`, append-only, one line per page, keyed by pageId (last line wins). Entries carry `target:"disk"|"drive"`, `version`, and `driveFileId`. A re-run skips a page whose recorded entry has the SAME target, `status:"ok"`, and `version >= current` — with zero Confluence/Drive calls. Edited pages (higher version) re-export.
- **Drive appProperties** (recovery): each upload sets `confluencePageId` / `confluenceVersion` (plus `confluenceBranchRoot`, `confluenceBreadcrumb`). On a manifest miss, the Drive script calls `findExisting` in the target folder; if an up-to-date copy is there, it back-fills the manifest and skips — so a lost manifest never causes duplicates.

`--force` ignores both and re-exports + re-uploads.

## Batching

Big spaces (ENG ≈ 2500 pages) must NOT run in one shot. `--limit N` caps **fresh** exports per run (skips don't count) → re-run to walk the next N. `--under PAGE_ID` scopes to a branch. Both compose; every run is resumable. So `--limit 5` on an already-done batch of 5 will skip those 5 and roll on to the next 5 (`10 pages · 5 uploaded · 5 skipped`).

## Gotchas (burned on, live)

- `CONFLUENCE_BASE_URL` set without `/wiki` → Jira 404 "dead link", no `ajs-taskId`. Leave blank.
- Confluence CQL `/rest/api/content/search` ignores the `start` offset — must paginate via the `_links.next` cursor (relevant only to the abandoned n8n approach; the current code uses the v2 cursor correctly).
- `--page` single-page mode uploads to the folder root with no manifest/dedupe — debug only.
- Drive appProperties cap at **124 bytes for key+value combined** (UTF-8), NOT 124 chars of value. Hit live: long breadcrumbs 403'd until `confluenceBreadcrumb` was byte-truncated to `124 - key.length`. Failed pages re-upload on the next run (manifest marks them `failed`, not `ok`).
- `drive.file` scope can't touch folders the app didn't create — symptom is a 403 on upload; fix by re-auth `--scope drive`.

## Never

- Reimplement the flyingpdf export or the Drive upload via MCP — only the CLIs do it.
- Hand-edit the manifest — the scripts own it (append-only).
- Commit `.env`, the cookie, the refresh token, or `confluence-pdf/` (all gitignored).

Related: [[plane-cf-cookie-expiry]] (same cookie-refresh operational pattern on the Plane side).
