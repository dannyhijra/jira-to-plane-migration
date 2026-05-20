# Discovery: HBANK

Generated: 2026-05-20 by Claude Code
Source project: **Hijra Bank - Devs** (HBANK, key 10195, **software / team-managed** project, `simplified=true`)

> ⚠️ **This is the first _software_ project in the migration.** Every prior project (HIJ, HLRS, HDR, ARH, LRP, LDRH) was a single-issue-type business form intake. HBANK is a real engineering backlog: 6 issue types, an epic→child hierarchy (700 links), sub-tasks, issue links, and ~10× the volume. The decisions below are materially heavier than past projects — read the **Decisions needed** section carefully.

## Jira side

### Project summary

- Total issues: **967** (key range HBANK-1 … HBANK-968, 1 gap; created 2025-01-15 … 2026-05-19). Verified via Jira `approximate-count` API = 967 and unique-key pagination (0 duplicates). The Jira UI board/navigator shows a smaller filtered view (~167) — that is a default board filter (e.g. last-90-days ≈175 / To-Do ≈179), **not** the project total. Deleted issues never appear in JQL/count; the single key gap = 1 deleted issue across the whole range.
- Issue types: **6** (Task, Subtask, Story, Dev Bug, Prod Bug, Epic)
- Statuses in use: **8** (1 To Do, 6 In-Progress-category, 1 Done)
- Sprints: **none populated** — board has no active/closed sprint data (no `Sprint` custom field values on any issue)
- Epics: **48**, with **700** child issues linked to them
- Sub-tasks: **100** (linked to Story/Task/Dev Bug parents)
- Issue links: **159 issues** carry links (220 link-ends); types: Relates, Blocks, Polaris, migration_parent
- Descriptions: **411 / 967** non-empty
- Comments: **684** comments across **274 issues**
- Attachments: **819 files** across **205 issues**
- Distinct users (creators ∪ assignees ∪ comment authors ∪ QA-assignee): **~26** (23 with visible email, 3 email-hidden)

### Issue types

| Type     | Count | hierarchy | Notes |
| -------- | ----- | --------- | ----- |
| Task     | 614   | 0         | bulk of the backlog |
| Subtask  | 100   | -1        | needs `parent_id` in Plane |
| Story    | 79    | 0         | |
| Dev Bug  | 76    | 0         | custom bug type (internally-found) |
| Prod Bug | 50    | 0         | custom bug type (production) |
| Epic     | 48    | 1         | parent of 700 children → maps to Plane module |

> **Plane has no work-item types in this Community Edition build** (see `config/_plane.md` — Work Item Types is a stripped Pro feature). All 6 Jira types collapse into generic Plane work items unless we preserve the distinction another way (label / description). Decision needed below.

### Statuses

| Jira status              | Count | Category    | Proposed Plane state group |
| ------------------------ | ----- | ----------- | -------------------------- |
| Done                     | 552   | Done        | completed                  |
| To Do                    | 179   | To Do       | unstarted                  |
| Ready On Release         | 71    | In Progress | started                    |
| Ready for Testing (Main) | 68    | In Progress | started                    |
| In Review                | 34    | In Progress | started                    |
| Pause                    | 32    | In Progress | started *(or cancelled?)*  |
| In Progress              | 30    | In Progress | started                    |
| In Testing               | 1     | In Progress | started                    |

Proposal: seed the Plane project with all **8 custom states verbatim** (same verbatim-states precedent as HIJ/HLRS/HDR/LRP), plus the default `Backlog` (for future new tickets) and `Cancelled`. Group mapping per the table. **`Pause` is ambiguous** — it reads as "on hold" (still started) rather than abandoned (cancelled); flagged for confirmation.

### Priorities

| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 961   | medium                  |
| Highest       | 4     | urgent                  |
| Low           | 2     | low                     |

No `High / Lowest / None` populated. (Effectively everything is Medium — priority was not actively triaged in this project.)

### Labels

| Label             | Count |
| ----------------- | ----- |
| MISHA             | 9     |
| release-train     | 3     |
| PostgreSQL-to-16  | 3     |
| e2e-automation    | 1     |

Only **4 distinct labels**, sparse usage (unlike business projects there are no auto-applied form labels). Proposal: keep all 4 verbatim. (Squad fields below are a separate question — they could *also* become labels.)

### Custom fields (only those with values on at least one issue)

| Field id          | Name                  | Type           | Sample values                                  | Prevalence | Proposed action |
| ----------------- | --------------------- | -------------- | ---------------------------------------------- | ---------- | --------------- |
| customfield_10019 | Rank                  | any (lexorank) | `2\|i02ec7:`                                   | 100%       | **drop** (board ordering, no Plane equivalent) |
| customfield_10000 | Development           | any (dev panel)| `{pullrequest=…state=OPEN}`                    | 100%       | **drop** (Jira git/PR integration data, not user content) |
| customfield_10464 | Product Squads        | multi-select   | `Bank - Transactions`, `Bank - Platform`, `Bank - General`, `Bank - Funding` | 159 (16%) | **label** *(or property / description)* |
| customfield_10465 | Engineering Squads    | multi-select   | `Bank - Savings & Transactions`, `Bank - Lifecycle`, `Bank - Platform`, `Bank - Core Banking`, `Bank - Quality`, `Bank - Release Management` | 89 (9%) | **label** *(or property / description)* |
| customfield_10015 | Start date            | date           | `2026-05-19`, `2026-05-12`                     | 57 (6%)    | `start_date`    |
| duedate           | Due date (system)     | date           | —                                              | 58 (6%)    | `target_date`   |
| customfield_10017 | Issue color           | string         | `purple`, `yellow`, `dark_teal`                | 43 (4%)    | **drop** (UI cosmetic) |
| customfield_10138 | QA Assignee           | user (array)   | maidzola, ranisa, ijond, rgunawan              | 15 (2%)    | **description footer** (Plane has no second-assignee field) |
| customfield_10016 | Story point estimate  | number         | `5`                                            | 1 (<1%)    | **drop** *(or property)* — only one issue uses it |

Squad field option values in full:
- **Product Squads** (customfield_10464): Bank - Transactions (87), Bank - Platform (53), Bank - General (18), Bank - Funding (2)
- **Engineering Squads** (customfield_10465): Bank - Savings & Transactions (41), Bank - Lifecycle (20), Bank - Platform (13), Bank - Core Banking (13), Bank - Quality (3), Bank - Release Management (3)

### Sprints

**None.** No `Sprint` custom field values on any issue — the board is kanban-style, not scrum. → **No Plane cycles to migrate.**

### Epics

**48 epics, 700 child issues.** Epics are squad/initiative buckets, typically prefixed with a `[PROD…]` tag. 8 most-recent samples:

- HBANK-932 [PRODPlatform] eKYC API Migration from Metranet to VIDA
- HBANK-875 [PRODPlatform] Website TNC and Privacy Policy
- HBANK-841 [PRODTransactions] Direct Switching Artajasa (2026)
- HBANK-819 [PRODFunding] Deposito Payday April
- HBANK-814 [PRODTransaction] Teller Salman
- HBANK-772 [PRODFunding] Hijra Box Improvements
- HBANK-765 [PRODFunding] Hijra Box Qurban
- HBANK-763 [PRODFunding] Deposito THR

Established repo pattern (`src/migrators/modules.ts` + `epics.ts`) is **Epic → Plane module**, with child issues added to the matching module. ⚠️ Tradeoff to confirm below: a Plane module holds name + description but **not comments**; if any epic carries comments, mapping it to a module-only would drop them.

### Issue links

| Jira link type            | Count | Proposed Plane relation |
| ------------------------- | ----- | ----------------------- |
| Relates                   | 198   | `relates`               |
| Blocks                    | 12    | `blocked_by` / `blocking` |
| Polaris work item link    | 8     | **drop** (Jira Product Discovery cross-product link, no Plane target) |
| migration_parent          | 2     | **investigate / drop** (looks like an artifact of a prior migration) |

### Sub-tasks

100 sub-tasks. Parent issue-types: Story (92), Task (5), Dev Bug (3). → Plane **sub-issues via `parent_id`**; parents must be migrated before children (ordering constraint in the issues migrator).

### Users

**Distinct creators (15):**

| email | count |
| ----- | ----- |
| nalhumaira@hijra.id | 318 |
| maidzola@hijra.id | 232 |
| apaksi@hijra.id | 93 |
| eariyansyah@hijra.id | 81 |
| muzizat@hijra.id | 73 |
| ranisa@hijra.id | 47 |
| fbelladina@hijra.id | 38 |
| aalbaab *(no email in API)* | 34 |
| mabdullah@hijra.id | 30 |
| nirawan@hijra.id | 7 |
| dcahyono@hijra.id | 7 |
| rliskiyari@hijra.id | 3 |
| mnurfaqih@alamisharia.co.id | 2 |
| rramdhanisti@hijra.id | 1 |
| rgunawan@alamisharia.co.id | 1 |

**Distinct assignees (22, excl. UNASSIGNED=187):**

| email | count |
| ----- | ----- |
| maidzola@hijra.id | 232 |
| eariyansyah@hijra.id | 174 |
| muzizat@hijra.id | 120 |
| mabdullah@hijra.id | 103 |
| aalbaab *(no email)* | 36 |
| ranisa@hijra.id | 28 |
| mnurfaqih@alamisharia.co.id | 17 |
| dcahyono@hijra.id | 12 |
| muhakbar@hijra.id | 10 |
| tjafar@hijra.id | 9 |
| Rofi Rezkin *(no email)* | 8 |
| Muhammad Izzuddin *(no email)* | 8 |
| mfathurohman@hijra.id | 6 |
| nalhumaira@hijra.id | 5 |
| rliskiyari@hijra.id | 4 |
| fbelladina@hijra.id | 3 |
| jnurohman@hijra.id | 1 |
| rramdhanisti@hijra.id | 1 |
| djaman@hijra.id | 1 |
| rsulistyo@hijra.id | 1 |
| fmaulana@alamisharia.co.id | 1 |

**Comment authors (16, from inline scan of 684 comments):** dominated by nalhumaira (265), maidzola (167), muzizat (76), eariyansyah (72), ranisa (31). Adds **wfridayoka@hijra.id** (not a creator/assignee).

**QA Assignee field users (4):** maidzola, ranisa, **ijond@alamisharia.co.id**, rgunawan@alamisharia.co.id.

**Union: ~26 distinct identities** — 23 with visible email, **3 with email hidden by Jira privacy** (`aalbaab`, `Rofi Rezkin`, `Muhammad Izzuddin`). The 3 hidden ones are *active* contributors (aalbaab alone: 34 created / 36 assigned / 11 comments), so they must be resolved before invite/reassign — flagged below.

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md) (refreshed this run: HIJ project added; membership unchanged at 11). Below is only what's specific to HBANK.

- **Target project**: does NOT yet exist in Plane. Needs to be created.
- **Proposed Plane identifier**: `HBANK`
- **Proposed Plane name**: `Hijra Bank - Devs` (or shorten to `Hijra Bank`)
- **Proposed state seed**: 8 custom states verbatim from Jira + default `Backlog` + `Cancelled` (see Statuses table for group mapping).
- **Proposed label seed**: `MISHA`, `release-train`, `PostgreSQL-to-16`, `e2e-automation` (verbatim). If squads → labels is approved, add the 4 Product + 6 Engineering squad names too.
- **Assignee overlap with current Plane members (11)**: **7 already present** — apaksi, tjafar, maidzola, eariyansyah, muzizat, jnurohman, dcahyono (API owner). Remaining HBANK users need invitations.
- **Stage 1 invitation list — 16 with email:**

  nalhumaira@hijra.id, ranisa@hijra.id, fbelladina@hijra.id, mabdullah@hijra.id, nirawan@hijra.id, rliskiyari@hijra.id, rramdhanisti@hijra.id, muhakbar@hijra.id, mfathurohman@hijra.id, djaman@hijra.id, rsulistyo@hijra.id, wfridayoka@hijra.id, mnurfaqih@alamisharia.co.id, rgunawan@alamisharia.co.id, fmaulana@alamisharia.co.id, ijond@alamisharia.co.id

  **+ 3 email-hidden** (`aalbaab`, `Rofi Rezkin`, `Muhammad Izzuddin`) — resolve their `@hijra.id`/`@alamisharia.co.id` emails manually (Jira privacy hides them from the API) before inviting/reassigning.

## Decisions (resolved 2026-05-20)

- [x] **Issue-type preservation**: collapse the 6 Jira types into Plane work items, preserving type **as a label** on every item:
  - Task → `type:task`, Story → `type:story`, Prod Bug → `type:bug-prod`, Dev Bug → `type:bug-dev`
  - Sub-task → `type:subtask` (in addition to `parent_id` link); Epic work-item copy → `type:epic`
- [x] **Epic strategy**: **Module + epic work item.** Each of the 48 epics → a Plane module (its 700 children added to the matching module), AND the epic is *also* migrated as a work item (tagged `type:epic`) so its description + comments survive. Modules created for all 48 epics.
- [x] **Sub-task strategy**: **Sub-issues via `parent_id`.** Parents migrated before children (ordering constraint). All 100 parents are in-scope (migrate-everything), so no flattening needed.
- [x] **Status mapping**: seed Plane with all **8 Jira statuses verbatim** + default `Backlog` + `Cancelled`. Group mapping:
  - `Done` (552) → **completed**
  - `To Do` (179) → **unstarted**
  - `Ready On Release` (71) → **started**
  - `Ready for Testing (Main)` (68) → **started**
  - `In Review` (34) → **started**
  - `Pause` (32) → **started** (on hold, not abandoned)
  - `In Progress` (30) → **started**
  - `In Testing` (1) → **started**
- [x] **Priority mapping**: Highest→urgent, Low→low, Medium→medium.
- [x] **Custom fields**:
  - `customfield_10019` Rank → **drop**
  - `customfield_10000` Development → **drop**
  - `customfield_10017` Issue color → **drop**
  - `customfield_10016` Story point estimate → **drop**
  - `customfield_10015` Start date → Plane `start_date`
  - `duedate` Due date → Plane `target_date`
  - `customfield_10464` Product Squads → **labels**, prefix `squad:` (e.g. `squad:Bank - Transactions`)
  - `customfield_10465` Engineering Squads → **labels**, prefix `eng:` (e.g. `eng:Bank - Core Banking`)
  - `customfield_10138` QA Assignee → **description footer** (email recorded; not added to Plane assignees)
- [x] **Issue links**: Relates (198) → `relates`; Blocks (12) → `blocked_by`/`blocking`. **Drop** Polaris (8) and migration_parent (2).
- [x] **Labels**: keep the 4 Jira labels verbatim (`MISHA`, `release-train`, `PostgreSQL-to-16`, `e2e-automation`) **plus** the generated `type:`, `squad:`, `eng:` label families above.
- [x] **Attachments**: **include in the run** (not deferred). 819 files / 205 issues, same pass as issues+comments. ⚠️ Watch the Plane Cloudflare-cookie fragility seen on HIJ — refresh `PLANE_COOKIE_HEADER` before the run and monitor for placeholder fallback.
- [x] **Comments**: migrate all 684. Author prefix per `migration-user-strategy`.
- [x] **Scale / sequencing**: migrate all 967. Entity order: issues → comments → epics/modules → links → attachments. ~6× the previous largest (ARH 271) — pilot-then-`--resume`-scale; expect a long run.
- [x] **Exclusions**: **none.** All 967 issues migrate (incl. 187 unassigned To-Do, all 48 epics, Polaris-linked items).
- [x] **Plane project**: name `Hijra Bank - Devs`, identifier `HBANK`, create new.
- [x] **3 email-hidden users**: confirmed **not currently active** — do **not** invite, do **not** resolve to a Plane assignee. They flow through the standard unresolved-assignee path: empty Plane `assignees` + migration prefix capturing the original identity for the audit trail. Since Jira exposes no email, the prefix records **displayName** (+ accountId) instead of email. Accounts:
  - `aalbaab` — accountId `712020:b594d03b-2ef2-45e8-af29-ff89c44a078b` — created 34 / assigned 36 / 11 comments
  - `Rofi Rezkin` — accountId `712020:d7cea28c-0d56-4e1f-9f13-2e2913d49b7d` — assigned 8
  - `Muhammad Izzuddin` — accountId `712020:291d4f5d-707d-4352-9e32-efb63e7709d2` — assigned 8

  Stage 1 invitation list is therefore the **16 emailed users** above only.
