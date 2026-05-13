---
description: Stage 1 — pre-invite team members to Plane workspace by email
---

Stage 1 of the three-stage user flow: workspace invitations.

Sends invitation emails to all team members listed in `config/users.yaml` so they can sign up to Plane in parallel with migration work. Idempotent: skips emails already invited.

Read `.claude/skills/migration-user-strategy/SKILL.md` for context on the three-stage flow.

## Prerequisites

- `config/users.yaml` is populated (run `/migrate-configure` for at least one project first)
- The Plane API key in `.env` belongs to a workspace **admin or owner** (required for invitation endpoint; otherwise the call 403s)

## Steps

1. Read `config/users.yaml`. Collect every unique email across all `users:` entries.
2. Read `state/manifest.jsonl`. Find existing entries with `entity: "invitation"` and status `"ok"` — those emails are already invited; skip them.
3. Show the user the count: "X emails total, Y already invited, Z to invite now."
4. If `src/migrators/invitations.ts` and a matching `invite-members` CLI subcommand don't exist yet, implement them now:
   - Follow the patterns in `.claude/skills/migration-implementing-migrators/SKILL.md`
   - The migrator hits `POST /api/v1/workspaces/{slug}/invitations/` with `{email, role: 15}` (Member)
   - Treat 400/409 responses meaning "already invited" as `status: "skipped"`, not failures
   - Append one manifest entry per attempt with `entity: "invitation"`, key by email
   - Add an `invite-members` subcommand in `src/cli.ts` that doesn't take `--jira-project`
   - Run `bun run typecheck` and confirm it passes
5. **Dry run:**
   ```
   bun run migrate invite-members --dry-run
   ```
   Show the user the planned invitations. Ask for explicit confirmation.
6. **Real run:**
   ```
   bun run migrate invite-members
   ```
7. Report: invitations sent, skipped, failed.

## After running

Invitations are out. People can sign up in parallel. Migration doesn't depend on acceptance — Stage 2 (`/migrate-pilot`, `/migrate-scale`) leaves assignees empty if the email isn't yet a workspace member, capturing the email in the description prefix. Stage 3 (`/migrate-reassign`) cleans up later.

Suggest the user re-run this command whenever they add new emails to `config/users.yaml`.
