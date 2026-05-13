---
description: Show migration progress and recent failures from the manifest
argument-hint: [JIRA_PROJECT_KEY]
---

Show migration status from `state/manifest.jsonl`.

Argument: **$ARGUMENTS** (optional project key; if absent, show all projects)

## Steps

1. Read `state/manifest.jsonl`. If it doesn't exist or is empty, report "no migration activity yet" and stop.
2. Also read `state/failures.jsonl` if it exists.
3. If `$ARGUMENTS` is given, filter entries to `project === $ARGUMENTS`. Otherwise group by project.
4. Produce a table:

   ```
   project | entity        |  ok  | failed | skipped | last updated
   --------|---------------|------|--------|---------|--------------------
   ENG     | work_item     |  187 |      4 |       0 | 2025-05-12T09:30:00Z
   ENG     | comment       |    0 |      0 |       0 | -
   ```

5. Then show the 5 most recent **failure** entries: `jira_key | entity | error (truncated to 120 chars)`.
6. Then show top 3 error patterns (group failures by the first line of `error`, count, top jira_key example).
7. If there are unresolved failures, suggest:
   - Inspect `state/failures.jsonl` directly: `cat state/failures.jsonl | jq -r '.error' | sort | uniq -c | sort -rn`
   - Common fixes: add missing user to `config/users.yaml`, add label rename to `config/mappings.yaml`, then re-run `/migrate-scale <PROJECT> <entity>` with `--resume`

No tools beyond bash needed. This is a pure manifest read.
