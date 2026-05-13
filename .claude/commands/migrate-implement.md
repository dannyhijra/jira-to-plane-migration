---
description: Implement a migrator for one entity type
argument-hint: <entity: issues|comments|sprints|epics|attachments|links|invitations|reassign>
---

Implement the migrator for entity: **$ARGUMENTS**

Valid entities: `issues`, `comments`, `sprints`, `epics`, `attachments`, `links`, `invitations`, `reassign`.

## Required reading before writing code

- `.claude/skills/migration-implementing-migrators/SKILL.md` for the migrator contract and code patterns
- `.claude/skills/migration-user-strategy/SKILL.md` for assignee/author handling (especially relevant for `issues`, `comments`, and `reassign`)

## Steps

1. Read the current `src/migrators/$ARGUMENTS.ts` — should be a stub or absent.
2. If the corresponding Jira/Plane client methods are still stubbed in `src/clients/jira.ts` or `src/clients/plane.ts`, implement them first. Use the appropriate MCP to verify actual response/payload shapes against real data — do not guess from memory or training data. For example, before implementing `JiraClient.searchIssues`, pull one real issue via Atlassian MCP and shape the types around it.
3. Implement the migrator following the standard structure in the implementing-migrators skill:
   - Honor `ctx.dryRun` (no Plane writes, no manifest writes)
   - Honor `ctx.resume` (skip on manifest hit with `status === "ok"`)
   - Honor `ctx.limit` and `ctx.batch`
   - Wrap every API call in `withRetry`
   - Use `paginate` for paginated reads
   - Append a manifest entry per attempt (ok / failed / skipped)
   - Catch per-item errors; never abort the whole run on one failure
4. For author/assignee handling, strictly follow the user-strategy skill (pre-fetch member lookup once, look up assignee email, set assignees or capture in description prefix).
5. Run `bun run typecheck` and fix any errors.
6. Briefly summarize the implementation: what fields are mapped, what's intentionally dropped, what edge cases handled, what's still TODO.
7. Suggest the next step: `/migrate-pilot <PROJECT> $ARGUMENTS`.

## Entity-specific notes

- `comments`: depends on `issues` being done — look up work_item plane_id from manifest
- `sprints`: requires the Jira board id for the project (ask Atlassian MCP); creates Plane cycles
- `epics`: creates Plane modules; child issues are linked via parent or "Epic Link" custom field
- `attachments`: slowest; stream downloads, use Plane's 3-step upload (credentials → upload → complete)
- `links`: run LAST; both sides of every link must already exist in Plane
- `invitations`: special — sourced from `config/users.yaml`, keyed by email not Jira key
- `reassign`: an **updater**, not creator — modifies existing Plane work items based on the description prefix
