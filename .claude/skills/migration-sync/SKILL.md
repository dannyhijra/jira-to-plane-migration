---
name: migration-sync
description: Semantics and operation of the incremental Jira-to-Plane sync (the `bun run migrate sync` command). Covers the overlap-window delta strategy, idempotency, the three locked policies (deletions ignored, Jira as source of truth, new comments only), state files, exit codes, and the lockfile. Use when running, debugging, or explaining the sync.
---

# Incremental sync

Keeps Plane updated with Jira on each run, until final cutover. Runs as a deterministic CLI with no LLM/MCP in the path.

## Locked policies
- **Deletions ignored** — deleted Jira issues leave their Plane work items untouched.
- **Jira is source of truth** — every run overwrites Plane work item fields from Jira. Direct Plane edits are lost on next sync. (Communicate this to the team.)
- **New comments only** — comments migrate once; later edits ignored; new ones added.

## Delta strategy: overlap window
Each run queries `updated >= (last_sync_at − SYNC_OVERLAP_MINUTES)`. Re-processing boundary items is harmless (idempotent PATCH). The saved `last_sync_at` is the run START time, so overlap next run covers anything changed mid-run. Never silently misses an edit.

First sync (no prior state): baseline derived from the earliest manifest `at` for the project, or `--since <ISO>` override.

## State files
- `state/sync-state.json` — per-project `last_sync_at`, status, last-run stats. Owned by the CLI; never hand-edit.
- `state/.sync.lock` — prevents overlapping runs; auto-reclaimed if older than 1h (crash recovery).
- `state/manifest.jsonl` — sync appends entries with `notes: "sync:create" | "sync:update"` for work items, `"sync"` / `"sync:..."` for comments/attachments and failures.

## Exit codes
- 0 = clean
- 1 = partial (item-level failures; sync still ran and advanced state)
- 2 = config/auth error (didn't run)
- 3 = locked (another run in progress)

## Common operations
- Dry run: `bun run migrate sync --dry-run` (writes nothing, advances nothing)
- One project: `bun run migrate sync --jira-project ENG`
- All projects: `bun run migrate sync`
- Re-baseline a first sync: `bun run migrate sync --jira-project ENG --since 2026-05-01T00:00:00Z`

## Debugging failures
Filter sync failures: `cat state/failures.jsonl | jq 'select(.notes != null and (.notes | test("sync")))'`
Most common causes: a Jira user newly added but not yet in Plane members (assignee left empty, email in prefix — resolves on `/migrate-reassign`), or a new label/custom field not in `config/mappings.yaml`.

## Hard rules
- The sync logic lives ONLY in the CLI. Never reproduce it via MCP — that breaks determinism.
- Never set `created_by` in Plane payloads (ignored by API).
- Timezone: JQL datetimes are rendered in `JIRA_TIMEZONE` (default Asia/Jakarta). Wrong tz here silently shifts the delta window — keep it correct.
