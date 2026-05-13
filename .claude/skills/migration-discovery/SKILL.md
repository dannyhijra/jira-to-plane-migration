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

### Workspace level
- All existing projects (in case `<PROJECT>` already has a stub)
- Workspace members with `user_id` and email — this is the lookup we use for assignee resolution
- Default state groups (should be the standard 5)
- Default priorities (should be the standard 5)

### Per-project (if a Plane project already exists for `<PROJECT>`)
- Existing states and their state_group
- Existing labels
- Existing custom properties on work item types

## Output format

Write everything to `discovery/<PROJECT>.md`:

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

## Plane current state

### Workspace members (resolvable for assignee)
| user_id | email |
| ------- | ----- |
| ...     | ...   |

### Existing projects
| identifier | name |
| ---------- | ---- |
| ...        | ...  |

### State groups available
backlog, unstarted, started, completed, cancelled (default)

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
