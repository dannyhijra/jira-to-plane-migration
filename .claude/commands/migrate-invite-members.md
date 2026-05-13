---
description: Stage 1 — checklist for inviting Plane workspace members (manual UI)
---

Stage 1 of the three-stage user flow: workspace invitations. **Manual via the Plane UI** — there is no code path.

Read `.claude/skills/migration-user-strategy/SKILL.md` for context on the three-stage flow.

## Why manual

The Plane self-hosted public API (`X-API-Key`) is project-scoped — the workspace-invitations endpoint is internal-web-API only and sits behind Cloudflare Bot Management, which blocks non-browser HTTP clients regardless of cookies. Sending 10–20 invites once per project via the UI is dramatically less effort than the alternatives.

## Steps

1. Read `config/users.yaml`. Collect every unique email where `role != deactivated` and `email != null`.
2. Print the deduplicated list to the chat so the user can copy-paste.
3. Tell the user:
   - Open Plane → workspace `hijra` → Settings → Members → Invite
   - Paste the comma-separated list
   - Role: Member
   - Submit
4. There's nothing to record in the manifest — Plane's own Members page is the source of truth for who's been invited.

## After running

Invitations are out. People sign up in parallel. Migration doesn't depend on acceptance — Stage 2 (`/migrate-pilot`, `/migrate-scale`) leaves assignees empty when the email isn't yet a workspace member and captures it in the description prefix. Stage 3 (`/migrate-reassign`) cleans up later.

Re-run this command whenever you add new emails to `config/users.yaml`.
