# AGENTS.md

This is a one-shot migration tool moving Bank Hijra's Jira Cloud workspace to a self-hosted Plane instance. The script runs project-by-project from a terminal CLI, with per-entity flags and an append-only JSONL manifest for idempotency.

## Stack

- TypeScript run via Bun (no build step, no tsx)
- Raw `fetch` for both Jira and Plane REST APIs (no SDKs)
- `yaml` package for config files
- Append-only JSONL state at `state/manifest.jsonl`

## MCP defaults

When using the **Atlassian Rovo MCP**, default to:
- `cloudId = "https://alamisharia.atlassian.net"` — do NOT call `getAccessibleAtlassianResources`
- `maxResults: 25` for all JQL and CQL searches

When using the **Plane MCP**, default to:
- `workspace slug = "hijra-bank"`
- `limit: 25` for all list operations
- `PLANE_BASE_URL` from `.env` for the self-hosted endpoint

## Conventions

- New entity types go under `src/migrators/`, with their field mappers under `src/mappers/`
- All API calls go through `src/clients/jira.ts` or `src/clients/plane.ts` — never raw `fetch` inside migrators
- Every successful or failed migration appends one line to `state/manifest.jsonl` via `src/state/manifest.ts`
- All commands honor `--dry-run` (default false): in dry-run mode, **no writes to Plane and no manifest entries**
- Use the logger (`src/lib/logger.ts`), not `console.log`

## Workflow

1. **Discovery** (interactive, via MCPs in Claude Code):
   - "Atlassian MCP, list projects in our workspace with issue counts and custom fields used"
   - "Plane MCP, show me existing projects and their state groups"
   - Output goes into `config/projects.yaml`, `config/users.yaml`, `config/mappings.yaml`
2. **Pilot**: `bun run migrate run --jira-project SMALLEST --only issues --dry-run`
3. **Real pilot** on a few issues: drop `--dry-run`, add `--limit 5`
4. **Verify** with MCPs: pull migrated items from both sides, diff
5. **Full project**: `bun run migrate run --jira-project SMALLEST --resume`
6. **Wave next project**

## Never do

- Commit `.env` (already in `.gitignore`)
- Migrate without `--dry-run` the first time against any new project
- Migrate without populating `config/users.yaml` first — orphaned assignees are painful to fix
- Delete `state/manifest.jsonl` — it's the audit trail
- Use SDKs or add heavy dependencies — keep this lean
