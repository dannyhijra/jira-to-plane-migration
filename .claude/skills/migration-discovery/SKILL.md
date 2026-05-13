---
name: migration-discovery
description: Procedures for inventorying Jira and Plane state via MCPs before migration. Use when running /migrate-discover or any time you need to inventory either side of a Jira-to-Plane migration. Covers what to capture from Jira (issue types, statuses, custom fields, users, sprints, epics), what to capture from Plane (workspace members, existing projects, state groups), and the format of the discovery document.
---

# Migration discovery

Before any migration code is written or executed, both sides must be inventoried so mapping decisions can be made consciously rather than discovered at runtime. This skill is the exact procedure for that.

## Jira side inventory (Atlassian MCP)

For a given Jira project key `<PROJECT>`, collect everything below. Use the `atlassian` MCP — never web-search or guess.

### Issue types
Use a JQL search like `project = <PROJECT>` and aggregate by `issuetype`. Report each type with count. Pay special attention to:
- **Epic** — maps to Plane module (or initiative if cross-project)
- **Sub-task** — needs `parent_id` handling in Plane work items
- Custom issue types — confirm a sensible default mapping

### Workflow / statuses
List every distinct value of `status` across all issues in the project. Report with count. These map to Plane state groups: `backlog | unstarted | started | completed | cancelled`. The user decides the mapping in `config/mappings.yaml`.

### Priorities
Distinct `priority` values with counts. Map to Plane priorities: `urgent | high | medium | low | none`.

### Labels
Distinct `labels` values with counts. Labels are usually 1:1 unless the user wants to rename or consolidate.

### Custom fields
Identify custom fields that have non-null values on at least one issue in the project. For each, report:
- Field id (e.g., `customfield_10100`)
- Field name (human-readable)
- Type (string, number, single-select, multi-select, date, user, etc.)
- 3 sample values

The user decides per field: `drop` | `description` (fold into description text) | `property:<name>` (map to a Plane custom property).

### Sprints
If the project has an Agile board, list sprints with state (active/closed/future), date range, and issue count. These map to Plane cycles.

### Epics
Count of issues with `issuetype = Epic`. List 5 sample epic summaries. These map to Plane modules.

### Users
List every distinct user who has either:
- Created an issue in this project
- Been assigned to an issue
- Posted a comment

For each: `accountId`, `displayName`, `emailAddress` (if visible to the API token), activity level (high/medium/low based on issue counts they touch).

## Plane side inventory (Plane MCP)

Plane state is split between **workspace-global** (lives in `config/_plane.md`, treated as a workspace fact — auto-refreshed every run, no-op if unchanged) and **per-project** (lives in `discovery/<PROJECT>.md`). The per-project doc references `config/_plane.md` rather than duplicating it.

### Workspace-global (refresh `config/_plane.md` on every run, no-op if nothing changed)
Every `/migrate-discover` run re-queries the workspace-global facts and **rewrites `config/_plane.md` only if the captured state differs** from what's currently on disk. Read the existing file first, diff it against fresh MCP results, and skip the write if the content would be identical. This keeps git diffs clean while ensuring the file stays current.

- All existing projects (identifier + name + id)
- Workspace members with `user_id` and email — the assignee-resolution lookup
- Default state groups (should be the standard 5) + any custom states reused across projects
- Default priorities (should be the standard 5)
- Access notes (VPN / Cloudflare Access / endpoint quirks observed)

### Per-project Plane facts (write into `discovery/<PROJECT>.md`)
Only what's specific to the migration target:

- Whether a Plane project already exists for `<PROJECT>` (and if yes: its id, existing states, labels, custom properties on work item types)
- Diff between Jira project's user set and `_plane.md` member list → Stage 1 invitation list
- Proposed Plane project identifier if creating new

## Output format

Two files:
- `config/_plane.md` — workspace-global Plane state. Auto-refreshed every run; rewrite only if changed.
- `discovery/<PROJECT>.md` — per-project doc, format below. The Plane section here is short and links to `config/_plane.md` rather than duplicating it.

Per-project file format:

```markdown
# Discovery: <PROJECT>

Generated: <ISO timestamp> by Claude Code

## Jira side

### Project summary
- Total issues: ...
- Sprints (active/closed/future): .../.../...
- Epics: ...
- Distinct users: ...

### Issue types
| Type | Count |
| ---- | ----- |
| ...  | ...   |

### Statuses
| Jira status | Count | Proposed Plane state group |
| ----------- | ----- | -------------------------- |
| ...         | ...   | ...                        |

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| ...           | ...   | ...                     |

### Labels
| Label | Count |
| ----- | ----- |
| ...   | ...   |

### Custom fields
| Field id | Name | Type | Sample values | Proposed action |
| -------- | ---- | ---- | ------------- | --------------- |
| ...      | ...  | ...  | ...           | drop / description / property:... |

### Sprints
(table or list)

### Epics
(5 samples)

### Users
| accountId | displayName | email | activity |
| --------- | ----------- | ----- | -------- |
| ...       | ...         | ...   | ...      |

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to `<PROJECT>`.

- Target project: does/does-not exist yet in Plane. (If exists: id, current state set, labels, custom properties.)
- Assignee overlap with current Plane members: count and list mismatched users
- Stage 1 invitation list: emails from this project's Jira users that aren't in `_plane.md` yet
- Proposed Plane project identifier (if new)
- Proposed state seed (which `_plane.md` template states to use, plus any project-specific custom states)

## Decisions needed

Annotate each item before running /migrate-configure:

- [ ] Status mapping: confirm or override proposals above
- [ ] Priority mapping: confirm or override
- [ ] Custom fields: mark each as drop / description / property:<name>
- [ ] Labels: any renames or consolidations?
- [ ] User emails: any that don't match Plane (typos, different domain)? Flag for manual fix.
- [ ] Sprint strategy: migrate as cycles? Skip closed sprints older than N months?
- [ ] Epic strategy: migrate as modules? Or initiatives for cross-project rollups?
- [ ] Anything from this project that should NOT be migrated?
```

After writing, **stop**. The user reviews and annotates the decisions checklist before the next step (`/migrate-configure`).

## What not to do

- Don't guess at field shapes or response formats from training data — the Atlassian and Plane APIs evolve. Always confirm via the MCP.
- Don't make mapping decisions in the discovery doc beyond proposals — the user makes the call.
- Don't write to `config/*.yaml` from this skill. That's `/migrate-configure`'s job.
