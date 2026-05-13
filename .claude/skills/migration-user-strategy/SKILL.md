---
name: migration-user-strategy
description: How the migration handles users, authors, assignees, and comment authors when Plane starts with few or no registered users. Defines the three-stage flow (invite, migrate with email-prefix capture, reassign), the exact description and comment prefix formats, and the constraints Plane's API imposes. Use any time the migration touches assignee, creator, comment author, or invitation logic.
---

# Migration user strategy

## The starting condition

Bank Hijra's Plane workspace begins largely empty:
- 0 or few workspace members (just the migration bot / API key owner)
- Team members will register **later**, using their company email — the same address they used in Jira

So the migration runs in a window where most user emails from Jira don't yet correspond to a Plane `user_id` we can assign work items to.

## Plane API constraints we cannot work around

Two fields are immutable from the API:

1. **`created_by` / author of work items** is always the API key owner. There's no API field to override it.
2. **Comment author** is always the API key owner. Same.

The `assignees` field we *can* control — but only if those user_ids exist in the workspace at the time of the API call.

## The three-stage flow

### Stage 1 — Invite (one-time, manual UI)

Command: `/migrate-invite-members` (prints a checklist — there is no code path)

- Read `config/users.yaml` and print every unique email where `role != deactivated` and `email != null`
- User pastes the list into Plane → workspace → Settings → Members → Invite, role = Member
- No manifest entry — Plane's own Members page is the source of truth

Purpose: get invitation emails into people's inboxes so they sign up in parallel with migration work. **Does not block Stage 2** — migration runs regardless of acceptance.

Why manual: the Plane self-hosted public API (`X-API-Key`) is project-scoped on this instance — workspace-scoped endpoints 404. The internal web API at `/api/workspaces/{slug}/invitations/` requires a session cookie AND sits behind Cloudflare Bot Management, which TLS-fingerprints non-browser clients and challenges them regardless of cookies. Sending 10–20 invites once per project via the UI is dramatically less effort than the alternatives (headless browser, curl-impersonate, etc.).

### Stage 2 — Migrate (per project, the bulk work)

Commands: `/migrate-pilot <PROJECT> <entity>`, `/migrate-scale <PROJECT> <entity>`

For each work item the migrator processes:
- Pre-fetch the **current** Plane workspace member list once at run start (Map<lowercase_email, user_id>)
- For each Jira assignee: look up their email in the map
  - Hit → set `assignees: [user_id]` directly
  - Miss → set `assignees: []` AND prepend the migration prefix to the description

The migration prefix is **always** prepended, even when the assignee resolves — it's the audit trail.

#### Description prefix format

Always at the very top of the description, separated from the original content by a single blank line. Treat it as structured data (parseable by reassign), not freeform text.

With assignee:
```markdown
> **Migrated from Jira <JIRA_KEY>** · Originally created by `<creator_email>`, assigned to `<assignee_email>` on <YYYY-MM-DD>

<original Jira description content, unchanged>
```

Without assignee (Jira issue had no assignee):
```markdown
> **Migrated from Jira <JIRA_KEY>** · Originally created by `<creator_email>` on <YYYY-MM-DD>

<original Jira description content, unchanged>
```

If the original Jira creator's email isn't visible (privacy settings or anonymous account), use `<displayName>` instead of email, but keep the email format if available — emails are what `/migrate-reassign` parses.

#### Comment prefix format

Prepended to every comment body:

```markdown
> _Originally posted by `<author_email>` on <YYYY-MM-DD>_

<original comment body, unchanged>
```

Comments are never reassignable on Plane's side (author can't be patched), so this prefix is the only record.

### Stage 3 — Reassign (per project, run repeatedly during onboarding)

Command: `/migrate-reassign <PROJECT>`

- Fetch the project's work items from Plane
- Fetch the current workspace members list (now larger as people sign up)
- For each work item: if the description has a migration prefix AND the assignee field is empty AND the parsed assignee email now matches a current member → `PATCH` the work item to set `assignees: [user_id]`
- Default: keep the prefix line as audit context. Config option to strip it once assignment succeeds (deferred — start with keep)
- Append manifest entry with `entity: "reassign"` per item touched

Safe to re-run anytime. Idempotent — only items still pointing at non-members get touched. Recommended cadence: weekly during the rollout window.

## What the user sees in Plane

| Field            | What it shows                                              |
|------------------|------------------------------------------------------------|
| Created by       | Migration Bot (cosmetic; cannot be changed via API)        |
| Assignees        | Real user (post-reassign) or empty (pending invitation)    |
| Comment author   | Migration Bot (cosmetic; cannot be changed via API)        |
| Description top  | Migration prefix with original creator and assignee emails |
| Comment top      | "Originally posted by ..." prefix per comment              |

The Plane creator/comment-author fields are cosmetic noise. The **actual** audit trail for "who originally did what" lives in the prefixes.

## Implementation hints for migrators

- Pre-fetch the workspace member list ONCE at the start of a run, not per-item. Pass the lookup map through the migration context.
- Normalize emails to lowercase before mapping/lookup. Some Jira emails have capitalization variation.
- The reassign migrator should also pre-fetch the member list once per run.
- When parsing the prefix in `reassign`: anchor on the literal `> **Migrated from Jira ` prefix and the `assigned to \`<email>\`` pattern. If the prefix doesn't match exactly, skip (don't crash) — a human may have edited the description.
- Treat the prefix as machine-readable. Don't include any human-edited content inside the `>` blockquote line.

## Common questions to expect from users

- *"Why does everything say 'created by Hijra Eng'?"* — That's the API key owner. We can't change the `created_by` field via Plane's API. The real creator is preserved in the description prefix.
- *"Will assignees end up on my personal account?"* — No. Assignees are set explicitly via email lookup; the API key owner doesn't get auto-assigned to anything.
- *"Why are some work items unassigned?"* — Those people haven't accepted their invitation yet. The assignee email is in the description prefix; `/migrate-reassign` will fix it once they sign up.
