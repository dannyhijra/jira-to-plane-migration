# Discovery: IHH

Generated: 2026-05-20 by Claude Code
Source project: **IT Hijra Helpdesk** (IHH, key 10028, **software / company-managed**, `simplified=false`)

> ⚠️ **Largest project so far (1694 issues, ~1.75× HBANK) and the first _helpdesk / ticketing_ project.** Unlike HBANK (an engineering backlog with epics, sub-tasks, hierarchy), IHH is **completely flat**: no epics, no sub-tasks, no parent links. Every ticket is a single work item built from a structured intake template (Intercom Ticket ID / Submitter Email / SLA / Attachment). The complexity here is **not** hierarchy — it's (a) volume, (b) a thicket of 16 custom fields, several of which are bug-template ADF blobs of uncertain content, and (c) integration/bot author accounts. Read **Decisions needed** carefully.

## Jira side

### Project summary

- Total issues: **1694** (key range IHH-28 … IHH-1774; created 2021-09-09 … 2026-05-20, ~4.7 years). Span of 1747 keys, 1694 present → ~53 deleted; IHH-1…27 never existed. Verified via full unique-key pagination (17 pages × 100).
- Issue types: **5 in use** (Support, Production Bug, Incident, Task, Improvement) — the project _configures_ 11 types incl. Epic/Sub-task, but **none of the hierarchy types are used**.
- Statuses in use: **4** (Done, To Do, In Progress, In Review)
- Priorities: **5, all actively used** (unlike business projects)
- Sprints: **none** (no Sprint custom field values) → no Plane cycles
- Epics: **0** → no Plane modules
- Sub-tasks / parent links: **0** → flat; no `parent_id` handling needed
- Descriptions: **1694 / 1694 (100%)** — every ticket has the structured helpdesk template
- Comments: **259** across **197 issues**
- Attachments: **214 files** across **110 issues**
- Issue links: **15 issues** carry links (17 link-ends)
- Distinct human users (creators ∪ assignees ∪ comment authors): **~40** (all with visible email; **no privacy-hidden accounts**), **+2 integration/bot accounts**

### Issue types

| Type           | Count | hierarchy | Notes |
| -------------- | ----- | --------- | ----- |
| Support        | 1473  | 0         | the helpdesk request — bulk of the project |
| Production Bug | 185   | 0         | production defect tickets |
| Incident       | 31    | 0         | incident tickets |
| Task           | 4     | 0         | stray |
| Improvement    | 1     | 0         | stray |

> Plane CE has **no work-item types** (see `config/_plane.md`). All 5 types collapse into generic Plane work items unless the distinction is preserved as a label. Given 89% are "Support", a `type:` label family is low-value here vs HBANK — decision below.

### Statuses

| Jira status | Count | Category    | Proposed Plane state group |
| ----------- | ----- | ----------- | -------------------------- |
| Done        | 1340  | Done        | completed                  |
| To Do       | 300   | To Do       | unstarted                  |
| In Progress | 37    | In Progress | started                    |
| In Review   | 17    | In Progress | started                    |

Proposal: seed the Plane project with the **4 statuses verbatim** (same verbatim precedent as HIJ/HLRS/HDR/LRP/HBANK), plus default `Backlog` (future tickets) and `Cancelled`. `In Review` → `started` matches the existing `II` custom state.

### Priorities

| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| High          | 731   | high                    |
| Highest       | 714   | urgent                  |
| Medium        | 123   | medium                  |
| Low           | 122   | low                     |
| Lowest        | 4     | low *(or none?)*        |

Unlike HBANK (everything Medium), IHH **actively triages priority** — High/Highest dominate (helpdesk SLA culture). All 5 mapped 1:1 except `Lowest` (4 issues) flagged.

### Labels

| Label          | Count | Note |
| -------------- | ----- | ---- |
| IBA            | 411   | |
| support        | 303   | generic |
| Salman         | 263   | |
| Hardcode       | 201   | |
| IAM            | 139   | |
| jira_escalated | 89    | automation-applied? |
| jira_update    | 39    | automation-applied? |
| Parameter      | 5     | |
| VPN            | 3     | |
| suppot         | 1     | **typo of `support`** → consolidate? |
| Hijra          | 1     | |
| Mobile         | 1     | |
| Metabase       | 1     | |

Proposal: keep verbatim, **except consolidate `suppot` (1) → `support`**. Flag whether `jira_escalated`/`jira_update` are meaningful or automation noise.

### Custom fields (only those with values on ≥1 issue; prevalence = count / 1694)

| Field id          | Name                          | Type     | Sample values                              | Prevalence | Proposed action |
| ----------------- | ----------------------------- | -------- | ------------------------------------------ | ---------- | --------------- |
| customfield_10019 | Rank                          | lexorank | `2\|hzpk87:`                               | 100%       | **drop** (board ordering) |
| customfield_10000 | Development                   | dev panel| `{pullrequest=…state=MERGED}`              | 100%       | **drop** (Jira git/PR integration) |
| customfield_10094 | Steps to Reproduce            | ADF      | `1. <action 1> 2. <action 2> 3. ...`       | 97%        | **drop** — verified 100% boilerplate (1639× identical scaffold, 0 real) |
| customfield_10095 | Expected vs Actual Results    | ADF      | `**Expected Results** **Actual Results**`  | 97%        | **drop** — verified 100% boilerplate (1639× identical) |
| customfield_10131 | Hijra App User Type           | option   | `Non User`, `User Retail`, `User Business` | 84%        | **property:User Type** (footer) — 3 real values |
| customfield_10132 | SLA Information               | option   | `1 Hari`, `1 Hari Kerja`, `2 Hari Kerja`   | 84%        | **property:SLA Information** (footer) — 10 real values |
| customfield_10025 | [CHART] Time in Status        | gadget   | `3_*:*_1_*:*_…`                            | 79%        | **drop** (Jira chart gadget) |
| customfield_10030 | Checklist Progress            | string   | `Checklist: 0/3`                           | 79%        | **drop** |
| customfield_10031 | Checklist Progress %          | number   | `0`                                        | 79%        | **drop** |
| customfield_10139 | ticket_source                 | string   | `gform` (1297×), 1 corrupt                 | 77%        | **drop** — verified constant (`gform` only) |
| customfield_10146 | Requirement                   | ADF      | `**Please describe in detail**`            | 74%        | **drop** — verified 100% boilerplate (1252× identical) |
| customfield_10191 | Tribe/Stream                  | option   | `-`                                        | 65%        | **drop** — verified dead (only value = `-`) |
| customfield_10192 | Type Of Request               | option   | `-`                                        | 65%        | **drop** — verified dead (only value = `-`) |
| customfield_10103 | Reason                        | ADF      | `Need to turn it off before…`, `Kebutuhan Transaksi` | 65% | **property:Reason** (footer) — 840 distinct real texts |
| customfield_10164 | Impact Reason                 | ADF      | `Transaksi tidak dapat di jalankan`        | 65%        | **property:Impact Reason** (footer) — 758 distinct real texts |
| customfield_10024 | [CHART] Date of First Response| datetime | `2022-05-05T13:49:…`                       | 11%        | **drop** (Jira chart gadget) |

> ✅ **ADF-blob risk resolved by inspection** (`scripts/inspect-ihh-fields.ts`): of the 5 ADF fields, **3 are 100% template boilerplate** (Steps to Reproduce, Expected vs Actual, Requirement — one identical scaffold text repeated on every issue, never filled) → **drop**. **2 carry genuine free-text** (Reason: 840 distinct, Impact Reason: 758 distinct) → keep.
> ⚠️ **Mechanism note:** the `"description"` custom-field action is currently a **no-op** in `src/mappers/description.ts` (only the migration prefix, the main ADF body, and `property:*` footer lines are rendered). To actually preserve Reason / Impact Reason / User Type / SLA they must be `property:<name>` — they then appear in the `<!-- migrated-custom-fields -->` footer as labeled lines. All 4 kept fields use `property:`.

### Sprints

**None.** No Sprint custom field values → **no Plane cycles**.

### Epics

**None.** No `issuetype = Epic` → **no Plane modules**.

### Sub-tasks

**None.** `withParent = 0`, no sub-task issue types in use → flat project, no `parent_id` ordering constraint.

### Issue links

| Jira link type   | Count | Proposed Plane relation |
| ---------------- | ----- | ----------------------- |
| Relates          | 11    | `relates`               |
| Cloners          | 4     | `relates` *(verify in-project; DEPLOY skipped cross-project Cloners)* |
| Story Task       | 1     | drop / `relates`        |
| migration_parent | 1     | **drop** (prior-migration artifact, same as HBANK) |

Tiny volume (17 ends / 15 issues). Investigate cross-project targets at link-migration time; otherwise minor.

### Users

**Creators (14 incl. bots):** Agus Haryanto `aharyanto@alamisharia.co.id` (1260 — primary intake dispatcher), efazrin (204), **Infra Automation `infra-automation@alamisharia.co.id` (114 — BOT)**, **Zendesk Support for Jira (91 — BOT, no email)**, rikadakbar (10), then a small tail (rhabibie, djaman, madli, mtadarus, nrabbani, rmunandar, eariyansyah, nrabbani, fnurul ≤4 each).

> `created_by` is cosmetic in Plane (always the API-key owner) — bot creators are harmless; original author is preserved in the migration prefix.

**Assignees (17, excl. UNASSIGNED = 746):**

| email | assigned | in Plane? |
| ----- | -------- | --------- |
| efazrin@hijra.id | 711 | ✅ member |
| budiyono@hijra.id | 134 | ❌ **invite** |
| amuntasir@alamisharia.co.id | 68 | ❌ **invite** |
| aharyanto@alamisharia.co.id | 9 | ❌ invite |
| jnurohman@hijra.id | 6 | ✅ member |
| rikadakbar@hijra.id | 3 | ❌ invite |
| rhabibie@hijra.id | 3 | ❌ invite |
| gprasetyoadi@hijra.id | 3 | ❌ invite |
| samelia@hijra.id | 2 | ❌ invite |
| muzizat@hijra.id | 2 | ✅ member |
| apajar@hijra.id | 1 | ❌ invite |
| rsetiandy@alamisharia.co.id | 1 | ❌ invite |
| eariyansyah@hijra.id | 1 | ✅ member |
| ahakim@hijra.id | 1 | ❌ invite |
| dramadhan@hijra.id | 1 | ❌ invite |
| ldurachman@alamisharia.co.id | 1 | ✅ member |
| fnurul@hijra.id | 1 | ❌ invite |

> **715 / 948 assigned items auto-resolve** (efazrin 711 + muzizat 2 + eariyansyah 1 + ldurachman 1, all members). The two assignees that matter most for reassignment are **budiyono (134)** and **amuntasir (68)** — invite them or 202 items stay unassigned.

**Comment authors (~29):** budiyono (125), efazrin (20), **Zendesk (18 — BOT)**, rikadakbar (12), mtadarus (11), ranisa (11), azain (8), wardana (7), wfridayoka (6), fbelladina (5), rhezac (4), then ≤3: brifai, djaman, jputra, gunturvirgenius, rhabibie, ialawi, jnurohman, gprasetyoadi, amuntasir, aaziz, rfauzi, rsetiandy, dpamudji, eariyansyah, myanuar, ldurachman, samelia, muhakbar.

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md) (re-verified this run: membership unchanged at **11**; DEPLOY project already recorded). Below is only what's specific to IHH.

- **Target project**: does NOT yet exist in Plane → create new.
- **Proposed identifier**: `IHH`
- **Proposed name**: `IT Hijra Helpdesk`
- **Proposed state seed**: 4 Jira statuses verbatim (Done→completed, To Do→unstarted, In Progress→started, In Review→started) + default `Backlog` + `Cancelled`.
- **Proposed label seed**: 12 verbatim labels (consolidating `suppot`→`support`). No generated label families — type/metadata go to footer, not labels.
- **Assignee overlap with current 11 members**: **5 present** — efazrin, muzizat, eariyansyah, jnurohman, ldurachman (+ dcahyono API owner). Everyone else needs invitation.
- **Stage 1 invitation list — 32 humans** (all visible emails; bots Zendesk + Infra Automation excluded — their authorship is cosmetic):

  **@hijra.id (25):** budiyono, rikadakbar, rhabibie, gprasetyoadi, samelia, apajar, ahakim, dramadhan, fnurul, ranisa, mtadarus, wardana, wfridayoka, fbelladina, rhezac, brifai, jputra, gunturvirgenius, aaziz, rfauzi, dpamudji, muhakbar, djaman, madli, nrabbani

  **@alamisharia.co.id (7):** aharyanto, amuntasir, rsetiandy, azain, ialawi, myanuar, rmunandar

  > Many are **comment-only / creator-only, low-touch** (1 comment). For faithful migration only assignees strictly need accounts; the rest are optional. **budiyono + amuntasir are mandatory** (134 + 68 assignments). User may trim the optional tail.

## Decisions (resolved 2026-05-20)

- [x] **Plane project**: create new, identifier `IHH`, name `IT Hijra Helpdesk`.
- [x] **Status mapping**: seed the **4 Jira statuses verbatim** + default `Backlog` + `Cancelled`. Groups: Done→completed, To Do→unstarted, In Progress→started, In Review→started.
- [x] **Priority mapping**: Highest→urgent, High→high, Medium→medium, Low→low, **Lowest→low**.
- [x] **Custom fields** (only `property:` is honored by the code; `description` is a no-op):
  - **Keep → footer (`property:`):** Reason → `property:Reason`, Impact Reason → `property:Impact Reason`, Hijra App User Type → `property:User Type`, SLA Information → `property:SLA Information`.
  - **Drop (verified boilerplate):** Steps to Reproduce, Expected vs Actual Results, Requirement.
  - **Drop (verified dead/constant):** Tribe/Stream, Type Of Request, ticket_source.
  - **Drop (Jira-internal/gadget):** Rank, Development, [CHART] Time in Status, [CHART] Date of First Response, Checklist Progress, Checklist Progress %.
- [x] **Issue-type label**: **skip** — no `type:` label family (89% are "Support"; low value).
- [x] **Labels**: keep the rest verbatim, **consolidate `suppot` (1) → `support`**. `jira_escalated` / `jira_update` kept verbatim.
- [x] **Issue links**: Relates → `relates`; Cloners (4) → `relates` **unless cross-project** (skip cross-project, per DEPLOY precedent); **drop** Story Task (1) + migration_parent (1, prior-migration artifact). Verify Cloners targets at link-migration time.
- [x] **Invitation list**: **invite all 32 humans** (25 `@hijra.id` + 7 `@alamisharia.co.id`; see list above). Bots (Zendesk, Infra Automation) excluded.
- [x] **Attachments**: **include in the run** (214 files). Expect ~6–7 `.sql`/octet-stream **placeholder** fallbacks (same as DEPLOY); data preserved as placeholder + manifest note. Refresh `PLANE_COOKIE_HEADER` before the run.
- [x] **Comments**: migrate all 259. Author prefix per `migration-user-strategy` (bot authors render as displayName).
- [x] **Submitter Email in description text**: internal-staff requester emails in the helpdesk template — **migrate as-is** (no special handling).
- [x] **Scale / scope**: **migrate all 1694** (every type and age, incl. the 5 Task/Improvement strays and ancient Done). Entity order: issues → comments → links → attachments (no epics/sprints/sub-tasks). Pilot-then-`--resume`-scale; long run expected.
- [x] **Exclusions**: **none.**

Next: `/migrate-configure IHH`.
