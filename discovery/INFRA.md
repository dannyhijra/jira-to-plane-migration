# Discovery: INFRA

Generated: 2026-05-20T17:05+07:00 by Claude Code
Jira project name: **Infrastructure Supporting Ticket** (key `INFRA`, id `10039`, team-managed / `simplified: true`)

## Jira side

### Project summary

- Total issues: **989** (987 Task, 2 Epic)
- Sprints (active/closed/future): **0 / 0 / 0** — no `Sprint` field populated on any issue (no Agile board data)
- Epics: **2** (21 tasks have a `parent` → epic membership)
- Distinct users (creator ∪ assignee ∪ reporter): **114** (comment authors not separately enumerated)
- Priority: **uniform** — every issue is `Medium` (never triaged)

> Note: this is a large, mostly-historical backlog — **928 / 989 (94%) are `Done`**. Distinct from the existing Plane `II` ("IT & Infrastructure") project, which came from a different Jira project and is already migrated.

### Issue types

| Type | Count |
| ---- | ----- |
| Task | 987   |
| Epic | 2     |

No sub-tasks → no `parent_id` chaining needed for sub-tasks (the only `parent` links are Task→Epic).

### Statuses

| Jira status | Count | Proposed Plane state group |
| ----------- | ----- | -------------------------- |
| Done        | 928   | Done (`completed`)         |
| To Do       | 23    | Todo (`unstarted`)         |
| Need Review | 12    | In Review (`started`) — reuse `II` custom state |
| Cancelled   | 11    | Cancelled (`cancelled`)    |
| TEMPLATES   | 8     | ❓ Backlog (`backlog`) — unusual; see decisions |
| In Progress | 7     | In Progress (`started`)    |

### Priorities

| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 989   | medium                  |

All issues are `Medium` — trivial 1:1, no real decision.

### Labels

11 distinct, all low-frequency. Proposed 1:1 unless you want to drop noise.

| Label | Count |
| ----- | ----- |
| Infrastructure | 4 |
| HIJRA-DEPLOY | 4 |
| Backend | 2 |
| Marcom | 1 |
| NDA | 1 |
| application_status | 1 |
| design | 1 |
| other | 1 |
| CFBot | 1 |
| SOAR | 1 |
| Server | 1 |

### Custom fields

Only 4 custom fields have non-null values; all are Jira-internal plumbing or epic-only cosmetics.

| Field id | Name | Type | Sample values | Proposed action |
| -------- | ---- | ---- | ------------- | --------------- |
| customfield_10019 | Rank | any (LexoRank) | `2\|hzqbnr:` | **drop** (Jira internal ordering) |
| customfield_10000 | Development | any (dev panel) | `{branch...}`, `{pullrequest...}` | **drop** (branch/PR cache, not user data) |
| customfield_10017 | Issue color | string | `purple` | **drop** (epic cosmetic, 2 issues) |
| customfield_10015 | Start date | date | `2022-02-21`, `2022-01-25` | drop, or `builtin:start_date` (only on the 2 epics) |

No business custom fields to migrate. (Descriptions exist on issues but were not counted here — the aggregator did not request the `description` field.)

### Epics

2 epics; both should map to Plane modules. 21 tasks reference an epic parent.

- INFRA-2 — Initiate keep up-time on 99,9%
- INFRA-3 — Initiate Monitoring Dashboard using Prometheus + Grafana

### Users

114 distinct users touched this project. **29 have assignments** (the set that matters for assignee resolution) — listed below with activity and current Plane membership. Full not-in-Plane sets are in the Plane section.

| email | displayName | assigned | in Plane? |
| ----- | ----------- | -------- | --------- |
| jnurohman@hijra.id | Jati Nurohman | 192 | ✅ |
| dramadhan@hijra.id | Dicky Ramadhan | 122 | invite |
| agutama@alamisharia.co.id | Agus Wibawa | 107 | invite |
| hpranoto@alamisharia.co.id | Heru Pranoto | 73 | invite |
| anasruddin@alamisharia.co.id | anan | 56 | invite |
| amahardi@alamisharia.co.id | Atwatan Malik Mahardi | 54 | invite |
| mdihsan@alamisharia.co.id | Maulid Ihsan | 50 | invite |
| aafinas@alamisharia.co.id | Achmad Mu'ammar Afinas | 45 | invite |
| danuaw@alamisharia.co.id | Danu | 39 | invite |
| rsulistyo@hijra.id | Rheno Sulistyo | 25 | invite |
| mromdony@alamisharia.co.id | Mochamad Taufik Romdony | 22 | invite |
| ldurachman@alamisharia.co.id | Lukmanul Hakim Durachman | 19 | ✅ |
| ayulizar@hijra.id | Ananda Yulizar Muhammad | 16 | invite |
| aroziqin@alamisharia.co.id | Ahmad Irsyadur Roziqin | 12 | invite |
| wardana@hijra.id | Wahyu Muqsita Wardana | 7 | invite |
| aferdinand@alamisharia.co.id | Aldi Ferdinand | 7 | invite |
| aabdullah@alamisharia.co.id | Ainun Abdullah | 7 | invite |
| framdhani@alamisharia.co.id | Fajar Ramdhani | 6 | invite |
| asurbakti@alamisharia.co.id | Agung Wibowo | 4 | invite |
| gunturvirgenius@hijra.id | Guntur Vo | 3 | invite |
| mihidayat@alamisharia.co.id | Muhammad Ilham Hidayat | 2 | invite |
| wfridayoka@hijra.id | Wahidyan Kresna Fridayoka | 1 | invite |
| smaizir@alamisharia.co.id | Sirajuddin Maizir | 1 | ✅ |
| jardita@alamisharia.co.id | Jaka Ardita | 1 | invite |
| dpamudji@hijra.id | Deddy Pamudji | 1 | invite |
| dcahyono@hijra.id | Danny Dwi Cahyono (API key owner) | 1 | ✅ |
| bsuandi@alamisharia.co.id | Berri Suandi | 1 | invite |
| asaepudin@alamisharia.co.id | Acep Saepudin | 1 | invite |
| apradana@hijra.id | Anggi Rifa Pradana | 1 | invite |

Domain split across all 114 distinct: 71 `@alamisharia.co.id`, 43 `@hijra.id`. All users have visible emails (no email-less accounts).

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md) (refreshed this run — added the `DEPLOY` project; membership unchanged at 11). Below is only what's specific to `INFRA`.

- **Target project: does NOT exist yet.** No Plane project for "Infrastructure Supporting Ticket". The existing `II` ("IT & Infrastructure", 11 members) is a *different* already-migrated project — do not conflate. → **create new** (decision below: new project vs merge into `II`).
- **Proposed Plane project identifier:** `INFRA` (5 chars, not in use).
- **Assignee overlap with current Plane members:** of 29 assignees, **4 already in Plane** (jnurohman, ldurachman, smaizir, dcahyono); **25 need invites** for assignee resolution to land.
- **Stage 1 invitation list:**
  - Minimal (assignees only): **25 emails** not yet in Plane.
  - Full universe (all 114 distinct minus the 11 Plane members): **107 emails**.
- **Proposed state seed:** Backlog, Todo, In Progress, **In Review** (custom, for `Need Review`), Done, Cancelled — same template as `II`. Plus a decision on where `TEMPLATES` goes.

## Decisions (RESOLVED 2026-05-20)

- [x] **New project vs merge:** → **create new Plane project `INFRA`** (identifier `INFRA`).
- [x] **Scope / volume:** → **migrate all 989** incl. 928 Done (full archive).
- [x] **`TEMPLATES` status (8):** → **add custom "Templates" state**, group `backlog`.
- [x] **Status mapping:** confirmed — Done→Done, To Do→Todo, Need Review→In Review, In Progress→In Progress, Cancelled→Cancelled, TEMPLATES→Templates.
- [x] **Priority:** confirmed all `medium`.
- [x] **Labels (11):** → **keep all 11 verbatim** (1:1).
- [x] **Custom fields:** drop Rank + Development + Issue color; **Start date → `builtin:start_date`**.
- [x] **Epics (2):** → migrate as 2 modules (INFRA-2, INFRA-3).
- [x] **Sprints:** confirmed none → no cycles.
- [x] **Invite scope:** → **invite all 107** (DEPLOY precedent).
- [x] **Email mismatches:** none email-less; no flags.
- [x] **Anything NOT to migrate?** No — full migration.

### State seed for `config/projects.yaml`

| name | group | notes |
| ---- | ----- | ----- |
| Backlog | backlog | default |
| Templates | backlog | **custom** — for Jira `TEMPLATES` status |
| Todo | unstarted | default |
| In Progress | started | default |
| In Review | started | custom (reuse from II) — for `Need Review` |
| Done | completed | default |
| Cancelled | cancelled | default |
