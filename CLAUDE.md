# CLAUDE.md

One-shot migration tool moving Bank Hijra's Jira Cloud workspace to a self-hosted Plane instance. Runs project-by-project from a terminal CLI with an append-only JSONL manifest for idempotency, plus a Claude Code workflow built around slash commands and skills under `.claude/`.

## Stack

- **TypeScript run via Bun** (no build step, no tsx — Bun runs `.ts` natively)
- Raw `fetch` for both Jira and Plane REST APIs (no SDKs)
- `yaml` for config files
- Append-only JSONL state at `state/manifest.jsonl`

## MCP defaults

When using the **Atlassian Rovo MCP**, default to:

- `cloudId = "https://alamisharia.atlassian.net"` — do NOT call `getAccessibleAtlassianResources`
- `maxResults: 25` for all JQL and CQL searches

When using the **Plane MCP**, default to:

- `workspace slug = "hijra"`
- `limit: 25` for all list operations
- `PLANE_BASE_URL` from `.env` for the self-hosted endpoint

## User strategy (CRITICAL — read `.claude/skills/migration-user-strategy/SKILL.md` for full detail)

Plane starts mostly empty. Team members will register **later** using their company emails (same as their Jira emails). Plane's API has two hard constraints we work around:

- `created_by` on work items is always the API key owner (cosmetic; immutable)
- Comment authors are always the API key owner (same)

Migration uses a **three-stage flow**:

1. **Invite** (`/migrate-invite-members`, run once early) — workspace invitations go out so people sign up in parallel
2. **Migrate** (`/migrate-pilot`, `/migrate-scale`) — for each work item, look up the Jira assignee email in current Plane members; if hit, set `assignees`; if miss, leave empty AND prepend a migration prefix to the description capturing the original creator and assignee emails. Comments also get a prefix line capturing the original author email.
3. **Reassign** (`/migrate-reassign`, run periodically during onboarding) — parse description prefixes on existing work items, look up emails in the now-larger member list, set assignees, optionally strip prefixes

The API key owner ("migration bot") only ever appears as `created_by` and comment author — never as assignee unless they were the original Jira assignee.

## Slash commands

| Command                             | Purpose                                                    | Stage      |
| ----------------------------------- | ---------------------------------------------------------- | ---------- |
| `/migrate-discover <PROJECT>`       | Inventory Jira + Plane state into `discovery/<PROJECT>.md` | Phase 1    |
| `/migrate-configure <PROJECT>`      | Fill config/\*.yaml from discovery, propose diffs first    | Phase 2    |
| `/migrate-invite-members`           | Pre-invite team via Plane workspace invitations API        | Stage 1    |
| `/migrate-implement <entity>`       | Implement clients + one migrator (issues, comments, etc.)  | Phase 3    |
| `/migrate-pilot <PROJECT> <entity>` | Dry-run + 5 real + verify                                  | Phases 4–6 |
| `/migrate-scale <PROJECT> <entity>` | Full run with `--resume`                                   | Phase 7    |
| `/migrate-verify <PROJECT>`         | Random-sample diff via MCPs                                | Phase 6    |
| `/migrate-reassign <PROJECT>`       | Post-signup reassignment pass                              | Stage 3    |
| `/migrate-status [PROJECT]`         | Quick progress and failure summary from manifest           | Anytime    |

## Skills under `.claude/skills/`

- `migration-discovery` — inventory procedure for both sides
- `migration-user-strategy` — three-stage flow, prefix formats (CRITICAL)
- `migration-implementing-migrators` — code patterns for migrator files
- `migration-verification` — diff rules and report format

These are auto-loaded when relevant. Skill files reference each other when needed.

## Repo conventions

- New entity types go under `src/migrators/`, with field mappers under `src/mappers/`
- All API calls go through `src/clients/jira.ts` or `src/clients/plane.ts` — never raw `fetch` inside migrators
- Every successful or failed migration appends one line to `state/manifest.jsonl` via `src/state/manifest.ts`
- All commands honor `--dry-run` (default false): in dry-run mode, **no writes to Plane and no manifest entries**
- Use the logger (`src/lib/logger.ts`), not `console.log`
- The `discovery/`, `verification/`, and `state/README.md` paths are NOT gitignored — they're audit records, commit them. `state/manifest.jsonl` and `state/failures.jsonl` ARE gitignored.

## Workflow (typical session)

1. First time only: `/migrate-discover <PROJECT>` → review `discovery/<PROJECT>.md` → annotate decisions
2. `/migrate-configure <PROJECT>` → review diffs → approve
3. Once total, when ready: `/migrate-invite-members`
4. Per entity, in order (issues → comments → sprints → epics → attachments → links):
   - `/migrate-implement <entity>` (first project only — code is reusable across projects)
   - `/migrate-pilot <PROJECT> <entity>` → verify
   - `/migrate-scale <PROJECT> <entity>` → verify if scale changes anything
5. `/migrate-verify <PROJECT>` (random spot check)
6. Periodically as users sign up: `/migrate-reassign <PROJECT>`
7. Add next project to `config/projects.yaml` and `config/users.yaml`, return to step 4

## Never do

- Commit `.env` (already gitignored)
- Migrate without `--dry-run` the first time against any new project
- Migrate without populating `config/users.yaml` first — orphaned assignees are painful to fix
- Delete `state/manifest.jsonl` — it's the audit trail
- Use SDKs or add heavy dependencies — keep this lean
- Make mapping decisions in `/migrate-configure` without explicit user approval
- Set `created_by` in any Plane payload — the API ignores it and our code shouldn't pretend it works

## API key / "migration bot" identity

Current approach (Option A from setup): the API key in `.env` belongs to the personal admin account of the human running the migration (Hijra). Consequences:

- Every work item in Plane shows "Created by Hijra Eng" — cosmetic only
- Comments show the same — cosmetic only
- Original authorship is preserved in the migration prefix (real audit trail)

**Workspace admin role is required** for the `/migrate-invite-members` command to succeed (workspace invitation endpoint requires admin/owner).

If/when a dedicated service account is created later, swap the API key in `.env` — no code change needed.
