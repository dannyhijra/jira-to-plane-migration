# Discovery: HLRS

Generated: 2026-05-18 by Claude Code
Source project: **HIJRA - LEGAL REVIEW SP3** (HLRS, business project type, key 10232)

## Jira side

### Project summary

- Total issues: **379** (key range HLRS-1 … HLRS-383, gaps from deleted issues)
- Issue types: **Task** only — no Sub-task/Epic instances. Schema also exposes Sub-task, but zero present.
- Statuses in use: 4 custom statuses (no defaults)
- Sprints: none (business project; no Agile board)
- Epics: 0 (no Epic issue type configured for project usage)
- Issue links: 0 (none)
- Distinct users (creator/assignee/comments): ~26

### Issue types

| Type | Count |
| ---- | ----- |
| Task | 379   |

(Sub-task type defined in metadata but not used.)

### Statuses

| Jira status        | Count | Proposed Plane state group |
| ------------------ | ----- | -------------------------- |
| FINAL              | 267   | completed                  |
| FOLLOW UP USER     | 110   | started                    |
| REVIEW TIM LEGAL   | 1     | started                    |
| PERMINTAAN MASUK   | 1     | backlog                    |

All four are custom Jira statuses (no defaults like Open/Done). Proposal: seed Plane project with exactly these four custom states verbatim (same pattern as HDR).

### Priorities

| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 294   | medium                  |
| Highest       | 82    | urgent                  |
| High          | 3     | high                    |

No `Low / Lowest / None` usage.

### Labels

| Label             | Count |
| ----------------- | ----- |
| business-form     | 297   |
| business-form-63  | 297   |
| Trx-Restriction   | 1     |

`business-form` + `business-form-63` always co-occur (system-applied by Jira business form intake). 79 issues have no labels at all. Same auto-label pattern as HDR/ARH — kept for traceability in past projects.

### Custom fields (only those with values on at least one issue)

| Field id          | Name                                                           | Type           | Sample values                                                                                              | Proposed action  | Prevalence |
| ----------------- | -------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| customfield_10425 | MUAP, RISK REVIEW, KOMITE/MOM (SHARE GOOGLE DRIVE)             | url            | `https://drive.google.com/drive/folders/1S-8p4yTL-...`                                                     | `description`    | ~99% (376/379) |
| customfield_10426 | DRAFT SP3                                                      | url            | `https://docs.google.com/document/d/1qmRwvQi0poUtJJ7wMW-ekHxRdimb1ddL9XQwCCHvSkk/edit`                     | `description`    | ~99% (377/379) |
| customfield_10565 | PILIHAN SP3                                                    | option (select)| `REALISASI`, `PLAFOND`                                                                                     | `description`    | ~86% (326/379) |
| customfield_10424 | JENIS SP3                                                      | option (select)| `PLAFOND`                                                                                                  | `description`    | partial (newer-issue use, mixed across history) |
| customfield_10015 | Start date                                                     | date           | `2026-05-18`, `2025-07-29`                                                                                 | `description`    | partial    |
| duedate           | Due date (system)                                              | date           | `2025-07-31`                                                                                               | `description`    | minimal (single-digit issues use it) |
| customfield_10105 | Category (jwm-category)                                        | option         | null in samples                                                                                            | drop             | ~0%        |
| customfield_10001 | Team                                                           | team           | null                                                                                                       | drop             | 0%         |
| customfield_10021 | Flagged                                                        | multicheckboxes| null                                                                                                       | drop             | 0%         |

**Rationale for "description" actions**: the two Google URLs are the operational payload of every ticket — folding them into description preserves links during migration. `PILIHAN SP3` and `JENIS SP3` are select options carrying SP3 classification; fold-as-description keeps human readable context without per-property setup in Plane. Same approach as past projects (LRP/HDR), can be overridden to `property:<name>` if desired.

### Description / attachments / comments

- `description`: 56 of 379 issues have non-empty descriptions (older issues with ADF rich text; example HLRS-100 has `@mentions`).
- `attachment`: subset of issues carry uploaded PDFs (e.g., HLRS-100 has 1.5MB MoM PDF). Many older issues have no attachments. Same pattern as HDR — likely deferred.
- `comment`: present on a portion (HLRS-100 has 1 comment with ADF + @mentions). HLRS-383 (newest) has 0.

### Sprints

None — this is a business project without an Agile board. No `customfield_10020` (sprint field) present.

### Epics

None — Epic issue type is not configured for this project (only Task and Sub-task in metadata; no Epic instances).

### Users

**Distinct creators (18):** based on full pagination of issues.

| email                       | accountId (creator role count) |
| --------------------------- | ------------------------------ |
| fwidyatmoko@hijra.id        | 75 |
| tsuharmanto@hijra.id        | 73 |
| mghifari@hijra.id           | 53 |
| esukmaraga@hijra.id         | 45 |
| tprajamuda@hijra.id         | 29 |
| rmulya@hijra.id             | 26 |
| mtarmizi@hijra.id           | 19 |
| aramadhan@hijra.id          | 17 |
| mdaffa@hijra.id             | 13 |
| rmahendra@hijra.id          | 7 |
| esetyawati@hijra.id         | 5 |
| eutomo@hijra.id             | 4 |
| asavitri@hijra.id           | 4 |
| hapreja@hijra.id            | 3 |
| rwijaya@hijra.id            | 2 |
| nlubis@hijra.id             | 2 |
| rickymahendra@hijra.id      | 1 |
| miqbal@hijra.id             | 1 |

**Distinct assignees (15):**

| email                       | count |
| --------------------------- | ----- |
| rwinanda@hijra.id           | 81 |
| fwidyatmoko@hijra.id        | 71 |
| fningsih@hijra.id           | 62 |
| rmulya@hijra.id             | 49 |
| awiyono@hijra.id            | 33 |
| ryonanda@hijra.id           | 27 |
| awikasyah@hijra.id          | 18 |
| aramadhan@hijra.id          | 13 |
| UNASSIGNED                  | 10 |
| rmahendra@hijra.id          | 6 |
| ukusnadi@hijra.id           | 4 |
| atkurniawan@hijra.id        | 2 |
| rpitaloka@hijra.id          | 1 |
| mghifari@hijra.id           | 1 |
| esetyawati@hijra.id         | 1 |

**Comment authors observed:** `ukusnadi@hijra.id` (already in assignee list). Full comment-author roster will be a subset of creators+assignees in practice.

**Union of HLRS Jira users:** ~26 distinct (creators ∪ assignees ∪ comment authors).

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to HLRS.

- **Target project**: does NOT yet exist in Plane. Needs to be created.
- **Proposed Plane identifier**: `HLRS`
- **Proposed Plane name**: `Legal Review SP3`
- **Proposed state seed**: 4 custom states verbatim from Jira — `PERMINTAAN MASUK` (backlog, default), `REVIEW TIM LEGAL` (started), `FOLLOW UP USER` (started), `FINAL` (completed). Same minimal pattern as HDR (no extra defaults added).
- **Proposed label seed**: keep `business-form`, `business-form-63`, `Trx-Restriction` (auto-applied by Jira form — preserve for traceability per HDR precedent).
- **Assignee overlap with current Plane members**: **0 overlap**. None of the 26 HLRS users are in the workspace member roster — the workspace is currently IT-staffed only.
- **Stage 1 invitation list** (deduplicated, all `@hijra.id` unless noted):

  fwidyatmoko@hijra.id, tsuharmanto@hijra.id, mghifari@hijra.id, esukmaraga@hijra.id, tprajamuda@hijra.id, rmulya@hijra.id, mtarmizi@hijra.id, aramadhan@hijra.id, mdaffa@hijra.id, rmahendra@hijra.id, esetyawati@hijra.id, eutomo@hijra.id, asavitri@hijra.id, hapreja@hijra.id, rwijaya@hijra.id, nlubis@hijra.id, rickymahendra@hijra.id, miqbal@hijra.id, rwinanda@hijra.id, fningsih@hijra.id, awiyono@hijra.id, ryonanda@hijra.id, awikasyah@hijra.id, ukusnadi@hijra.id, atkurniawan@hijra.id, rpitaloka@hijra.id

  **26 invitations.** Note: `rickymahendra@hijra.id` and `rmahendra@hijra.id` look like duplicate identities for the same person — confirm with team before inviting both.

  Cross-check against deferred Stage 1 work for HDR/ARH/LRP — many of these legal users may already be on prior invite lists.

## Decisions (resolved 2026-05-18, amended 2026-05-19)

- [x] **Status mapping**: 4 Jira statuses verbatim as Plane states, **HDR-pattern**. Mapping: `PERMINTAAN MASUK`→backlog (default), `REVIEW TIM LEGAL`→started, `FOLLOW UP USER`→started, `FINAL`→completed. No default states added.
- [x] **Priority mapping**: Highest→urgent, High→high, Medium→medium.
- [x] **Custom fields** — **intent** (left column) vs **as-shipped** (right column, per Plane Community Edition limitation, see [`config/_plane.md`](../config/_plane.md)):
  - `customfield_10425` (MUAP/RISK/KOMITE Drive URL) → intent: Plane work-item link · **as-shipped: description footer** (`property:muap_risk_komite_drive`, falls back to footer because Work Item Types is Pro-only)
  - `customfield_10426` (DRAFT SP3 Docs URL) → intent: Plane work-item link · **as-shipped: description footer** (`property:draft_sp3`)
  - `customfield_10565` (PILIHAN SP3 select) → intent: select property · **as-shipped: description footer** (`property:pilihan_sp3`)
  - `customfield_10424` (JENIS SP3 select) → intent: select property · **as-shipped: description footer** (`property:jenis_sp3`)
  - `customfield_10015` (Start date) → Plane work-item `start_date` (built-in, works)
  - `customfield_10105`, `customfield_10001`, `customfield_10021` → drop (zero use)
- [x] **Due date** (`duedate`): **`builtin:target_date`** (changed mid-flight 2026-05-19 from earlier "drop" decision — first project to use target_date).
- [x] **Labels**: keep `business-form`, `business-form-63`, `Trx-Restriction` verbatim.
- [x] **Description / comments**: ADF → markdown via existing migrator behaviour (paragraphs + mentions).
- [x] **Attachments**: ~~deferred~~ **migrated 2026-05-19** (cookie refresh by user enabled assets/v2 path; all 335 attachments uploaded, 0 failures).
- [x] **User mapping**: 26 Stage 1 invites — keep findings verbatim including both `rickymahendra@hijra.id` and `rmahendra@hijra.id` (treat as separate accounts; don't merge without confirmation from team).
- [x] **Exclusions**: none. All 379 issues are legit (the 79 unlabeled ones included).
