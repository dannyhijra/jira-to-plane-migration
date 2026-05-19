# Discovery: ARH

Generated: 2026-05-18T14:55+07:00 by Claude Code
Source project: `HIJRA - ANYUR REQUEST` (Jira project id `10228`, type `business`, key range `ARH-8 → ARH-269`)
Cloud: `https://alamisharia.atlassian.net`

## Jira side

### Project summary
- Total issues: **246** (key range `ARH-8 → ARH-269`; 23 keys missing: `ARH-1..7, 25, 39, 68, 80, 81, 118, 119, 207, 227, 230, 232, 235, 236, 240, 246, 255`)
- Sprints (active/closed/future): **0 / 0 / 0** (business project — no Agile board)
- Epics: **0** (no Epic issue type in scheme)
- Sub-tasks: **0** (Sub-task type exists in scheme but unused in project)
- Issue links: **0** observed
- Attachments: **135 issues** carry one or more attachments (≈55% of issues)
- Distinct creators + assignees: **33** (commenters extend this — see note below)
- Date range: 2025-02-03 → 2026-05-12 (project still active — last issue 6 days ago)
- Comments: enumeration via `comment is not EMPTY` returns 0 in the new Enhanced JQL API; `comment ~ "terimakasih"` matches **98 issues**, so realistic comment-bearing count is in the 90–150 range. Exact count + per-author tallies will be captured during migration iteration.

### Issue types
| Type     | Count | Notes                                       |
| -------- | ----- | ------------------------------------------- |
| Task     | 246   | All issues are Task                         |
| Sub-task | 0     | Type exists in scheme but unused in project |

### Statuses
| Jira status      | Category    | Count | Proposed Plane state group |
| ---------------- | ----------- | ----- | -------------------------- |
| Final            | Done        | 239   | completed                  |
| Finalisasi Draft | In Progress | 3     | started                    |
| Followup User    | In Progress | 3     | started                    |
| Review Tim Legal | In Progress | 1     | started                    |

No `Backlog`, `To Do`, or `Cancelled` observed. Note casing differs from LRP (`FOLLOW UP USER` → `Followup User` here; `REVIEW TIM LEGAL` → `Review Tim Legal`).

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 217   | medium                  |
| Highest       | 24    | urgent                  |
| High          | 5     | high                    |

No `Low` / `Lowest` / `None`. All issues have a priority set.

### Labels
| Label             | Count | Notes                                                          |
| ----------------- | ----- | -------------------------------------------------------------- |
| business-form     | 210   | Auto-applied by Jira intake form (36 issues bypass the form)   |
| business-form-60  | 210   | Auto-applied by intake form (form id `60`)                     |

No user-set labels observed.

### Custom fields
Field names resolved via `expand=names` against ARH-100. Five fields carry data:

| Field id           | Name                 | Type           | Sample values                                                          | Non-null   | Decision                                                                                  |
| ------------------ | -------------------- | -------------- | ---------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| customfield_10419  | KEPERLUAN ANYUR      | single-select  | `PEMBIAYAAN` (≈127), `PENDANAAN` (≈67), `KERJA SAMA` (≈5)              | ≈199/200*  | **property:keperluan_anyur** (single-select; options: `PEMBIAYAAN`, `PENDANAAN`, `KERJA SAMA`). Natural module dimension. |
| customfield_10420  | KETERANGAN REQUEST   | ADF rich text  | `Berikut Link Nya : <inlineCard url="https://drive.google.com/..."/>`  | ≈99/100*   | **description footer** (render to Markdown, append to description like LRP did with URL fields). |
| customfield_10015  | Start date           | date           | `2025-08-01`                                                           | 16/199*    | map to Plane built-in `start_date` (low usage but native field)                           |
| duedate (built-in) | Due date             | date           | `2025-08-06`                                                           | 44/246     | map to Plane built-in `target_date`                                                       |
| customfield_10418  | KEPERLUAN ANYUR (v1) | single-select  | `Option 1` (28), null (171)                                            | 28/199*    | **drop** — orphan field with placeholder option only; superseded by cf_10419              |
| customfield_10001  | Team                 | team           | (all null)                                                             | 0          | drop                                                                                      |
| customfield_10105  | Category             | string         | (all null)                                                             | 0          | drop                                                                                      |
| customfield_10019  | Rank (Agile)         | rank string    | `2|i017mf:2001`                                                        | n/a        | drop (internal Jira)                                                                      |
| customfield_10021  | Flagged              | flag           | (all null)                                                             | 0          | drop                                                                                      |

> \* Counts marked with `*` are from two 100-item samples (199 unique issues) rather than the full 246 — exhaustive paginated enumeration was not run. Migration-time iteration will produce exact figures.

> **Two fields share the display name "KEPERLUAN ANYUR"** (`customfield_10418` and `customfield_10419`). `_10418` only ever holds the placeholder value `Option 1` (28 issues) or null; `_10419` holds the real PEMBIAYAAN / PENDANAAN / KERJA SAMA values. Treat `_10419` as canonical and drop `_10418`.

### Sprints
**None.** `business` project type — no Agile board, no sprints.

### Epics
**None.** No Epic issue type in the scheme.

### Users
**33 distinct creators + assignees** (commenter union not yet enumerated — see note). Sorted alphabetically by display name.

| accountId                                  | displayName                  | email                         | Role observed     |
| ------------------------------------------ | ---------------------------- | ----------------------------- | ----------------- |
| 5fe9ac7e3b5e470138982308                   | Ade Wikasyah                 | awikasyah@hijra.id            | assignee          |
| 712020:b992a3f4-f90d-47e1-b5da-db1c2d74ebf2 | Afif Setya Ramadhan         | aramadhan@hijra.id            | creator+assignee  |
| 712020:c4a4dcbb-e0ae-4cbd-a69d-17c26662cff0 | Ahmad Muhajir               | amuhajir@hijra.id             | creator           |
| 712020:08685670-ac33-4a0b-9ee0-40bf3016aead | Ajie Priandito              | apriandito@hijra.id           | creator           |
| 712020:2fb1ee44-15b0-43f0-826e-a733b39d1a2d | Andi Kardita Savitri        | asavitri@hijra.id             | creator           |
| 712020:17fe8849-0680-4399-bf3d-682c622c3751 | Andri Tri Kurniawan         | atkurniawan@hijra.id          | assignee+commenter |
| 712020:491c53f5-f290-45ad-9f3c-3df8808f2752 | Armel Elyonsa               | aelyonsa@hijra.id             | creator           |
| 712020:1bbbcc20-0ad6-4d6e-b316-963754a55ae8 | Eko Prasetyo U              | eutomo@hijra.id               | creator           |
| 712020:871dad53-3b9c-48ce-bccf-12df31c6465e | Enggi Rengga Sukmaraga      | esukmaraga@hijra.id           | creator           |
| 712020:78aeb877-cfb4-422a-8a89-17fd9cc1f76d | Eri Cipto Prabowo           | eprabowo@hijra.id             | commenter         |
| 712020:de1b4c46-144a-483e-9727-06b987402e95 | Fahri Widyatmoko            | fwidyatmoko@hijra.id          | creator           |
| 712020:f6d07d48-1c56-4a4d-97de-b8f7ac7c23d1 | Herwandi Apreja             | hapreja@hijra.id              | creator           |
| 712020:8b21332c-8225-4fff-970d-669e10c7f409 | MUHAMMAD AL GHIFARI         | mghifari@hijra.id             | creator           |
| 62c2ce2d4d60fcc257955e8a                   | Marzuki Tarmizi              | mtarmizi@hijra.id             | creator           |
| 712020:6aff222f-0d0f-4f66-9a32-748c4dac298c | Mohammad Iqbal              | miqbal@hijra.id               | creator           |
| 712020:fcdc8df6-c2a6-453e-b443-4b0ad53a3d27 | Muhammad Daffa Raka Putra   | mdaffa@hijra.id               | creator           |
| 712020:32c1f9f1-e29c-4be4-b864-3b67ba4a547c | Nia Dwi Utami               | nutami@alamisharia.co.id      | creator (external) |
| 612c9be344c8ed006865ffcf                   | Rafi Ramadhan                | rramadhan@hijra.id            | creator           |
| 712020:c42e0fc3-91c2-4ed5-a07f-0e3eb2f10f08 | Raihan Mahendra             | rmahendra@hijra.id            | creator           |
| 712020:84898c44-a0e5-4454-a651-95c2dfac3b9f | Ratih Mulya                 | rmulya@hijra.id               | creator           |
| 712020:81565130-4de0-4b8b-a44b-59a439494fe7 | Rizki Pratama Wijaya        | rwijaya@hijra.id              | creator           |
| 712020:82634862-1a6e-4120-81d9-a66c121cd39b | Rona Jutama Y               | ryonanda@hijra.id             | creator+assignee  |
| 712020:e36cb153-ec6c-4be1-bf3a-8ee0f88f394e | Rudi Winanda                | rwinanda@hijra.id             | assignee          |
| 70121:e9145449-4bcc-49d1-824c-d414ecf80f52  | Ryan Triandy               | rtriandy@hijra.id             | assignee          |
| 712020:220b2f94-a9bd-4737-b074-55463bc55091 | Tony Prasetyo Akhmad        | takhmad@hijra.id              | creator           |
| 712020:9eef415f-5522-4d00-999f-48332737ab34 | Tubagus Albaihaqi Prajamuda | tprajamuda@hijra.id           | creator           |
| 712020:4331530d-fd48-4245-a966-1dd8250ff26e | Wahyu Triaji                | waji@hijra.id                 | creator           |
| 712020:fc4d1b24-94f2-4915-96c1-503604bb4122 | Winda Widhyastuti           | wwidhyastuti@hijra.id         | creator           |
| 712020:4233ade1-959c-4213-ac05-3d9ee9faea19 | Udus Kusnadi                | ukusnadi@hijra.id             | commenter (legal) |
| 712020:69faed2d-5e7c-4291-a892-58ff7666f45a | agus wiyono *(deactivated)* | awiyono@hijra.id              | assignee          |
| 712020:eca69fba-36d8-414a-940d-d4c5bc6d5b03 | fningsih                    | fningsih@hijra.id             | creator           |
| 712020:bfef4c13-a67a-4b08-83d2-6809eb42df84 | mdwiadi                     | mdwiadi@hijra.id              | creator           |
| 712020:69b2ec78-9972-4da2-bc6c-e694f631ea52 | nlubis                      | nlubis@hijra.id               | creator           |
| 712020:b0ff6824-ea03-41b8-a428-67aedf413e36 | shakim                      | shakim@hijra.id               | creator           |
| 712020:8b61b49f-03b3-4b89-86b1-105f5f4410cb | tri suharmanto              | tsuharmanto@hijra.id          | creator           |

> **Commenter enumeration incomplete.** Enhanced JQL API rejects `comment is not EMPTY` (returns 0). Sampled issues (ARH-50, ARH-100) reveal recurring legal commenters `ukusnadi@hijra.id`, `atkurniawan@hijra.id`, `eprabowo@hijra.id`. The first two are listed above as assignee/commenter; `eprabowo` and `ukusnadi` are commenter-only. Migration-time iteration through all 246 issues will produce the canonical commenter set; expect overlap with the LRP commenter list (same legal team).
>
> **Deactivated:** `agus wiyono` (`awiyono@hijra.id`) — same accountId as the LDRH/LRP deactivated user. Decision (carried over): drop assignee on the affected ARH issues; original email may still appear in the migration prefix for audit.
>
> **External `@alamisharia.co.id` (1 in creator/assignee set):** `nutami@alamisharia.co.id` (Nia Dwi Utami). Decision: invite (consistent with LRP treatment of external creators).

## Plane target (project-specific)

Workspace-wide Plane state (members, existing projects, default states, access notes) lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to the ARH migration target.

- **Target project**: does not exist yet in Plane. Migrator will create one with identifier **`ARH`** (proposed); name `Anyur Request` (proposed).
- **Assignee overlap with current Plane members**: **0 of 33** creator/assignee users in ARH match the 11 existing Plane members. All 33 are net-new to Plane.
- **Stage 1 invitation list (ARH-specific net-new) — 11 emails** *after deduplicating against LDRH + LRP invitation lists already issued*:

  ```
  aramadhan@hijra.id        apriandito@hijra.id       eutomo@hijra.id
  fwidyatmoko@hijra.id      mtarmizi@hijra.id         rwijaya@hijra.id
  tprajamuda@hijra.id       waji@hijra.id             fningsih@hijra.id
  shakim@hijra.id
  nutami@alamisharia.co.id  (external)
  ```

  > **Cross-project overlap (already covered by LDRH/LRP invitations)** — the following ~22 ARH users were already on prior invitation lists and do not need re-invitation: `atkurniawan`, `aelyonsa`, `rtriandy`, `mghifari`, `rwinanda`, `wwidhyastuti`, `tsuharmanto`, `mdwiadi`, `rmulya`, `rmahendra`, `hapreja`, `asavitri`, `esukmaraga`, `miqbal`, `amuhajir`, `awikasyah`, `rramadhan`, `mdaffa`, `ryonanda`, `nlubis`, `takhmad`, `ukusnadi`, `eprabowo`.
  >
  > Deduped `awiyono@hijra.id` (deactivated). Excluded from invite list.

- **State seed (proposed)**: Plane defaults + the four Jira-specific states, verbatim casing. Mapping uses Plane casing where it differs from Jira.

  | Plane state         | Group     | Notes                                       |
  | ------------------- | --------- | ------------------------------------------- |
  | Backlog             | backlog   | default                                     |
  | Todo                | unstarted | default                                     |
  | In Progress         | started   | default                                     |
  | Followup User       | started   | Jira-specific (3 issues)                    |
  | Finalisasi Draft    | started   | Jira-specific (3 issues) — new vs LRP/LDRH  |
  | Review Tim Legal    | started   | Jira-specific (1 issue) — mirrors LRP/LDRH  |
  | Final               | completed | Jira-specific (239 issues — dominant)       |
  | Done                | completed | default                                     |
  | Cancelled           | cancelled | default                                     |

  Mapping: `Final → Final`; `Finalisasi Draft → Finalisasi Draft`; `Followup User → Followup User`; `Review Tim Legal → Review Tim Legal`. (1:1.)

- **Label seed (proposed)**: create `business-form` and `business-form-60` on the new project. (No user-set labels in the project.)

- **Module seed (proposed)**: seed three modules from `KEPERLUAN ANYUR` (`customfield_10419`) values; assign each work item to its matching module — mirrors the LRP modules-from-field pattern.
  - `PEMBIAYAAN` — ≈127 issues
  - `PENDANAAN` — ≈67 issues
  - `KERJA SAMA` — ≈5 issues
  - (issues with null `KEPERLUAN ANYUR` → no module)

## Decisions needed

> **Note (amended 2026-05-19):** `property:<name>` actions for custom fields below render into a description footer (`<!-- migrated-custom-fields -->`), not real Plane work-item properties — this Plane instance is Community Edition where Work Item Types is gated behind Pro. Data is preserved; see [`config/_plane.md`](../config/_plane.md) and `src/mappers/description.ts` for the renderer.

- [x] **Status mapping**: keep Jira-specific states verbatim (`Final`, `Finalisasi Draft`, `Followup User`, `Review Tim Legal`); seed Plane defaults (Backlog/Todo/In Progress/Done/Cancelled) alongside for future-proofing. 1:1 mapping by name. `Final` stays `Final` in Plane (not collapsed into `Done`).
- [x] **Priority mapping**: `Highest → urgent`, `High → high`, `Medium → medium`. (No Low/Lowest in project.)
- [x] **Custom fields**:
  - `customfield_10419` KEPERLUAN ANYUR → property `keperluan_anyur` (single-select: `PEMBIAYAAN`, `PENDANAAN`, `KERJA SAMA`).
  - `customfield_10420` KETERANGAN REQUEST → **description footer** (render ADF to Markdown, append to description under `**KETERANGAN REQUEST:**` label — same pattern as LRP URL fields).
  - `customfield_10015` Start date → Plane built-in `start_date`.
  - `duedate` → Plane built-in `target_date`.
  - `customfield_10418` (KEPERLUAN ANYUR v1, placeholder) → **drop**.
  - All other customfields (`_10001`, `_10105`, `_10019`, `_10021`) → **drop**.
- [x] **Labels**: keep both `business-form` and `business-form-60` 1:1.
- [x] **User emails**:
  - `awiyono@hijra.id` (deactivated) — drop assignee on affected ARH issues (matches LDRH/LRP decision).
  - `nutami@alamisharia.co.id` (external) — invite to Plane.
  - **Commenter enumeration**: accept best-effort sampling now; canonical commenter set captured at migration time during per-issue iteration (avoids redundant paginated scrape now since the migrator will visit every issue anyway).
- [x] **Sprint / Epic / Sub-task / Issue-link**: N/A (none present). Migrator skips these entities for ARH.
- [x] **Scope**: migrate **all 246 issues** including the 239 `Final`/done. No date or status exclusions.
- [x] **Modules**: seed three modules from `KEPERLUAN ANYUR` values (`PEMBIAYAAN`, `PENDANAAN`, `KERJA SAMA`); migrator assigns each work item to the matching module. Issues with null `KEPERLUAN ANYUR` → no module.
- [x] **Attachments**: same policy as LDRH/LRP — attempt real-file transfer, leave placeholder line (filename + original Jira attachment URL) for any that fail.
- [x] **ADF rendering**: same policy as LDRH/LRP — render ADF to Markdown for descriptions, comments, and `KETERANGAN REQUEST`; preserve `@mention` as literal text.

## Notes for the configurator

- Project is ~2.7× the size of LRP (246 vs 91) — still single pilot+scale, but `--dry-run` mandatory; expect 5–10× the wall time of LRP for comments + attachments.
- 23 key gaps (`ARH-1..7, 25, 39, 68, 80, 81, 118, 119, 207, 227, 230, 232, 235, 236, 240, 246, 255`) — migrator must tolerate. `ARH-1..7` likely deleted during project init.
- 36 issues lack `business-form*` labels — created manually rather than via intake form; mapper should not assume those labels are present.
- 14 issues without an assignee → empty assignee in Plane, plus migration prefix capturing the creator only.
- Status distribution is skewed: 239/246 (97%) are `Final`. The migrated project will look mostly archival on day one. Discuss with the user whether `Final` issues should land in `Done` or remain `Final`.
- `KEPERLUAN ANYUR` (cf_10419) is the natural module-slice (PEMBIAYAAN/PENDANAAN/KERJA SAMA) — same pattern as LRP's `JENIS PENGIKATAN`.
- Two fields named "KEPERLUAN ANYUR" exist (cf_10418, cf_10419). cf_10418 holds only the placeholder `Option 1` (28 issues) — drop.
- Casing differs from LRP: `Followup User` (ARH) vs `FOLLOW UP USER` (LRP), `Review Tim Legal` vs `REVIEW TIM LEGAL`, `Final` vs `FINAL`. Plane states are per-project so this is informational only — no cross-project collision.
- Comment count enumeration via JQL `comment is not EMPTY` is broken on this Jira Enhanced Search endpoint (returns 0). Use `comment ~ "<term>"` fulltext probes or iterate per-issue at migration time.
