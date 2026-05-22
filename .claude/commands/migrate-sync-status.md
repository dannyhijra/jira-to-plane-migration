---
description: Show last sync time and last-run stats per project from state/sync-state.json
argument-hint: [JIRA_PROJECT_KEY]
---

Read `state/sync-state.json` and report sync status. Pure file read — no API calls, no MCP.

Argument: **$ARGUMENTS** (optional project key)

## Steps

1. Read `state/sync-state.json`. If missing, report "no sync has run yet" and stop.
2. If a project key is given, show just that project; else all.
3. For each project, print:
   - last_sync_at (and how long ago)
   - last_sync_status
   - last_run stats: issues created/updated, comments created, attachments created, failed, duration
   - delta_from used last run
4. If any project's last_sync_status is "partial" or "error", suggest checking `state/failures.jsonl` filtered to `notes` containing "sync".
