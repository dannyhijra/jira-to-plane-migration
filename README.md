# JIRA to Plane Migration

One-shot tool to migrate Bank Hijra's Jira Cloud workspace to a self-hosted Plane instance.

## Quick start

```bash
bun install
cp .env.example .env             # fill in tokens
cp config/projects.yaml.example config/projects.yaml
cp config/users.yaml.example config/users.yaml
cp config/mappings.yaml.example config/mappings.yaml
```

## Usage

```bash
# Discover what exists in Jira
bun run migrate inspect --jira-project ENG

# Dry run — read from Jira, plan Plane writes, write nothing
bun run migrate run --jira-project ENG --dry-run

# Real run, issues only, in batches of 50
bun run migrate run --jira-project ENG --only issues --batch 50

# Resume after failure — skips entries already in state/manifest.jsonl
bun run migrate run --jira-project ENG --resume

# Verify migration: pull a sample from both sides and diff
bun run migrate verify --jira-project ENG --sample 20
```

## What gets migrated

| Jira concept | Plane concept | Migrator                    |
| ------------ | ------------- | --------------------------- |
| Project      | Project       | `src/migrators/projects`    |
| Issue        | Work item     | `src/migrators/issues`      |
| Comment      | Comment       | `src/migrators/comments`    |
| Sprint       | Cycle         | `src/migrators/sprints`     |
| Epic         | Module        | `src/migrators/epics`       |
| Attachment   | Attachment    | `src/migrators/attachments` |
| Issue link   | Relation      | `src/migrators/links`       |

## State

All migration events are appended to `state/manifest.jsonl` as one JSON object per line. This file is the audit trail — don't delete it. Failures are also written to `state/failures.jsonl` for easy retry.

## Discovery workflow

Use Claude Code with the Atlassian and Plane MCP servers connected. See `CLAUDE.md` for the conventions Claude follows in this repo.
