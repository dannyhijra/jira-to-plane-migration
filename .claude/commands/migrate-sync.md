---
description: Run an incremental Jira→Plane sync for one project or all (wrapper around the sync CLI)
argument-hint: [JIRA_PROJECT_KEY] [--dry-run]
---

Run the incremental sync. This is a thin wrapper — the real logic is the deterministic CLI; do NOT reimplement it or call MCPs to do the sync.

Arguments: **$ARGUMENTS** (optional project key; optional --dry-run)

## Steps

1. Read `docs/sync-design.md` and `.claude/skills/migration-sync/SKILL.md` if you need context on semantics.
2. Always dry-run first unless the user explicitly says skip:

   ```
   bun run migrate sync [--jira-project <KEY>] --dry-run
   ```

   Show the planned creates/updates. Highlight: new issues (created), changed issues (updated), new comments, anything failing.
3. Ask the user to confirm before the real run.
4. Real run:

   ```
   bun run migrate sync [--jira-project <KEY>]
   ```
5. Report the summary the CLI prints. If exit code is non-zero, explain (1 = item failures, 2 = config/auth, 3 = another run is locked) and suggest next steps.

## Never
- Never perform the sync logic yourself via MCP calls. The whole point is determinism — only the CLI does the work.
- Never advance state manually. The CLI owns `state/sync-state.json`.
