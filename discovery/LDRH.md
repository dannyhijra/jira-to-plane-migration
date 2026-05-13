# Discovery: LDRH

Generated: 2026-05-13T14:15+07:00 by Claude Code
Source project: `HIJRA - Legal Review Request` (Jira project id `10229`, type `business`)
Cloud: `https://alamisharia.atlassian.net`

## Jira side

### Project summary
- Total issues: **13** (keys LDRH-2 through LDRH-14; LDRH-1 missing — likely deleted)
- Sprints (active/closed/future): **0 / 0 / 0** (business project type, no Agile board)
- Epics: **0** (no Epic issue type in scheme)
- Distinct users (assignee/creator/commenter): **11**
- Date range: 2025-02-05 → 2026-03-06
- Status: low-activity intake project (legal review requests)

### Issue types
| Type     | Count | Notes                                       |
| -------- | ----- | ------------------------------------------- |
| Task     | 13    | All issues are Task                         |
| Sub-task | 0     | Type exists in scheme but unused in project |

### Statuses
Distinct statuses present across all 13 issues:

| Jira status      | Category    | Count | Proposed Plane state group |
| ---------------- | ----------- | ----- | -------------------------- |
| REVIEW USER      | In Progress | 5     | started                    |
| REVIEW TIM LEGAL | In Progress | 1     | started                    |
| Done             | Done        | 7     | completed                  |

No `To Do` / `Backlog` / `Cancelled` statuses observed. If the full workflow has more, they'll surface in other projects (or as historical statuses on closed issues). For LDRH the above three cover everything.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 13    | medium                  |

Only Medium observed — likely the default and never changed.

### Labels
| Label              | Count | Notes                                                             |
| ------------------ | ----- | ----------------------------------------------------------------- |
| business-form      | 13    | Auto-applied by intake form                                       |
| business-form-159  | 13    | Auto-applied by intake form (form id)                             |

Both labels are intake-form metadata, not user-meaningful. Candidate for `drop` or consolidate.

### Custom fields
Sampled from LDRH-3 with `*all` field expansion. Only one customfield carries data in the visible sample:

| Field id            | Inferred name     | Type        | Sample values                                                                              | Proposed action      |
| ------------------- | ----------------- | ----------- | ------------------------------------------------------------------------------------------ | -------------------- |
| customfield_10468   | DOKUMEN PERMOHONAN REVIEW LEGAL | URL string | `https://drive.google.com/open?id=1MvTpPiN-KlRYATqoz1IqoiDhXpy8C_rP&usp=drive_fs` | property:dokumen_permohonan_review_legal   |
| customfield_10019   | Rank (Agile)      | rank string | `2\|i014vf:`                                                                               | drop (internal Jira) |
| customfield_10001   | (null on sample)  | —           | —                                                                                          | drop                 |
| customfield_10015   | (null on sample)  | —           | —                                                                                          | drop                 |
| customfield_10021   | (null on sample)  | —           | —                                                                                          | drop                 |
| customfield_10105   | (null on sample)  | —           | —                                                                                          | drop                 |

Field names were not returned by the API (we'd need `expand=names`). User to confirm the readable name of `customfield_10468` (Lampiran is a guess based on Google Drive URL content).

### Sprints
**None.** `business` project type — no Agile board, no sprints.

### Epics
**None.** No Epic issue type in the scheme.

### Users
Eleven distinct users touched the project. Emails resolved via `lookupJiraAccountId` (admin access).

| accountId                                  | displayName           | email                 | Role observed           | Activity                                  |
| ------------------------------------------ | --------------------- | --------------------- | ----------------------- | ----------------------------------------- |
| 712020:17fe8849-0680-4399-bf3d-682c622c3751 | Andri Tri Kurniawan   | atkurniawan@hijra.id  | Legal reviewer          | high — commenter on 6+ issues             |
| 70121:e9145449-4bcc-49d1-824c-d414ecf80f52  | Ryan Triandy          | rtriandy@hijra.id     | Assignee + commenter    | high — assignee on 6 issues               |
| 712020:8b61b49f-03b3-4b89-86b1-105f5f4410cb | tri suharmanto        | tsuharmanto@hijra.id  | Creator + commenter     | high — creator on 4 issues                |
| 712020:bfef4c13-a67a-4b08-83d2-6809eb42df84 | mdwiadi               | mdwiadi@hijra.id      | Creator                 | high — creator on 5 issues                |
| 712020:e36cb153-ec6c-4be1-bf3a-8ee0f88f394e | Rudi Winanda          | rwinanda@hijra.id     | Assignee                | medium — assignee on 4 issues             |
| 712020:fc4d1b24-94f2-4915-96c1-503604bb4122 | Winda Widhyastuti     | wwidhyastuti@hijra.id | Creator + assignee      | medium — 2 issues each side               |
| 712020:8b21332c-8225-4fff-970d-669e10c7f409 | MUHAMMAD AL GHIFARI   | mghifari@hijra.id     | Creator + commenter     | medium — LDRH-3 (7 comments)              |
| 712020:69faed2d-5e7c-4291-a892-58ff7666f45a | agus wiyono           | _drop_ (deactivated)  | Assignee                | low — assignee on LDRH-3                  |
| 712020:78aeb877-cfb4-422a-8a89-17fd9cc1f76d | Eri Cipto Prabowo     | eprabowo@hijra.id     | Commenter (legal)       | low — 1 comment                           |
| 712020:491c53f5-f290-45ad-9f3c-3df8808f2752 | Armel Elyonsa         | aelyonsa@hijra.id     | Creator                 | low — LDRH-13                             |
| 712020:4233ade1-959c-4213-ac05-3d9ee9faea19 | Udus Kusnadi          | ukusnadi@hijra.id     | Commenter               | low — comments on LDRH-8, LDRH-9          |

> **agus wiyono** (LDRH-3 assignee) deactivated. **Decision: drop assignee on LDRH-3.** Migrator should treat this accountId as unmapped → no Plane assignee, no migration-prefix email entry for assignee. Original displayName can still appear in the prefix for audit.
>
> **mdwiadi** confirmed real — short alias, not a placeholder.

## Plane target (project-specific)

Workspace-wide Plane state (members, existing projects, default states, access notes) lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to the LDRH migration target.

- **Target project**: does not exist yet in Plane. Migrator will create one with identifier `LDRH` (proposed).
- **Assignee overlap with existing Plane members**: **zero**. Current Plane workspace is IT-staffed; LDRH Jira users are all Legal. Every LDRH issue will land with empty `assignees` and a migration prefix until Stage 3 reassign.
- **Stage 1 invitation list** (10 emails — `agus wiyono` dropped as deactivated):
  `atkurniawan@hijra.id`, `rtriandy@hijra.id`, `tsuharmanto@hijra.id`, `mdwiadi@hijra.id`, `rwinanda@hijra.id`, `wwidhyastuti@hijra.id`, `mghifari@hijra.id`, `eprabowo@hijra.id`, `aelyonsa@hijra.id`, `ukusnadi@hijra.id`
- **State seed (decided)**: `Backlog`, `Todo`, `In Progress`, `REVIEW USER` (started), `REVIEW TIM LEGAL` (started), `Done`, `Cancelled` — both `REVIEW USER` and `REVIEW TIM LEGAL` are LDRH-specific custom states that mirror the Jira workflow.
- **Label seed (decided)**: create `business-form` and `business-form-159` on the new project.

## Decisions needed

Annotate each item before running `/migrate-configure LDRH`:

- [x] **Status mapping**: pre-create custom states in LDRH project for fidelity. Final state seed for LDRH project:
  - `Backlog` (backlog)
  - `Todo` (unstarted)
  - `In Progress` (started)
  - `REVIEW USER` (started) — custom, mirrors Jira
  - `REVIEW TIM LEGAL` (started) — custom, mirrors Jira
  - `Done` (completed)
  - `Cancelled` (cancelled)
  Mapping: Jira `REVIEW USER` → Plane `REVIEW USER`; Jira `REVIEW TIM LEGAL` → Plane `REVIEW TIM LEGAL`; Jira `Done` → Plane `Done`.
- [x] **Priority mapping**: Medium → medium confirmed.
- [x] **Custom fields**:
  - `customfield_10468` → map to a Plane custom property on the work item type (NOT fold into description, NOT drop). Jira UI label: **DOKUMEN PERMOHONAN REVIEW LEGAL**. Proposed Plane property name: `dokumen_permohonan_review_legal` (URL type).
  - All null customfields (`_10001`, `_10015`, `_10019`, `_10021`, `_10105`) → drop.
- [x] **Labels**: keep both `business-form` and `business-form-159` as-is.
- [x] **User emails**: 10/11 resolved at `*@hijra.id`. `agus wiyono` deactivated → drop assignee on LDRH-3. `mdwiadi@hijra.id` confirmed.
- [x] **Sprint / Epic / Sub-task**: N/A (none present).
- [x] **Scope**: migrate everything — no exclusions by date, status, or label.
- [x] **Attachments**: attempt to migrate real files. For any attachment the migrator cannot transfer, leave a placeholder line in the description/comment marking where the original lived (filename + original Jira attachment URL).
- [x] **Comment + description ADF formatting**: render ADF to **Markdown**. Preserve mention text (e.g., keep `@MUHAMMAD AL GHIFARI` as literal text — do NOT attempt to resolve to a Plane user mention).

## Notes for the configurator

- Project is tiny (13 issues) → ideal pilot. Could migrate end-to-end in one go after `/migrate-pilot` succeeds.
- LDRH-1 missing key → migrator must tolerate gaps in the key sequence.
- Many descriptions contain `blob:https://media.staging.atl-paas.net/...` references that are stale browser blob URLs from the editor — they will NOT resolve. These should be stripped or replaced with the matching `attachment` entry by the migrator.
- Several issues reference Google Drive links (smartlinks) — preserve as plain URLs in description.
