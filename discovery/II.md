# Discovery: II

Generated: 2026-05-20 by Claude Code

Jira project `II` = **IT & Infrastructure** (Jira project id 10362, team-managed software, `simplified: true`).
Target Plane project `II` = **IT & Infrastructure** — **already exists** (`90adce1b-a90b-4bde-9898-41f22d23c73c`). This is the workspace's oldest/canonical project and the source of the `_plane.md` member table.

> ## 🛑 CRITICAL: Plane II holds only Jira's first 33 issues (partial seed)
>
> Plane II has **33 live work items** — enumerated directly via the REST API (`GET /api/v1/.../issues/`; the MCP `list_work_items` 404s but the canonical endpoint works). Breakdown: Backlog 8 · In Progress 6 · Todo 6 · Done 13. (Plane's `sequence_id` reaches ~409 only because it's a monotonic high-water mark; deletes don't lower it.)
>
> **Diff result (matched on normalized summary): all 33 map 1:1 to Jira, and they are exactly Jira II-1 … II-34 minus II-5.** Zero Plane-only items. Plane seq 377–409 ↔ Jira II-1…II-34, e.g. Plane II-407↔Jira II-1 "Cost Optimalization", II-403↔II-6 "Find Jira Alternative", II-409↔II-7 "Troubleshoot Thanos Compactor". So Plane II was **partially seeded with only the initial batch** (Mar-2025 trial era), not dual-maintained.
>
> **Gap = ~340 Jira issues with no Plane twin** (II-5 plus II-35 … II-386). These are the import candidates. The 33 already-present items were hand-created (not via our migrator), so the manifest doesn't know them — a key-based gap-fill that imports only the ~340 missing issues avoids duplicating them. Full diff tables: `/tmp/ii_diff/plane_matched.tsv`, regenerate via `scripts/list-ii-plane.ts`.

## Jira side

### Project summary
- Total issues: **373** (II-1 … II-386; keys 1–386 with gaps from cross-project moves/deletes)
- Sprints: **negligible** — only 3 issues (II-7/8/9, early Mar 2025, all Done) ever carried a sprint value; the team plans via monthly Epic buckets, not sprints
- Epics: **30** (used as planning buckets — see below)
- Sub-tasks: **0**
- Distinct issue-role users: **6** (creator/assignee/reporter; comment-author enumeration deferred — see Users)
- Custom business fields populated: **none** (only Jira system fields)

### Issue types
| Type | Count |
| ---- | ----- |
| Task | 343   |
| Epic | 30    |

No sub-tasks. Tasks: 241 sit under an Epic (parent), 101 are top-level.

### Statuses
All 6 distinct Jira statuses map 1:1 onto the 6 states **already present** in Plane II.

| Jira status | (Jira category) | Count | Proposed Plane state (group) |
| ----------- | --------------- | ----- | ---------------------------- |
| Done        | Done            | 299   | Done (completed)             |
| Todo        | To Do           | 42    | Todo (unstarted)             |
| Backlog     | In Progress*    | 12    | Backlog (backlog)            |
| In Progress | In Progress     | 10    | In Progress (started)        |
| Cancelled   | Done            | 6     | Cancelled (cancelled)        |
| Need Review | In Progress     | 4     | In Review (started)          |

\* Jira's "Backlog" status is oddly categorized `indeterminate/In Progress`, but semantically it is a backlog state → propose Plane "Backlog". Confirm.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 370   | medium                  |
| Highest       | 2     | urgent                  |
| High          | 1     | high                    |

No Low/Lowest present. (Plane default for unmapped = none.)

### Labels
Jira II has **10** labels; Plane II currently has only **2** (Hijra, Alami). The other 8 do not exist in Plane yet.

| Label         | Count | In Plane II already? |
| ------------- | ----- | -------------------- |
| Hijra         | 42    | ✅ yes                |
| Alami         | 28    | ✅ yes                |
| Production    | 13    | ❌ create             |
| Infra-Tools   | 4     | ❌ create             |
| Staging       | 3     | ❌ create             |
| Monitoring    | 3     | ❌ create             |
| Github-Action | 3     | ❌ create             |
| ITSupport     | 2     | ❌ create             |
| Data          | 2     | ❌ create             |
| Documentation | 1     | ❌ create             |

### Custom fields
No **custom business fields** are populated on any sampled issue. Only Jira system/agile fields appear, all either null or system-internal:

| Field id          | Name (Jira system)   | Type   | Sample values        | Proposed action |
| ----------------- | -------------------- | ------ | -------------------- | --------------- |
| customfield_10019 | Rank (LexoRank)      | string | `2\|i02a6d:`, `2\|i019h1:i` | drop (system ordering) |
| customfield_10015 | Start date           | date   | null                 | drop            |
| customfield_10021 | Flagged              | array  | null                 | drop            |
| customfield_10001 | Team                 | option | null                 | drop            |

→ Nothing to map to Plane properties / description footer. (Also moot per the CE custom-property limitation in `_plane.md`.)

### Sprints
Effectively unused. JQL `sprint IS NOT EMPTY` → 3 issues (II-7, II-8, II-9), all early-Mar-2025, all Done. A Plane cycle "Sprint 1" already exists in II (empty). Recommend **skip cycles** entirely.

### Epics
30 Epics, used as **planning buckets**, two flavors: monthly "BAU - <Month>" rollups and themed initiatives. 241 Tasks reference an Epic parent. Top child-count epics:

| Children | Epic | Summary |
| -------- | ---- | ------- |
| 29 | II-102 | Non-prod Migration to On Prem - Hijra |
| 25 | II-24  | Misc |
| 21 | II-1   | Cost Optimalization |
| 16 | II-294 | Misc - Q1 2026 |
| 12 | II-267 | Slack Migration to Google Chat |
| 11 | II-358 | Misc - Q2 2026 |
| 9  | II-304 | Split Bill Alami & Hijra |
| …  | …      | (12× "BAU - <Month>" Aug 2025 → Mei 2026, ~7 children each) |

5 sample epic summaries: `Cost Optimalization` (II-1), `Compliance` (II-23), `Misc` (II-24), `Security` (II-47), `Non-prod Migration to On Prem - Hijra` (II-102).

### Users
Distinct users across creator/assignee/reporter roles. Activity = # of II issues where they appear in any of those 3 roles. 56 issues are unassigned.

| accountId | displayName | email | activity | In Plane already? |
| --------- | ----------- | ----- | -------- | ----------------- |
| 62f9c27a0268bddf1c90db6f | Lukmanul Hakim Durachman | ldurachman@alamisharia.co.id | 315 (high) | ✅ |
| 60b7435748b89500696d6517 | Jati Nurohman | jnurohman@hijra.id | 105 (high) | ✅ |
| 613c1e6514e834007116b1c1 | Efriliawan Noor Fazrin | efazrin@hijra.id | 57 (med) | ✅ |
| 6278a447ea6ca0006972c539 | Fitra Adhitya Sandi | fsandi@alamisharia.co.id | 25 (med) | ❌ invite |
| 62b1979499eafa602d885529 | Ainun Abdullah | aabdullah@alamisharia.co.id | 25 (med) | ❌ invite |
| 6029de407f77e3006893119a | Aris Noor Setyo | asetyo@alamisharia.co.id | 15 (low) | ❌ invite |

**Comment authors — full scan done** (all 373 issues, decided): **285 comments across 172 issues**, no pagination truncation. **5 distinct comment authors, all already in the 6-user table above** (ldurachman, jnurohman, aabdullah, fsandi, efazrin; asetyo never commented). **Zero new users** introduced by comments → invitation list below is complete.

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md) — re-checked this run and **current** (captured 2026-05-20, II present, 11 members, "In Review" custom state present). No `_plane.md` rewrite needed.

- **Target project: EXISTS, holds 33 items (Jira's first batch only)** (`90adce1b-a90b-4bde-9898-41f22d23c73c`). Set up Mar 2025; only the initial ~34 issues were ever seeded.
  - **States (6, full template):** Backlog (backlog, default), Todo (unstarted), In Progress (started), In Review (started), Done (completed), Cancelled (cancelled). Exactly matches the proposed status mapping — no state seeding required.
  - **Labels (2):** Hijra, Alami. 8 more Jira labels need creating (table above).
  - **Modules (1):** "Cost Optimalization" — 5 items, lead ldurachman. All 5 match Jira II issues by summary. (To be **deleted** in the wipe.)
  - **Cycles (1):** "Sprint 1" — 0 issues, empty. (To be **deleted** in the wipe.)
  - **Existing work items: 33 live = Jira II-1…II-34 (minus II-5).** Enumerated via REST `GET /api/v1/.../issues/` (MCP `list_work_items`/`search_work_items`/`retrieve_work_item_by_identifier` all 404 on CE; the v1 issues endpoint with `X-API-Key` works fine — see `scripts/list-ii-plane.ts`). All 33 match Jira by summary; none are Plane-only. Gap to import ≈ **340** issues (II-5, II-35…II-386).
  - **Members (11):** full workspace roster (matches `_plane.md`).
- **Assignee overlap:** 3 of 6 Jira users already members (ldurachman, jnurohman, efazrin). 3 missing.
- **Stage 1 invitation list (Jira users not yet in Plane):**
  - fsandi@alamisharia.co.id (Fitra Adhitya Sandi)
  - aabdullah@alamisharia.co.id (Ainun Abdullah)
  - asetyo@alamisharia.co.id (Aris Noor Setyo)
- **Proposed Plane project identifier:** n/a — reuse existing `II`.
- **Proposed state seed:** none — reuse existing 6 states as-is.

## Decisions — RESOLVED (2026-05-20, with user)

All confirmed. Inputs for `/migrate-configure II`:

- [x] **Q1 — Strategy: WIPE + MIGRATE FRESH.** Delete all 33 existing Plane II work items + the "Cost Optimalization" module + the "Sprint 1" cycle, then import all 373 Jira issues clean for a faithful 1:1 mirror. The 33 are hand-seeded re-entries of Jira II-1…34 (Plane keys 377–409) with no apparent Plane-only data. ⚠️ Implementation note: wipe must precede migrate; needs a delete path (REST `DELETE /api/v1/.../issues/{id}/` per `scripts/list-ii-plane.ts` auth — MCP `delete_work_item` likely available, verify) since the manifest can't see hand-created items.
- [x] **Scope: FULL HISTORY** — import all 373 (incl. 305 Done/Cancelled). Exclude nothing.
- [x] **Status mapping (6→6):** Done→Done, Todo→Todo, Backlog→Backlog, In Progress→In Progress, Cancelled→Cancelled, Need Review→In Review. ("Backlog" Jira status → Plane Backlog confirmed despite its In-Progress category.)
- [x] **Priority mapping:** Medium→medium, Highest→urgent, High→high. (No Low/Lowest present.)
- [x] **Labels: create all 8 missing verbatim** → Production, Infra-Tools, Staging, Monitoring, Github-Action, ITSupport, Data, Documentation (10 total with existing Hijra, Alami). No consolidation.
- [x] **Custom fields: DROP ALL** — no business fields populated; only Jira system fields.
- [x] **Epics → MODULES.** Create 30 Plane modules (one per Jira Epic), add each epic's child tasks to its module. Epics are not imported as work items. The pre-existing "Cost Optimalization" module is deleted in the wipe and recreated.
- [x] **Cycles: SKIP** — and delete the empty "Sprint 1" cycle during the wipe.
- [x] **Users:** 6 total (issue roles ∪ comment authors); comment scan added none. 3 already members; **invite fsandi, aabdullah, asetyo** (all @alamisharia.co.id). All emails clean, match Plane domains.
- [x] **Exclude:** nothing.

---
_Next step: `/migrate-configure II`._
