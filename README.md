# JIRA to Plane Migration

One-shot tool to migrate Bank Hijra's Jira Cloud workspace to a self-hosted Plane instance, run project-by-project from a terminal CLI with an append-only JSONL manifest for idempotency.

The workflow is driven from **Claude Code** using slash commands and skills under `.claude/`. The raw CLI under `src/cli.ts` is the execution layer; Claude orchestrates discovery, config, and verification on top of it.

## Quick start

```bash
bun install
cp .env.example .env                           # fill in JIRA_* and PLANE_* tokens
cp config/projects.yaml.example config/projects.yaml
cp config/users.yaml.example config/users.yaml
cp config/mappings.yaml.example config/mappings.yaml
```

## How a migration runs

Plane starts mostly empty. Team members register **later** with their company emails (same as Jira). Because Plane's API forces `created_by` and comment authors to be the API key owner, migration runs in three stages:

1. **Invite** — `/migrate-invite-members` prints an email list pasted into Plane's Settings → Members UI. Manual, run once early so people sign up in parallel.
2. **Migrate** — for each work item, if the Jira assignee email matches a current Plane member, set `assignees`; otherwise leave empty and prepend a migration prefix to the description capturing the original creator/assignee emails. Comments also get an author prefix.
3. **Reassign** — `/migrate-reassign` runs periodically as people sign up; it parses the prefixes and fills in `assignees` on existing work items.

See `.claude/skills/migration-user-strategy/SKILL.md` and `CLAUDE.md` for the full contract.

## Workflow (Claude Code slash commands)

Per project:

```text
/migrate-discover <PROJECT>      # Inventory Jira + Plane into discovery/<PROJECT>.md
/migrate-configure <PROJECT>     # Translate discovery → config/*.yaml (proposes diffs)
/migrate-invite-members          # One-time, manual UI checklist
```

Per entity (order: issues → comments → sprints → epics → attachments → links):

```text
/migrate-implement <entity>      # First project only — migrator code is reusable
/migrate-pilot <PROJECT> <entity># Dry-run + 5 real + verify
/migrate-scale <PROJECT> <entity># Full run with --resume
/migrate-verify <PROJECT>        # Random-sample diff via MCPs
/migrate-status [PROJECT]        # Progress + recent failures from manifest
```

## Raw CLI

The slash commands shell out to `bun run migrate`. You can call it directly:

```bash
# Dry run — read from Jira, plan Plane writes, write nothing
bun run migrate run --jira-project LRP --dry-run

# Pilot: 5 issues only
bun run migrate run --jira-project LRP --only issues --limit 5

# Full issues run, batches of 50, resumable
bun run migrate run --jira-project LRP --only issues --batch 50 --resume

# Verify: random sample diff (uses MCPs in Claude Code)
bun run migrate verify --jira-project LRP --sample 20
```

Flags: `--jira-project <KEY>` (required), `--dry-run`, `--only <entity>`, `--batch <N>`, `--limit <N>`, `--resume`, `--sample <N>` (verify).

`inspect` is intentionally a stub — discovery uses the Atlassian MCP from inside Claude Code (`/migrate-discover`), not the CLI.

## What gets migrated

| Jira concept | Plane concept | Migrator                    | Status                |
| ------------ | ------------- | --------------------------- | --------------------- |
| Project      | Project       | `src/migrators/projects`    | Implemented           |
| Issue        | Work item     | `src/migrators/issues`      | Implemented           |
| Comment      | Comment       | `src/migrators/comments`    | Stub                  |
| Sprint       | Cycle         | `src/migrators/sprints`     | Stub                  |
| Epic         | Module        | `src/migrators/epics`       | Stub                  |
| Attachment   | Attachment    | `src/migrators/attachments` | Stub                  |
| Issue link   | Relation      | `src/migrators/links`       | Stub                  |

Stubs return `{ ok: true, migrated: 0, notes: "stub" }` so a `run` won't crash; implement them via `/migrate-implement <entity>`.

## State

- `state/manifest.jsonl` — append-only audit trail; one JSON object per migration event. **Don't delete.** Gitignored.
- `state/failures.jsonl` — failures, for easy retry. Gitignored.
- `discovery/<PROJECT>.md`, `verification/<PROJECT>.md` — committed audit records.

## Repo conventions

- TypeScript run via Bun (no build step, no tsx).
- Raw `fetch` for both Jira and Plane (no SDKs); all calls go through `src/clients/{jira,plane}.ts`.
- Migrators under `src/migrators/`, field mappers under `src/mappers/`.
- Use `src/lib/logger.ts`, not `console.log`.
- Every successful or failed run appends one line to `state/manifest.jsonl` via `src/state/manifest.ts`.
- See `CLAUDE.md` for the full set of conventions and the "never do" list.
