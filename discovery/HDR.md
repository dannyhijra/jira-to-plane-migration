# Discovery: HDR

Generated: 2026-05-18T20:35+07:00 by Claude Code
Source project: `HIJRA - DOCUMENT REQUEST` (Jira project id `10428`, type `business`, key range `HDR-1 → HDR-56`)
Cloud: `https://alamisharia.atlassian.net`

## Jira side

### Project summary
- Total issues: **54** (key range `HDR-1 → HDR-56`; 2 keys missing: `HDR-23, HDR-44`)
- Sprints (active/closed/future): **0 / 0 / 0** (business project — no Agile board)
- Epics: **0** (no Epic issue type in scheme)
- Sub-tasks: **0** (Sub-task type exists in scheme but unused in project)
- Issue links: **0** (`issuelink is not EMPTY` → 0)
- Due dates: **0** (`due is not EMPTY` → 0)
- Attachments: **37 issues** carry one or more attachments (≈69% of issues)
- Distinct creators / assignees / reporters: **17 / 16 / 17** — combined union **28 users**
- Date range: 2025-05-08 → 2026-05-18 (project still active — last issue created today)
- Comments: `comment ~ "terimakasih"` matches **5 issues**; sample issues (HDR-1, HDR-10) carry 2–3 comments each, so realistic comment-bearing count is in the 25–45 range. Exact count + per-author tallies will be captured during migration iteration.

### Issue types
| Type     | Count | Notes                                       |
| -------- | ----- | ------------------------------------------- |
| Task     | 54    | All issues are Task                         |
| Sub-task | 0     | Type exists in scheme but unused in project |

### Statuses
| Jira status        | Category    | Count | Proposed Plane state group |
| ------------------ | ----------- | ----- | -------------------------- |
| Done               | Done        | 50    | completed (Plane state name: `Done`)           |
| USER PROSES        | In Progress | 2     | started, **custom Plane state name: `USER PROSES`**   |
| LEGAL REVIEW       | In Progress | 1     | started, **custom Plane state name: `LEGAL REVIEW`**  |
| PERMINTAAN MASUK   | To Do       | 1     | unstarted, **custom Plane state name: `PERMINTAAN MASUK`** |

**Decision (2026-05-18)**: keep all three In-Progress / To-Do statuses as **custom Plane states** (preserve Jira names verbatim), parallel to the ARH `Finalisasi Draft` / `Followup User` / `Review Tim Legal` decision. No `Backlog` or `Cancelled` observed. `PERMINTAAN MASUK` is the intake state for the business form.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 53    | medium                  |
| Highest       | 1     | urgent                  |

No `High` / `Low` / `Lowest` / `None`. All issues have a priority set.

### Labels
| Label              | Count | Notes                                                            |
| ------------------ | ----- | ---------------------------------------------------------------- |
| business-form      | 47    | Auto-applied by Jira intake form (7 issues bypass the form)      |
| business-form-258  | 47    | Auto-applied by intake form (form id `258`)                      |

No user-set labels observed. Same intake-form-only pattern as ARH/LRP.

**Decision (2026-05-18)**: **keep** both auto-applied labels as Plane labels (`business-form`, `business-form-258`) for traceability — overrides the "drop intake-form labels" pattern used on ARH/LRP. Differs from earlier projects.

### Custom fields
Field names resolved via `expand=names` against HDR-1 and HDR-10. Only `customfield_10015` (Start date) carries data on this project; the rest are either Jira system internals or null project-wide.

| Field id           | Name        | Type     | Sample values  | Non-null    | Decision                                                                          |
| ------------------ | ----------- | -------- | -------------- | ----------- | --------------------------------------------------------------------------------- |
| customfield_10015  | Start date  | date     | (10 issues)    | 10/54       | map to Plane built-in `start_date` (low usage but native field; mirror ARH/LRP)   |
| customfield_10105  | Category    | option   | —              | 0/54        | **drop** (jwm-category field — exists in scheme, unused project-wide)             |
| customfield_10001  | Team        | team     | —              | 0/54        | **drop** (Atlassian Teams field — unused)                                         |
| customfield_10019  | Rank        | lexorank | `2|i01e17:`    | 54/54       | **drop** (Greenhopper rank — internal Jira ordering, not portable to Plane)       |
| customfield_10021  | Flagged     | option[] | —              | 0/54        | **drop** (Flagged checkbox — unused)                                              |
| duedate            | Due date    | date     | —              | 0/54        | **drop** (system field, unused project-wide)                                      |

No business-specific custom field carries data on HDR (contrast with ARH `KEPERLUAN ANYUR` + `KETERANGAN REQUEST`). HDR descriptions are free-text plus attachments.

### Sprints
None — business project, no Agile board.

### Epics
None — no Epic issue type in scheme.

### Users
28 distinct users across creators / assignees / reporters / commenters. Activity = count of issues where the user appears as creator OR assignee (max of the two).

| accountId                                | displayName                            | email                  | activity        |
| ---------------------------------------- | -------------------------------------- | ---------------------- | --------------- |
| 712020:e36cb153-ec6c-4be1-bf3a-8ee0f88f394e | Rudi Winanda                         | rwinanda@hijra.id      | high (12 asg)   |
| 712020:871dad53-3b9c-48ce-bccf-12df31c6465e | Enggi Rengga Sukmaraga               | esukmaraga@hijra.id    | high (10 cr)    |
| 712020:82634862-1a6e-4120-81d9-a66c121cd39b | Rona Jutama Y                        | ryonanda@hijra.id      | high (10 asg)   |
| 712020:fcdc8df6-c2a6-453e-b443-4b0ad53a3d27 | Muhammad Daffa Raka Putra            | mdaffa@hijra.id        | high (8 cr)     |
| 712020:de1b4c46-144a-483e-9727-06b987402e95 | Fahri Widyatmoko                     | fwidyatmoko@hijra.id   | high (5 cr/asg) |
| 70121:e9145449-4bcc-49d1-824c-d414ecf80f52 | Ryan Triandy                         | rtriandy@hijra.id      | high (5 asg)    |
| 61321e0a6a4c09006ac3c23f                   | Raden Ajeng Feby Lailani Belladina   | fbelladina@hijra.id    | medium (5 cr)   |
| 712020:491c53f5-f290-45ad-9f3c-3df8808f2752 | Armel Elyonsa                        | aelyonsa@hijra.id      | medium (4 cr)   |
| 712020:a571139d-1f94-455d-aa83-2880c759d846 | Agus Triyatmojo                      | atriyatmojo@hijra.id   | medium (3 cr)   |
| 712020:c77c806c-7834-44b5-8f9b-5cc5ef49ed47 | Muhammad Dadi Sutisna                | msutisna@hijra.id      | medium (3 cr/asg) |
| 60792ca3c642ff007014a85d                   | Salsabillah                          | salsabillah@hijra.id   | medium (3 cr)   |
| 712020:cc4f8a8a-3165-4913-96f8-9d5ce88971b9 | MUHAJIR                              | muhajir@hijra.id       | medium (2 asg + comment) |
| 61017a7075ad960069d7a7e0                   | Mochamad Nizar Mustaqim              | mnizar@hijra.id        | medium (2 asg)  |
| 712020:4233ade1-959c-4213-ac05-3d9ee9faea19 | Udus Kusnadi                         | ukusnadi@hijra.id      | medium (2 asg)  |
| 712020:57e96d99-bb69-4c83-a744-4c01ad7d0fcd | Farid Akbar Dawami                   | fdawami@hijra.id       | medium (2 cr/asg) |
| 712020:9eef415f-5522-4d00-999f-48332737ab34 | Tubagus Albaihaqi Prajamuda          | tprajamuda@hijra.id    | low (2 cr)      |
| 712020:f6d07d48-1c56-4a4d-97de-b8f7ac7c23d1 | Herwandi Apreja                      | hapreja@hijra.id       | low (2 cr)      |
| 612c9be344c8ed006865ffcf                   | Rafi Ramadhan                        | rramadhan@hijra.id     | low (2 cr)      |
| 712020:fc4d1b24-94f2-4915-96c1-503604bb4122 | Winda Widhyastuti                    | wwidhyastuti@hijra.id  | low (1 cr/asg)  |
| 6191d472ef18ca00719a01ae                   | ade rohmat                           | arohmat@hijra.id       | low (1 cr)      |
| 712020:84898c44-a0e5-4454-a651-95c2dfac3b9f | Ratih Mulya                          | rmulya@hijra.id        | low (1 cr)      |
| 712020:8b61b49f-03b3-4b89-86b1-105f5f4410cb | tri suharmanto                       | tsuharmanto@hijra.id   | low (1 cr)      |
| 712020:bfef4c13-a67a-4b08-83d2-6809eb42df84 | mdwiadi                              | mdwiadi@hijra.id       | low (1 cr)      |
| 712020:17fe8849-0680-4399-bf3d-682c622c3751 | Andri Tri Kurniawan                  | atkurniawan@hijra.id   | low (1 asg)     |
| 712020:2773cbc2-07d3-4026-8aa0-b0f6ef4376e1 | Hanny Septiani                       | hseptiani@hijra.id     | low (1 asg)     |
| 712020:69faed2d-5e7c-4291-a892-58ff7666f45a | agus wiyono                          | awiyono@hijra.id       | low (1 asg)     |
| 712020:eca69fba-36d8-414a-940d-d4c5bc6d5b03 | fningsih                             | fningsih@hijra.id      | low (1 asg)     |
| 5fe9ac7e3b5e470138982308                   | Ade Wikasyah                         | awikasyah@hijra.id     | low (1 asg)     |

All emails are `@hijra.id`. No external-domain users observed on HDR.

5 issues are unassigned (assignee = null).

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to `HDR`.

- **Target project**: does NOT exist yet in Plane (workspace has `II`, `PROJE`, `LDRH`, `LRP`, `ARH` — no `HDR`).
- **Assignee overlap with current Plane members**: **0 of 28** HDR users are in the current Plane member list (`_plane.md` has 11 IT-staff members; HDR is all-Legal/Operations staff). Every assigned issue at migration time will fall to the empty-assignee + migration-prefix path; reassign sweeps will reattach owners as users sign up.
- **Stage 1 invitation list** (28 emails — all 28 HDR Jira users; none currently in Plane).
  - **Already invited via prior LDRH/LRP/ARH Stage-1 runs (26 of 28)** — listed for completeness; no new manual UI action needed if those invitations are still pending acceptance:
    - From LDRH: atkurniawan, rtriandy, tsuharmanto, mdwiadi, rwinanda, wwidhyastuti, aelyonsa, ukusnadi (8 active) + awiyono (role `deactivated` in `users.yaml`, **excluded from invite**)
    - From LRP: ryonanda, salsabillah, rramadhan, mdaffa, msutisna, fdawami, hseptiani, rmulya, fbelladina, hapreja, esukmaraga, arohmat, atriyatmojo, awikasyah (14)
    - From ARH: fwidyatmoko, tprajamuda, fningsih (3)
  - **New to HDR — must be added to the Stage 1 list (2 of 28)**:
    - mnizar@hijra.id (Mochamad Nizar Mustaqim)
    - muhajir@hijra.id (MUHAJIR)
  - Full 28-email reference list (alphabetical):
  - aelyonsa@hijra.id
  - arohmat@hijra.id
  - atkurniawan@hijra.id
  - atriyatmojo@hijra.id
  - awikasyah@hijra.id
  - awiyono@hijra.id
  - esukmaraga@hijra.id
  - fbelladina@hijra.id
  - fdawami@hijra.id
  - fningsih@hijra.id
  - fwidyatmoko@hijra.id
  - hapreja@hijra.id
  - hseptiani@hijra.id
  - mdaffa@hijra.id
  - mdwiadi@hijra.id
  - mnizar@hijra.id
  - msutisna@hijra.id
  - muhajir@hijra.id
  - rmulya@hijra.id
  - rramadhan@hijra.id
  - rtriandy@hijra.id
  - rwinanda@hijra.id
  - ryonanda@hijra.id
  - salsabillah@hijra.id
  - tprajamuda@hijra.id
  - tsuharmanto@hijra.id
  - wwidhyastuti@hijra.id
  - ukusnadi@hijra.id
- **Proposed Plane project identifier**: `HDR` (matches Jira key; consistent with ARH/LRP/LDRH pattern). Proposed display name: `Document Request`.
- **Proposed state seed**: replace defaults with the four Jira statuses verbatim — `Done` (completed), `USER PROSES` (started), `LEGAL REVIEW` (started), `PERMINTAAN MASUK` (unstarted). No additional Plane defaults (Backlog / Cancelled / Todo) needed since no HDR issue uses them.
- **Modules**: **none.** Skip module creation entirely — HDR has no natural module dimension (no field equivalent to ARH's `KEPERLUAN ANYUR`).

## Decisions (resolved 2026-05-18)

- [x] **Status mapping**: keep `USER PROSES` / `LEGAL REVIEW` / `PERMINTAAN MASUK` as **custom Plane states** (verbatim Jira names). `Done → Done` (completed). State seed is exactly these 4 states — no Plane defaults added.
- [x] **Priority mapping**: `Medium → medium`, `Highest → urgent`. Only 2 distinct values present.
- [x] **Custom fields**: drop all except `customfield_10015` (Start date) → Plane built-in `start_date`. No business-side field carries data on HDR.
- [x] **Labels**: **keep** both `business-form` and `business-form-258` as Plane labels (traceability — overrides the drop pattern used on ARH/LRP).
- [x] **User emails**: all 28 are active employees. 26 already on prior LDRH/LRP/ARH Stage-1 invitation lists; 2 new to add (`mnizar@hijra.id`, `muhajir@hijra.id`). `awiyono@hijra.id` already flagged `deactivated` in `users.yaml` and stays excluded.
- [x] **Sprint strategy**: N/A — no sprints in scheme.
- [x] **Epic / module strategy**: **skip modules entirely** — no natural grouping dimension.
- [x] **Scope**: include all 54 HDR issues. The 2 missing keys (`HDR-23`, `HDR-44`) are already gone from Jira — leave gaps in Plane.
