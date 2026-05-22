# Incremental Jira → Plane sync — design (HBANK-987)

Tracks the design and contract of `bun run migrate sync`. Built on top of the existing one-shot migration tool; runs until final cutover.

## Locked policies (do not deviate)

1. **Deletions ignored.** If a Jira issue is deleted, its Plane work item is left as-is. The sync does not detect or act on deletions.
2. **Jira is source of truth during the sync window.** Every run PATCHes Plane work items from current Jira state. Direct Plane edits are overwritten on the next sync. This is intentional and must be communicated to the team (template below).
3. **New comments only.** A Jira comment is migrated exactly once. Subsequent edits to it are ignored. New comments are added.

## Delta strategy — overlap window

Each run queries Jira with:

```
project = "<KEY>" AND updated >= "<last_sync_at − SYNC_OVERLAP_MINUTES>" ORDER BY updated ASC
```

`SYNC_OVERLAP_MINUTES` defaults to 5. Re-processing boundary items is harmless because each PATCH is idempotent (the payload is deterministic from current Jira state).

The new `last_sync_at` saved after a successful run is the **run start time**, captured before any querying. Combined with the overlap buffer on the next run, this guarantees no edit is ever silently missed — even one that lands mid-run.

### First sync baseline

When no `last_sync_at` exists yet for a project:

- `--since <ISO>` if supplied → that exact timestamp
- otherwise → the earliest `at` of `work_item` manifest entries for that project (safe lower bound; everything updated since the original migration began)
- absolute fallback (no manifest entries either) → epoch (1970-01-01) with a warning

### Timezone gotcha

JQL `updated >=` interprets datetime literals in the **requesting user's timezone** and requires the `yyyy-MM-dd HH:mm` form (no seconds, no ISO `T`/`Z`). The sync formats the cutoff in `JIRA_TIMEZONE` (default `Asia/Jakarta`) using `Intl.DateTimeFormat` with locale `en-CA` (gives the right component ordering). Wrong timezone here silently shifts the delta window — keep it correct.

## State files

| File                       | Owned by      | Gitignored | Purpose                                                                            |
| -------------------------- | ------------- | ---------- | ---------------------------------------------------------------------------------- |
| `state/sync-state.json`    | sync CLI      | yes        | Per-project `last_sync_at`, status, last-run stats. Never hand-edit.               |
| `state/.sync.lock`         | sync CLI      | yes        | Single-instance lock. Stale (> 1h) → auto-reclaimed (crash recovery).              |
| `state/manifest.jsonl`     | bulk + sync   | yes        | Append-only audit. Sync appends with `notes: "sync:create"` / `"sync:update"` / `"sync:..."`. |
| `state/failures.jsonl`     | bulk + sync   | yes        | Mirror of failed manifest entries. Filter sync rows: `notes | test("sync")`.     |

### `sync-state.json` shape

```json
{
  "version": 1,
  "projects": {
    "ENG": {
      "last_sync_at": "2026-05-22T03:00:00.000Z",
      "last_sync_status": "ok",
      "last_run": {
        "issues_created": 3,
        "issues_updated": 17,
        "comments_created": 5,
        "attachments_created": 0,
        "failed": 0,
        "duration_ms": 12830,
        "delta_from": "2026-05-22T02:55:00.000Z"
      }
    }
  }
}
```

## CLI surface

```
bun run migrate sync [--jira-project <KEY>] [--dry-run] [--since <ISO>] [--batch N]
```

- Omitting `--jira-project` syncs every project in `config/projects.yaml`.
- `--dry-run` writes nothing to Plane and does NOT advance `state/sync-state.json`. Manifest is also untouched.
- `--since <ISO>` overrides the first-sync baseline for projects that have no prior `last_sync_at` (ignored for projects that already have one — those use the overlap window).
- `--batch` controls Jira page size (default 50).

## Exit codes

| Code | Meaning                                                                           |
| ---- | --------------------------------------------------------------------------------- |
| 0    | Clean — all projects synced, no failures.                                         |
| 1    | Partial — at least one item-level failure. State was still advanced.              |
| 2    | Config / auth error. Run didn't start or aborted before doing work.               |
| 3    | Locked — another sync is in progress (active lock newer than 1h). Try again later.|

## Lockfile semantics

`state/.sync.lock` contains `{pid, startedAt}` JSON. On startup:

- File missing → acquire (write our PID + start time).
- File present, age < 1h → another run is live; return exit code 3.
- File present, age ≥ 1h → assume the previous run crashed without releasing; warn, reclaim.
- File present but unreadable JSON → warn, reclaim.

The lock is released in a `finally` block, including when the process is killed gracefully.

## Notifications

Run summary is always printed to stdout. If `NOTIFY_WEBHOOK_URL` is set, the same summary is POSTed as `{"text": "..."}` — the shape both Google Chat and Slack incoming webhooks accept. Webhook failures never fail the sync (warned, swallowed).

## Migrator reuse

The sync reuses the bulk migration's mapping code so output is identical:

- Issues → `mapIssueToPlanePayload` in `src/migrators/issues.ts` (exported, used by both `migrateIssues` and `syncIssue`). Migration prefix is re-applied on every update — deterministic, keeps `/migrate-reassign` parsable.
- Comments → `buildCommentBody` (private; identical author/date prefix). `syncComments` calls it.
- Attachments → `renderPlaceholderHtml` (private; same placeholder format on storage-down fallback).

## Team communication (send before first scheduled sync)

> **Heads up — Jira is the source of truth during the Plane migration window.**
> We're keeping Plane automatically updated from Jira until cutover on <DATE>.
> Until then: **make all changes in Jira, not Plane.** Plane is a read-only mirror;
> any edits made directly in Plane will be overwritten on the next sync.
> Questions → <YOU / channel>.

## Open questions / known limits

- **Custom Plane fields drift.** If someone adds a label/custom-field option in Jira that isn't in `config/mappings.yaml`, the issue migrates with the label silently dropped. We catch this in the verification pass; sync logs a `warn` line.
- **Assignee resolution.** A Jira user who joined after the last `/migrate-reassign` pass still won't resolve via `config/users.yaml`. The work item is created/updated with no assignee and the email captured in the description prefix — `/migrate-reassign` cleans this up later.
- **No back-fill of deleted items.** Restoring a deleted Jira issue creates a fresh Plane item on the next sync; the manifest entry for the original Plane item is left in place (orphaned, harmless).
