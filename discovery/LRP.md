# Discovery: LRP

Generated: 2026-05-18T07:35+07:00 by Claude Code
Source project: `HIJRA - LEGAL REQUEST PKS` (Jira project id `10231`, type `business`)
Cloud: `https://alamisharia.atlassian.net`

## Jira side

### Project summary
- Total issues: **91** (keys LRP-2 → LRP-97; missing LRP-1, LRP-6, LRP-59, LRP-73, LRP-74, LRP-83)
- Sprints (active/closed/future): **0 / 0 / 0** (business project type, no Agile board)
- Epics: **0** (no Epic issue type in scheme)
- Sub-tasks: **0** (type exists in scheme but unused)
- Issue links: **0**
- Total comments: **237** across 91 issues (max 12 on LRP-47)
- Attachments: **24** across 14 issues
- Distinct users (creator/assignee/commenter union): **43**
- Date range: 2025-02-03 → 2026-05-13 (still active — last issue 5 days ago)

### Issue types
| Type     | Count | Notes                                       |
| -------- | ----- | ------------------------------------------- |
| Task     | 91    | All issues are Task                         |
| Sub-task | 0     | Type exists in scheme but unused in project |

### Statuses
Distinct statuses present across all 91 issues:

| Jira status        | Category    | Count | Proposed Plane state group |
| ------------------ | ----------- | ----- | -------------------------- |
| PERMINTAAN MASUK   | To Do       | 1     | unstarted                  |
| REVIEW TIM LEGAL   | In Progress | 2     | started                    |
| FOLLOW UP USER     | In Progress | 49    | started                    |
| FINAL              | Done        | 39    | completed                  |

No `Backlog` / `Cancelled` observed. `REVIEW TIM LEGAL` overlaps with the LDRH workflow — same state name, same group.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Highest       | 3     | urgent                  |
| High          | 1     | high                    |
| Medium        | 86    | medium                  |
| Lowest        | 1     | low                     |

No `Low` observed.

### Labels
| Label              | Count | Notes                                                          |
| ------------------ | ----- | -------------------------------------------------------------- |
| business-form      | 80    | Auto-applied by intake form (11 issues bypass the form)        |
| business-form-62   | 79    | Auto-applied by intake form (form id `62`)                     |
| NDA                | 2     | User-set on LRP-95, LRP-96                                     |

### Custom fields
Field names resolved via `expand=names` against LRP-50. Three custom fields carry meaningful data:

| Field id            | Name                          | Type           | Sample values                                                              | Non-null | Decision                                           |
| ------------------- | ----------------------------- | -------------- | -------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| customfield_10421   | JENIS PENGIKATAN              | single-select  | `PKS` (53), `NDA` (26), `MOU PAYUNG` (3)                                   | 82/91    | **property:jenis_pengikatan** (single-select; options: `PKS`, `NDA`, `MOU PAYUNG`) |
| customfield_10422   | DRAFT PKS (JIKA ADA)          | URL string     | `https://docs.google.com/document/d/1VTYZGOFXp_9xD2J95xHbk9lrQGDlJzh7/edit` | 52/91    | **property:draft_pks** (URL)                       |
| customfield_10423   | DOKUMEN LEGALITAS MITA        | URL string     | `https://docs.google.com/document/d/18Vp4pK162pl7nHTmH3MDtHYq6ZX4ZnQa/...`  | 80/91    | **property:dokumen_legalitas_mitra** (URL) — spelling corrected MITA→MITRA |
| customfield_10015   | Start date                    | date           | (dates)                                                                    | 12/91    | map to **work item built-in `start_date`** (not surfaced in LRP Jira UI, low usage) |
| duedate (built-in)  | Due date                      | date           | (dates)                                                                    | 16/91    | map to **work item built-in `target_date`** (native Plane field) |
| customfield_10001   | Team                          | team           | (all null)                                                                 | 0/91     | drop                                               |
| customfield_10105   | Category                      | string         | (all null)                                                                 | 0/91     | drop                                               |
| customfield_10019   | Rank (Agile)                  | rank string    | `2\|i016kn:0099`                                                           | n/a      | drop (internal Jira)                               |
| customfield_10021   | Flagged                       | flag           | (all null)                                                                 | 0/91     | drop                                               |

> Jira UI confirms the three custom fields visible to users are JENIS PENGIKATAN / DRAFT PKS (JIKA ADA) / DOKUMEN LEGALITAS MITA. Property name `dokumen_legalitas_mitra` corrects the Jira UI typo "MITA" → "MITRA" (confirmed).

### Sprints
**None.** `business` project type — no Agile board, no sprints.

### Epics
**None.** No Epic issue type in the scheme.

### Users
43 distinct users touched the project (creator/assignee/commenter union). Sorted by total activity.

| accountId                                  | displayName                           | email                              | Role observed             | Activity (cr / as / co) |
| ------------------------------------------ | ------------------------------------- | ---------------------------------- | ------------------------- | ----------------------- |
| 712020:17fe8849-0680-4399-bf3d-682c622c3751 | Andri Tri Kurniawan                  | atkurniawan@hijra.id               | Legal reviewer            | 0 / 14 / 111            |
| 712020:82634862-1a6e-4120-81d9-a66c121cd39b | Rona Jutama Y                        | ryonanda@hijra.id                  | Assignee (legal)          | 0 / 22 / 0              |
| 712020:78aeb877-cfb4-422a-8a89-17fd9cc1f76d | Eri Cipto Prabowo                    | eprabowo@hijra.id                  | Legal reviewer            | 0 / 1 / 18              |
| 60792ca3c642ff007014a85d                   | Salsabillah                           | salsabillah@hijra.id               | Creator + commenter       | 13 / 0 / 16             |
| 612c9be344c8ed006865ffcf                   | Rafi Ramadhan                         | rramadhan@hijra.id                 | Creator + commenter       | 12 / 0 / 16             |
| 712020:4233ade1-959c-4213-ac05-3d9ee9faea19 | Udus Kusnadi                         | ukusnadi@hijra.id                  | Commenter (legal)         | 0 / 0 / 14              |
| 712020:fcdc8df6-c2a6-453e-b443-4b0ad53a3d27 | Muhammad Daffa Raka Putra            | mdaffa@hijra.id                    | Creator + commenter       | 7 / 0 / 13              |
| 712020:c77c806c-7834-44b5-8f9b-5cc5ef49ed47 | Muhammad Dadi Sutisna                | msutisna@hijra.id                  | Creator + assignee        | 7 / 7 / 0               |
| 712020:57e96d99-bb69-4c83-a744-4c01ad7d0fcd | Farid Akbar Dawami                   | fdawami@hijra.id                   | Commenter                 | 0 / 0 / 8               |
| 613c1e6514e834007116b1c1                   | Efriliawan Noor Fazrin                | efazrin@hijra.id                   | Creator + assignee + comm | 7 / 3 / 2               |
| 712020:2773cbc2-07d3-4026-8aa0-b0f6ef4376e1 | Hanny Septiani                       | hseptiani@hijra.id                 | Creator + assignee        | 7 / 3 / 0               |
| 712020:491c53f5-f290-45ad-9f3c-3df8808f2752 | Armel Elyonsa                        | aelyonsa@hijra.id                  | Creator + assignee        | 7 / 1 / 0               |
| 70121:e9145449-4bcc-49d1-824c-d414ecf80f52  | Ryan Triandy                         | rtriandy@hijra.id                  | Assignee                  | 0 / 6 / 0               |
| 712020:84898c44-a0e5-4454-a651-95c2dfac3b9f | Ratih Mulya                          | rmulya@hijra.id                    | Creator + assignee + comm | 1 / 2 / 6               |
| 712020:e8c7cba6-a92b-447e-8ce8-07238466e3b4 | Adjie Wicaksana                      | rwicaksana@hijra.id                | Assignee + commenter      | 0 / 5 / 5               |
| 63a95044082abdd71bb4b703                   | Anggoro Bintang Nur Paksi (apaksi)    | apaksi@hijra.id                    | Creator + assignee + comm | 5 / 2 / 5               |
| 712020:c42e0fc3-91c2-4ed5-a07f-0e3eb2f10f08 | Raihan Mahendra                      | rmahendra@hijra.id                 | Creator + assignee + comm | 1 / 1 / 4               |
| 61321e0a6a4c09006ac3c23f                   | Raden Ajeng Feby Lailani Belladina    | fbelladina@hijra.id                | Creator + commenter       | 2 / 0 / 4               |
| 712020:f6d07d48-1c56-4a4d-97de-b8f7ac7c23d1 | Herwandi Apreja                      | hapreja@hijra.id                   | Creator + commenter       | 3 / 0 / 2               |
| 712020:fc4d1b24-94f2-4915-96c1-503604bb4122 | Winda Widhyastuti                    | wwidhyastuti@hijra.id              | Creator + assignee + comm | 2 / 2 / 2               |
| 712020:94f222ee-a8ed-4ad5-868a-beb40e15a7a7 | Erma Setyawati                       | esetyawati@hijra.id                | Creator + commenter       | 2 / 0 / 2               |
| 712020:f8043189-a28c-4f87-b2d7-852e65238d09 | Marizka Octarianti                   | moctarianti@hijra.id               | Creator + commenter       | 1 / 0 / 1               |
| 712020:2fb1ee44-15b0-43f0-826e-a733b39d1a2d | Andi Kardita Savitri                 | asavitri@hijra.id                  | Creator + commenter       | 1 / 0 / 2               |
| 712020:871dad53-3b9c-48ce-bccf-12df31c6465e | Enggi Rengga Sukmaraga               | esukmaraga@hijra.id                | Creator + commenter       | 2 / 0 / 1               |
| 6191d472ef18ca00719a01ae                   | ade rohmat                            | arohmat@hijra.id                   | Creator + assignee        | 1 / 2 / 0               |
| 6231b0cc50cceb00707a260f                   | Desnanti Sarachika                   | dsarachika@hijra.id                | Creator + commenter       | 2 / 0 / 1               |
| 712020:38e6a68f-29cc-4a87-a3ce-489410cd1758 | Faisal Amir                          | famir@hijra.id                     | Creator + assignee        | 1 / 1 / 0               |
| 62f9c27a0268bddf1c90db6f                   | Lukmanul Hakim Durachman             | ldurachman@alamisharia.co.id       | Assignee + commenter      | 0 / 2 / 1               |
| 712020:e36cb153-ec6c-4be1-bf3a-8ee0f88f394e | Rudi Winanda                         | rwinanda@hijra.id                  | Assignee                  | 0 / 2 / 0               |
| 62f363ffc1b3a10ac3ac562d                   | Muhammad Ananda Rahmat Fatah         | mfatah@alamisharia.co.id           | Creator                   | 1 / 0 / 0               |
| 637ae508fde064eda2ed547d                   | Nadya Zalsabila Alhumaira            | nalhumaira@hijra.id                | Creator                   | 1 / 0 / 0               |
| 712020:5caf0b8b-0c50-4c49-b412-910268cd58a2 | tmuhammad                             | tmuhammad@hijra.id                 | Creator                   | 1 / 0 / 0               |
| 712020:69b2ec78-9972-4da2-bc6c-e694f631ea52 | nlubis                                | nlubis@hijra.id                    | Creator                   | 1 / 0 / 0               |
| 712020:6aff222f-0d0f-4f66-9a32-748c4dac298c | Mohammad Iqbal                       | miqbal@hijra.id                    | Creator                   | 1 / 0 / 0               |
| 712020:a571139d-1f94-455d-aa83-2880c759d846 | Agus Triyatmojo                      | atriyatmojo@hijra.id               | Creator                   | 1 / 0 / 0               |
| 712020:c4a4dcbb-e0ae-4cbd-a69d-17c26662cff0 | Ahmad Muhajir                        | amuhajir@hijra.id                  | Creator                   | 1 / 0 / 0               |
| 5fe9ac7e3b5e470138982308                   | Ade Wikasyah                         | awikasyah@hijra.id                 | Assignee                  | 0 / 1 / 0               |
| 60b7435748b89500696d6517                   | Jati Nurohman                        | jnurohman@hijra.id                 | Assignee                  | 0 / 1 / 0               |
| 61c006e57c6f98007079ccbb                   | Noer Adham Satria                    | nsatria@alamisharia.co.id          | Assignee                  | 0 / 1 / 0               |
| 712020:220b2f94-a9bd-4737-b074-55463bc55091 | Tony Prasetyo Akhmad                 | takhmad@hijra.id                   | Assignee                  | 0 / 1 / 0               |
| 712020:69faed2d-5e7c-4291-a892-58ff7666f45a | agus wiyono *(deactivated)*          | awiyono@hijra.id                   | Assignee                  | 0 / 1 / 0               |
| 712020:d4e92015-6728-45a1-88be-410bb6bbd3b4 | Rembulan Pitaloka                    | rpitaloka@hijra.id                 | Commenter                 | 0 / 0 / 1               |
| 62984447658d580068895f61                   | Muhammad Giozzy Yudhistira           | myudhistira@alamisharia.co.id      | Commenter                 | 0 / 0 / 1               |
| 62c3a925eda95d2e3a692da8                   | Hanny Septiani *(duplicate account)* | hseptiani@alamisharia.co.id        | Commenter                 | 0 / 0 / 1               |

> **Duplicate account:** `Hanny Septiani` appears as TWO accountIds — `hseptiani@hijra.id` (main, 7 created / 3 assigned / 0 comments) and `hseptiani@alamisharia.co.id` (single comment). Same person. Decide: invite only the `@hijra.id` address; map both Jira accountIds to the same Plane user once she joins.
>
> **Deactivated:** `agus wiyono` (`awiyono@hijra.id`) — same accountId as LDRH-3 assignee. Decision (carried over from LDRH): drop assignee on the one LRP issue assigned to him; original displayName/email may still appear in the migration prefix for audit.
>
> **External `@alamisharia.co.id` accounts (3):** `mfatah@alamisharia.co.id`, `nsatria@alamisharia.co.id`, `ldurachman@alamisharia.co.id`, `myudhistira@alamisharia.co.id`. `ldurachman` is already a Plane member; the rest need a Stage 1 invitation decision (are they expected to register in Plane?).

## Plane target (project-specific)

Workspace-wide Plane state (members, existing projects, default states, access notes) lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to the LRP migration target.

> **Note:** Plane MCP returned HTTP 302 → Cloudflare Access on 2026-05-18 run (no VPN session). Workspace-global facts were NOT re-queried this run — relying on the 2026-05-13 capture in `config/_plane.md`. Refresh `_plane.md` once the next VPN-connected run lands.

- **Target project**: does not exist yet in Plane. Migrator will create one with identifier `LRP` (proposed).
- **Assignee overlap with current Plane members**: **3 of 22 assignees match** existing Plane members — `apaksi@hijra.id`, `efazrin@hijra.id`, `jnurohman@hijra.id`, `ldurachman@alamisharia.co.id`. Total **4 LRP-touching users** are already in Plane (incl. commenter `efazrin`); 39 are not.
- **Stage 1 invitation list (LRP-specific net-new) — 39 emails**: includes the three external `@alamisharia.co.id` accounts (decision: invite). Deduped `hseptiani@alamisharia.co.id` (same person as `hseptiani@hijra.id`) and dropped deactivated `awiyono@hijra.id`.

  ```
  atkurniawan@hijra.id           ryonanda@hijra.id              eprabowo@hijra.id
  salsabillah@hijra.id           rramadhan@hijra.id             ukusnadi@hijra.id
  mdaffa@hijra.id                msutisna@hijra.id              fdawami@hijra.id
  hseptiani@hijra.id             aelyonsa@hijra.id              rtriandy@hijra.id
  rmulya@hijra.id                rwicaksana@hijra.id            rmahendra@hijra.id
  fbelladina@hijra.id            hapreja@hijra.id               wwidhyastuti@hijra.id
  esetyawati@hijra.id            moctarianti@hijra.id           asavitri@hijra.id
  esukmaraga@hijra.id            arohmat@hijra.id               dsarachika@hijra.id
  famir@hijra.id                 rwinanda@hijra.id              nalhumaira@hijra.id
  tmuhammad@hijra.id             nlubis@hijra.id                miqbal@hijra.id
  atriyatmojo@hijra.id           amuhajir@hijra.id              awikasyah@hijra.id
  rpitaloka@hijra.id
  mfatah@alamisharia.co.id       nsatria@alamisharia.co.id      myudhistira@alamisharia.co.id
  ```

  > **Overlap with LDRH invitation list (10 emails)** — these LRP users were already on the LDRH invite list: `atkurniawan`, `rtriandy`, `mghifari` (n/a here), `eprabowo`, `ukusnadi`, `rwinanda`, `wwidhyastuti`, `aelyonsa`. If LDRH invitations have already been sent, only the **net-new ~32 emails** need to go out for LRP.

- **State seed (decided)**: keep Jira-specific states verbatim, alongside Plane defaults for future-proofing.
  - `Backlog` (backlog) — default
  - `Todo` (unstarted) — default
  - `PERMINTAAN MASUK` (unstarted) — Jira "incoming request"
  - `In Progress` (started) — default
  - `FOLLOW UP USER` (started) — Jira (49 issues, most common)
  - `REVIEW TIM LEGAL` (started) — Jira; mirrors LDRH (project-local duplicate; Plane states are per-project)
  - `FINAL` (completed) — Jira "done"
  - `Done` (completed) — default
  - `Cancelled` (cancelled) — default

  Mapping: Jira `PERMINTAAN MASUK` → Plane `PERMINTAAN MASUK`; Jira `FOLLOW UP USER` → Plane `FOLLOW UP USER`; Jira `REVIEW TIM LEGAL` → Plane `REVIEW TIM LEGAL`; Jira `FINAL` → Plane `FINAL`.

- **Label seed (decided)**: create `business-form`, `business-form-62`, `NDA` on the new project.

- **Module seed (decided)**: seed three modules from `JENIS PENGIKATAN` values; assign each work item to the module matching its `customfield_10421`:
  - `PKS` — 53 issues
  - `NDA` — 26 issues
  - `MOU PAYUNG` — 3 issues
  - (9 issues with null JENIS PENGIKATAN → no module assignment)

## Decisions needed

- [x] **Status mapping**: keep Jira-specific states verbatim (`PERMINTAAN MASUK`, `FOLLOW UP USER`, `REVIEW TIM LEGAL`, `FINAL`); seed Plane defaults (Backlog/Todo/In Progress/Done/Cancelled) alongside for future-proofing. Mapping as in the state seed section above.
- [x] **Priority mapping**: `Highest → urgent`, `High → high`, `Medium → medium`, `Lowest → low`.
- [x] **Custom fields**:
  - `customfield_10421` JENIS PENGIKATAN → property `jenis_pengikatan` (single-select: `PKS`, `NDA`, `MOU PAYUNG`).
  - `customfield_10422` DRAFT PKS (JIKA ADA) → property `draft_pks` (URL).
  - `customfield_10423` DOKUMEN LEGALITAS MITA → property `dokumen_legalitas_mitra` (URL); spelling corrected MITA→MITRA.
  - `customfield_10015` Start date → Plane built-in `start_date`.
  - `duedate` → Plane built-in `target_date`.
  - All other customfields → drop.
- [x] **Labels**: keep `business-form`, `business-form-62`, `NDA` as-is.
- [x] **User emails**:
  - `hseptiani@alamisharia.co.id` (duplicate) — invite only `hseptiani@hijra.id`; map both Jira accountIds to the single Plane account at `hseptiani@hijra.id` once she joins.
  - `awiyono@hijra.id` (deactivated) — drop assignee on the one LRP issue (matches LDRH decision).
  - External `@alamisharia.co.id` (`mfatah`, `nsatria`, `myudhistira`) — invite to Plane.
- [x] **Sprint / Epic / Sub-task / Issue-link**: N/A (none present). Migrator skips these entities for LRP.
- [x] **Scope**: migrate **all 91 issues** including FINAL/done. No date or status exclusions.
- [x] **Attachments**: same policy as LDRH — attempt real-file transfer, leave placeholder line (filename + original Jira attachment URL) for any that fail.
- [x] **Comment + description ADF formatting**: same as LDRH — render ADF to Markdown, preserve `@mention` as literal text.
- [x] **Modules**: seed three modules from `JENIS PENGIKATAN` values (`PKS`, `NDA`, `MOU PAYUNG`); migrator assigns each work item to the matching module. Issues with null JENIS PENGIKATAN → no module.
- [ ] **Cross-project consistency** *(informational — no action needed)*: `REVIEW TIM LEGAL` remains a project-local state in both LDRH and LRP (Plane states are per-project).
- [ ] **Plane workspace refresh** *(procedural)*: `_plane.md` last captured 2026-05-13; refresh before `/migrate-configure LRP` once VPN-connected.

## Notes for the configurator

- Project is ~7× the size of LDRH (91 vs 13 issues) — still small enough for a single pilot+scale cycle, but `--dry-run` mandatory.
- 6 key gaps (LRP-1, LRP-6, LRP-59, LRP-73, LRP-74, LRP-83) — migrator must tolerate.
- 11 issues lack `business-form*` labels — likely created manually rather than via intake form; mapper should not assume those labels are present.
- 12 issues without an assignee → empty assignee in Plane, plus migration prefix capturing the creator only.
- Many descriptions contain Google Drive smartlinks formatted as `<custom data-type="smartlink">URL</custom>` — confirm renderer extracts URL text rather than literal `<custom>` tags.
- `customfield_10421` (JENIS PENGIKATAN) is the natural way to slice LRP issues into modules (PKS / NDA / MOU PAYUNG) if a module dimension is wanted. Not proposed by default — flag if interested.
