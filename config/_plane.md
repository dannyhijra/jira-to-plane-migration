# Discovery: Plane workspace (global)

Workspace-wide Plane state captured once and referenced by every per-project discovery doc. Refresh when membership or workspace structure changes, not per Jira project.

Last captured: 2026-05-19 by Claude Code (refreshed during HIJ discovery — HLRS project added since prior capture)
Workspace slug: `hijra`
Base URL: `https://plane.hq.hijra.dev`

## Access notes

- Plane sits behind Cloudflare Access (HTTP 302 → `hijrabank.cloudflareaccess.com`). VPN is required for the Plane MCP and for the migrator runtime to reach the API. No service-token bypass currently configured.
- MCP endpoint coverage: `get_project_members`, `list_projects`, `list_states`, `list_labels` work. `get_me`, `get_workspace_members`, and `get_workspace_features` / `get_project_features` return HTTP 404 against this Plane version. Workspace members are read from `get_project_members` on any existing project as a proxy.

## Existing projects

| identifier | name                 | id                                     |
| ---------- | -------------------- | -------------------------------------- |
| II         | IT & Infrastructure  | 90adce1b-a90b-4bde-9898-41f22d23c73c   |
| PROJE      | Compliance           | cb2d65e7-5dc0-4588-89c1-f41299f91aa7   |
| LDRH       | Legal Review Request | 73de3f92-3f2d-4355-a6e0-bc84ed313e5e   |
| LRP        | Legal Request PKS    | ec9b3331-893a-468b-89b2-f8801c97a5af   |
| ARH        | Anyur Request        | ef603ac8-09d4-413f-ab6e-b9aea65af65a   |
| HDR        | Document Request     | a9f5d28f-72e0-4e3c-af57-d8357c22c7cf   |
| HLRS       | Legal Review SP3     | 6328c439-cf0b-4e44-b779-73c82201fa29   |

Add a row here whenever a new Plane project is created. Per-project discovery docs should note "new — to be created" if the target Jira key has no Plane equivalent yet.

## Workspace members (resolvable for assignee)

Sourced from project `II` (11 members). All `*@hijra.id` except where noted.

| user_id                                | email                          | display_name |
| -------------------------------------- | ------------------------------ | ------------ |
| b898280f-70bf-4964-9f70-1d4c97e52e75   | apaksi@hijra.id                | apaksi       |
| 2ca18977-01d5-4818-9056-e562d5cc736e   | tjafar@hijra.id                | tjafar       |
| bc98142a-b544-4c1a-abca-f78a6d5c062f   | maidzola@hijra.id              | maidzola     |
| d8c431e0-966e-4ac5-9396-a6afb9cdcc1b   | eariyansyah@hijra.id           | eariyansyah  |
| cae459a5-9072-4c3c-b97b-528b1a2ca780   | muzizat@hijra.id               | muzizat      |
| f799f9fe-ed67-427c-8e51-199de6cd54a6   | dcahyono@hijra.id              | dcahyono (API key owner) |
| 20c34118-71a9-412d-8f85-06a705034b3b   | smaizir@alamisharia.co.id      | smaizir      |
| aec14099-3a9b-4647-bd69-5a7c8a24f092   | efazrin@hijra.id               | efazrin      |
| 21f50e41-656a-4b40-8de2-90fd16bf5f7d   | jnurohman@hijra.id             | jnurohman    |
| deb0c128-4a39-4214-9940-f6202f835676   | lukman@cnrg-labs.id            | lukman (external) |
| 7613414e-98f4-4eee-b3dd-16c983eb58d7   | ldurachman@alamisharia.co.id   | ldurachman   |

Profile: workspace is IT-staffed only as of now. Any per-project discovery doc should diff its Jira user set against this table to compute the Stage 1 invitation list.

## State groups + sample states (reference)

States are per-project in Plane — each new Plane project gets a fresh seed. This block records the **defaults** plus any custom states that have proven useful in existing projects, as a template.

| Plane state | Group     | Notes |
| ----------- | --------- | ----- |
| Backlog     | backlog   | default per-project seed |
| Todo        | unstarted | default per-project seed |
| In Progress | started   | default per-project seed |
| In Review   | started   | **custom** — added in `II`; reuse for Jira "REVIEW *" statuses |
| Done        | completed | default per-project seed |
| Cancelled   | cancelled | default per-project seed |

## Default priorities

Plane built-in: `urgent | high | medium | low | none`. Use these as targets in `config/mappings.yaml`.

## Decisions / notes that apply to every migration

- **Created_by + comment author**: always the API key owner (`dcahyono@hijra.id`) by Plane API design. Original authorship lives in the migration prefix. See `.claude/skills/migration-user-strategy/SKILL.md`.
- **Assignee resolution**: Jira email → look up in the table above. Miss = empty assignees + migration prefix.
- **Label seed**: every new Plane project is created label-empty. Per-project discovery doc decides which Jira labels become Plane labels.
- **Custom properties — Community Edition limitation**: This Plane instance is the open-source Community Edition. Work Item Types (the gateway to real custom properties on work items) is a **Pro-tier feature stripped from the Community build** — the `/features/` API endpoint returns 404 and the per-project toggle does not appear in the UI. As a result, any custom field configured as `property:<name>` in `config/mappings.yaml` is **rendered into a structured description footer** (`<!-- migrated-custom-fields -->`) rather than created as a real Plane property. The data is preserved and human-readable; promotion to real properties would require a Pro license + a one-off footer-to-property migrator. See `src/mappers/description.ts` (the renderCustomFieldFooter function) for the exact format.
