# Discovery: HIJ

Generated: 2026-05-19 by Claude Code
Source project: **HIJRA - APPRAISAL REQUEST** (HIJ, business project type, key 10261, project lead Andri Tri Kurniawan)

## Jira side

### Project summary

- Total issues: **162** (key range HIJ-5 … HIJ-168, gaps from deleted issues)
- Issue types: **Task** only — no Sub-task/Epic instances
- Statuses in use: 5 custom statuses (no defaults)
- Sprints: none (business project; no Agile board)
- Epics: 0 (Epic issue type not configured)
- Issue links: not surveyed (none observed; same pattern as prior business projects)
- Distinct users (creators ∪ assignees ∪ comment authors observed): ~32

### Issue types

| Type | Count |
| ---- | ----- |
| Task | 162   |

### Statuses

| Jira status          | Count | Proposed Plane state group |
| -------------------- | ----- | -------------------------- |
| SELESAI              | 152   | completed                  |
| FOLLOWUP USER        | 5     | started                    |
| KJPP Progres         | 2     | started                    |
| FINALISASI DRAFT     | 2     | started                    |
| REVIEW TIM APPRAISAL | 1     | started                    |

All five are custom Jira statuses. Proposal: seed Plane project with exactly these five custom states verbatim (same pattern as HLRS / HDR).

### Priorities

| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 143   | medium                  |
| Highest       | 17    | urgent                  |
| High          | 2     | high                    |

No `Low / Lowest / None` usage.

### Labels

| Label             | Count |
| ----------------- | ----- |
| business-form-93  | 135   |
| business-form     | 134   |

`business-form` + `business-form-93` are system-applied by Jira business form intake (always co-occur on form-submitted issues). 27 issues have no labels at all. Same auto-label pattern as HDR/HLRS/ARH — kept for traceability in past projects.

### Custom fields (only those with values on at least one issue)

| Field id          | Name                              | Type            | Sample values                                                                                       | Proposed action  | Prevalence |
| ----------------- | --------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| customfield_10452 | DOKUMEN PENGAJUAN                 | string (URL)    | `https://drive.google.com/drive/folders/1aIerQf52uAiGC4-dDAyMq75xAE62deft?usp=drive_link`           | `description` *(or work-item link)* | ~97% (157/162) |
| customfield_10454 | OBJEK PENILAIAN                   | option (select) | `KENDARAAN`, `Lainnya`, `TANAH & BANGUNAN`                                                          | `description`    | ~99% (160/162) |
| customfield_10455 | PENILAIAN APPRAISAL               | option (select) | `INTERNAL`, `KJPP/EKSTERNAL`                                                                        | `description`    | ~99% (160/162) |
| customfield_10499 | KETERANGAN TAMBAHAN (JIKA ADA)    | doc (ADF rich)  | multi-paragraph notes incl. ordered lists describing collateral details                             | `description`    | ~83% (134/162) |
| customfield_10453 | JENIS PENILAIAN                   | option (select) | `Option 1`                                                                                          | `description` *(or drop — value is the literal string "Option 1", which is uninformative)* | ~15% (24/162) |
| customfield_10015 | Start date                        | date            | `2025-02-07`, `2025-02-11`                                                                          | `start_date`     | ~19% (31/162) |
| duedate           | Due date (system)                 | date            | `2025-02-14`, `2025-02-12`                                                                          | `target_date` *(or drop)* | ~20% (32/162) |
| customfield_10019 | Rank (system: board ordering)     | any (lexorank)  | `2|i0145s:0i`                                                                                       | drop             | 100% (system field) |
| customfield_10001 | Team                              | team            | single team `CSM Mina` on 1 issue                                                                   | drop             | <1% (1/162) |

**Rationale for "description" actions**: the Google Drive URL is the operational payload of every ticket (folder of submitted documents); the two SELECT fields plus KETERANGAN TAMBAHAN carry the appraisal classification + free-text notes. Folding into description preserves human-readable context. Same pattern as HLRS/HDR; can be overridden to `property:<name>` or `link:` per field if desired.

**Note on `JENIS PENILAIAN` (customfield_10453)**: every sampled non-null value was the literal string `"Option 1"` — looks like an unconfigured/never-renamed Jira select. Recommend `drop` unless user can confirm what this represents.

**Note on `Due date` (~20% usage)**: meaningfully populated unlike HLRS (which was minimal). Recommend mapping to Plane `target_date` — fall back to `drop` if user prefers.

### Description / attachments / comments

- `description`: **159 of 162** issues have non-empty descriptions (rich ADF — paragraphs, mentions, lists).
- `comment`: **161 of 162** issues have ≥1 comment. Active conversations — heaviest commenter by far is `muhajir@hijra.id` (the assignee on many tickets).
- `attachment`: **142 of 162** issues carry attachments. **Substantially higher attachment density than HLRS (~where ~30% had attachments).** Same defer-attachments pattern recommended initially.

### Sprints

None — business project without an Agile board.

### Epics

None — Epic issue type not configured for project usage.

### Users

**Distinct creators (21):**

| email                       | count |
| --------------------------- | ----- |
| tsuharmanto@hijra.id        | 21 |
| fwidyatmoko@hijra.id        | 18 |
| mghifari@hijra.id           | 17 |
| mtarmizi@hijra.id           | 14 |
| tprajamuda@hijra.id         | 13 |
| esukmaraga@hijra.id         | 12 |
| rmulya@hijra.id             | 12 |
| mdaffa@hijra.id             | 12 |
| aramadhan@hijra.id          | 9 |
| eutomo@hijra.id             | 7 |
| nlubis@hijra.id             | 4 |
| esetyawati@hijra.id         | 4 |
| asavitri@hijra.id           | 4 |
| rmahendra@hijra.id          | 3 |
| hapreja@hijra.id            | 3 |
| miqbal@hijra.id             | 3 |
| rickymahendra@hijra.id      | 2 |
| rwijaya@hijra.id            | 1 |
| adriwal@hijra.id            | 1 |
| waji@hijra.id               | 1 |
| efazrin@hijra.id            | 1 |

**Distinct assignees (13):**

| email                       | count |
| --------------------------- | ----- |
| awiyono@hijra.id            | 28 |
| rwinanda@hijra.id           | 27 |
| fningsih@hijra.id           | 19 |
| rmulya@hijra.id             | 19 |
| ryonanda@hijra.id           | 17 |
| fwidyatmoko@hijra.id        | 12 |
| awikasyah@hijra.id          | 11 |
| UNASSIGNED                  | 11 |
| aramadhan@hijra.id          | 8 |
| muhajir@hijra.id            | 5 |
| rmahendra@hijra.id          | 2 |
| tsuharmanto@hijra.id        | 1 |
| esukmaraga@hijra.id         | 1 |
| efazrin@hijra.id            | 1 |

**Comment authors observed (30-issue sample, ~190 comments):** `muhajir@hijra.id` dominates (≈70% of comments), plus `atkurniawan@hijra.id` (project lead) and `eprabowo@hijra.id` who don't appear in creators/assignees. Adds 2 new identities to the invite list.

**Union of HIJ Jira users:** **~32 distinct** (creators ∪ assignees ∪ comment authors observed).

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to HIJ.

- **Target project**: does NOT yet exist in Plane. Needs to be created.
- **Proposed Plane identifier**: `HIJ`
- **Proposed Plane name**: `Appraisal Request`
- **Proposed state seed**: 5 custom states verbatim from Jira — `REVIEW TIM APPRAISAL` (started), `KJPP Progres` (started), `FINALISASI DRAFT` (started), `FOLLOWUP USER` (started), `SELESAI` (completed). Default to backlog seeding TBD — no Jira issue is in a backlog state currently (no PERMINTAAN MASUK analog). Recommend keeping Plane default `Backlog` state for any future new tickets.
- **Proposed label seed**: keep `business-form`, `business-form-93` verbatim (auto-applied by Jira form — preserve for traceability per HLRS/HDR precedent).
- **Assignee overlap with current Plane members**: **1 overlap** — `efazrin@hijra.id`. Remaining ~31 of 32 users need invitations.
- **Stage 1 invitation list** (deduplicated, all `@hijra.id`):

  tsuharmanto@hijra.id, fwidyatmoko@hijra.id, mghifari@hijra.id, mtarmizi@hijra.id, tprajamuda@hijra.id, esukmaraga@hijra.id, rmulya@hijra.id, mdaffa@hijra.id, aramadhan@hijra.id, eutomo@hijra.id, nlubis@hijra.id, esetyawati@hijra.id, asavitri@hijra.id, rmahendra@hijra.id, hapreja@hijra.id, miqbal@hijra.id, rickymahendra@hijra.id, rwijaya@hijra.id, adriwal@hijra.id, waji@hijra.id, awiyono@hijra.id, rwinanda@hijra.id, fningsih@hijra.id, ryonanda@hijra.id, awikasyah@hijra.id, muhajir@hijra.id, atkurniawan@hijra.id, eprabowo@hijra.id

  **28 invitations.** Notes:
  - `rmahendra@hijra.id` and `rickymahendra@hijra.id` again appear as possibly-duplicate identities for the same person (same pattern flagged in HLRS). Confirm with team.
  - Heavy overlap with HLRS/HDR/ARH/LRP invite rosters — most of these legal/CSM users were already on prior invite lists. Cross-check `state/DEFERRED.md` and prior Stage 1 work to avoid sending duplicate invites.

## Decisions (resolved 2026-05-19)

- [x] **Status mapping**: seed Plane with all 5 Jira status names **verbatim**. Group mapping:
  - `SELESAI` (152) → **completed**
  - `FOLLOWUP USER` (5) → **started**
  - `KJPP Progres` (2) → **started**
  - `FINALISASI DRAFT` (2) → **started**
  - `REVIEW TIM APPRAISAL` (1) → **started**
- [x] **Priority mapping**: Highest→urgent, High→high, Medium→medium.
- [x] **Custom fields** (per-field action):
  - `customfield_10452` DOKUMEN PENGAJUAN → **Plane work-item link**, named `DOKUMEN PENGAJUAN (Drive)`
  - `customfield_10454` OBJEK PENILAIAN → **Plane work-item property** (`select`, options: `KENDARAAN`, `TANAH & BANGUNAN`, `Lainnya` — extend if migration discovers others)
  - `customfield_10455` PENILAIAN APPRAISAL → **Plane work-item property** (`select`, options: `INTERNAL`, `KJPP/EKSTERNAL`)
  - `customfield_10499` KETERANGAN TAMBAHAN (rich text) → **append to description** as a `## KETERANGAN TAMBAHAN` section (ADF → markdown via migrator)
  - `customfield_10453` JENIS PENILAIAN → **Plane work-item property** (`select`, options: `Option 1` only for now — extend later if more values appear)
  - `customfield_10015` Start date → Plane `start_date`
  - `duedate` Due date → Plane `target_date`
  - `customfield_10019` Rank → **drop** (lexorank board ordering, no Plane equivalent)
  - `customfield_10001` Team → **drop** (1 issue)
- [x] **Labels**: keep `business-form` + `business-form-93` verbatim (HLRS/HDR pattern).
- [x] **Description / comments**: ADF → markdown via existing migrator behaviour.
- [x] **Attachments**: 142/162 issues have attachments — **include in pilot** (HIJ-specific deviation from HLRS/HDR defer pattern; run attachments migrator in the same pilot pass as issues + comments).
- [x] **User mapping**: 28 Stage 1 invites. `rmahendra@hijra.id` and `rickymahendra@hijra.id` treated as separate accounts (same as HLRS) — don't merge without team confirmation.
- [x] **Exclusions**: none. All 162 issues migrate.
