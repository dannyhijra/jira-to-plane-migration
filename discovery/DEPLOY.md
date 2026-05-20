# Discovery: DEPLOY

Generated: 2026-05-20T15:11:10+0700 by Claude Code

Jira project **DEPLOY** = "Service Deployment (Production)" (team-managed / `simplified: true` software project, id `10064`). This is a **deployment-log project**: each issue is one production release/hotfix ticket. The deployment metadata (services, versions, release links, environment, PIC, regression evidence, acknowledgement checklist) lives **inside the description body** as markdown tables — not in custom fields.

> ⚠️ This is by far the largest and most multi-tenant project discovered so far: **710 issues**, **81 distinct users** spanning the whole engineering org, only **5 of whom are already in Plane**. Read the Decisions section carefully — the user/invite scope and history scope are the big calls.

## Jira side

### Project summary
- Total issues: **710** (key sequence 1–715; 5 keys deleted: 307, 421, 438, 546, 575)
- Open vs done: **705 Done**, 5 open (4 Todo, 1 In Progress)
- Sprints (active/closed/future): **0 / 0 / 0** — no Scrum board sprints in use
- Epics: **0**
- Sub-tasks: **1** (DEPLOY-23 → parent DEPLOY-22)
- Distinct users: **81** (creators ∪ assignees ∪ reporters)
- Issues with attachments: **25**
- Issues with "Cloners" issue links: **130** (~65 clone pairs)
- Comments: **sparse** — ~1/3 of sampled issues have 1–3 comments

### Issue types
| Type | Count | Proposed Plane mapping |
| ---- | ----- | ---------------------- |
| Task | 709 | work item |
| Subtask | 1 | work item with `parent_id` = DEPLOY-22 |
| Epic | 0 | n/a (none exist) |

### Statuses
| Jira status | Count | Category | Proposed Plane state group |
| ----------- | ----- | -------- | -------------------------- |
| Done | 705 | done | completed (state: **Done**) |
| Todo | 4 | new | unstarted (state: **Todo**) |
| In Progress | 1 | indeterminate | started (state: **In Progress**) |

Only 3 statuses ever used. Suggest seeding **only these 3** states (matches the HDR "verbatim subset" precedent) rather than the full 6-state template — backlog/in-review/cancelled are unused here.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium | 710 | medium |

Single priority across all issues. Trivially → `medium` (or `none`, since it carries no signal — decision).

### Labels
| Label | Count | Note |
| ----- | ----- | ---- |
| Deployment | 244 | generic |
| ALAMI-DEPLOY | 191 | tenant tag (Alami side) |
| HIJRA-DEPLOY | 108 | tenant tag (Hijra side) |
| MISHA_BE | 4 | |
| Production | 2 | |
| HOTFIX | 1 | |
| MobileApps | 1 | |
| Risk | 1 | |

466 issues carry ≥1 label; the rest are unlabeled. Proposal: keep all 8 verbatim.

### Custom fields
No business-meaningful custom fields are populated. Full `*all` field dump on samples (DEPLOY-300, DEPLOY-715) shows only:

| Field id | Name | Type | Sample values | Proposed action |
| -------- | ---- | ---- | ------------- | --------------- |
| customfield_10019 | Rank | lexorank (board order) | `2\|i02ehb:` | **drop** (board-ordering artifact) |
| customfield_10000 | Development | json | `"{}"` (always empty) | **drop** |
| customfield_10015 / 10381 / 10021 | (Start date / ? / Sprint) | — | all `null` | **drop** (never set) |

→ No `property:` / description-footer mapping needed. All real content is already in the description body.

### Sprints
None. `customfield_10021` (Sprint) is null on all sampled issues; no Agile board sprints. → **skip cycles entirely.**

### Epics
None (0 issues of type Epic). → **skip modules entirely.**

### Issue links
"Cloners" relationship is heavily used: **130 issues** participate (each new deployment ticket is often cloned from the previous one). Semantically low value (template reuse, not real dependency). Decision: migrate clone links as Plane relations, or skip.

### Description-body quirks (ADF custom nodes)
Descriptions embed Atlassian smart nodes that won't render natively in Plane:
- `<custom data-type="mention">@Name</custom>` — PIC mentions (will degrade to plain text; mentioned users won't be linked)
- `<custom data-type="date">5/20/2026</custom>` — inline dates
- `<custom data-type="smartlink">https://…slack…</custom>` — Slack/GitHub smartlinks
- `<mention-people>` empty placeholders in the acknowledgement checklist

The description mapper should flatten these to readable text. Acknowledge that PIC @mentions become non-clickable names.

### Users
81 distinct. `c`=created, `a`=assigned, `r`=reported. ✅ = already a Plane workspace member. Activity: high ≥20 (created+assigned), med 5–19, low <5.

| displayName | email | activity (c/a/r) | level | in Plane |
| ----------- | ----- | ---------------- | ----- | -------- |
| Muhammad Ilham Hidayat | mihidayat@alamisharia.co.id | c:53 a:45 r:53 | high | — |
| vhermawan | vhermawan@hijra.id | c:38 a:34 r:38 | high | — |
| Rommy Akbar Ferdian Setiandy | rsetiandy@alamisharia.co.id | c:32 a:31 r:32 | high | — |
| Muhammad Rais Rahim | mrahim@alamisharia.co.id | c:23 a:28 r:23 | high | — |
| Erliandra Oktaviani Ernanto | eoktaviani@alamisharia.co.id | c:49 a:0 r:49 | high | — |
| Dede Badru Jaman | djaman@hijra.id | c:24 a:19 r:24 | high | — |
| Muhammad Rizfardi Metafiliana | rmetafiliana@alamisharia.co.id | c:23 a:20 r:23 | high | — |
| Sirajuddin Maizir | smaizir@alamisharia.co.id | c:14 a:29 r:14 | high | ✅ |
| Eka Ariyansyah | eariyansyah@hijra.id | c:26 a:14 r:26 | high | ✅ |
| anan (Anasruddin) | anasruddin@alamisharia.co.id | c:2 a:38 r:1 | high | — |
| Firman Maulana | fmaulana@alamisharia.co.id | c:22 a:16 r:22 | high | — |
| Achmad Mu'ammar Afinas | aafinas@alamisharia.co.id | c:3 a:32 r:3 | high | — |
| Fahmi Murpratomo | fmurpratomo@alamisharia.co.id | c:17 a:17 r:17 | high | — |
| Abdul Mughni | asyafii@alamisharia.co.id | c:28 a:5 r:28 | high | — |
| Arta Kusuma | aatmaja@alamisharia.co.id | c:24 a:8 r:24 | high | — |
| Yusuf Tri Yuswoyo | tyuswoyo@alamisharia.co.id | c:16 a:15 r:16 | high | — |
| Maulid Ihsan | mdihsan@alamisharia.co.id | c:2 a:27 r:2 | high | — |
| Reza Ramdhanisti | rramdhanisti@hijra.id | c:13 a:15 r:13 | high | — |
| Berri Suandi | bsuandi@alamisharia.co.id | c:27 a:0 r:27 | high | — |
| Dimas Harry Sulistyono | dsulistyono@alamisharia.co.id | c:12 a:15 r:12 | high | — |
| ziezat (Muzizat) | muzizat@hijra.id | c:12 a:12 r:12 | high | ✅ |
| Rakhmat Setia Gunawan | rgunawan@alamisharia.co.id | c:22 a:1 r:22 | high | — |
| Muhammad Anova Nurfaqih | mnurfaqih@alamisharia.co.id | c:11 a:11 r:11 | high | — |
| Hadyan Putra Yasrizal | hyasrizal@alamisharia.co.id | c:12 a:9 r:12 | high | — |
| Gumilar Prasetyoadi | gprasetyoadi@hijra.id | c:11 a:10 r:11 | high | — |
| Agus Wibawa | agutama@alamisharia.co.id | c:0 a:20 r:0 | high | — |
| Jati Nurohman | jnurohman@hijra.id | c:10 a:8 r:10 | med | ✅ |
| Lukman Triyadi | ltriyadi@alamisharia.co.id | c:16 a:1 r:16 | med | — |
| Heru Siregar | csiregar@alamisharia.co.id | c:4 a:13 r:4 | med | — |
| Mochamad Taufik Romdony | mromdony@alamisharia.co.id | c:4 a:11 r:10 | med | — |
| Rikad Akbar Ramadhan | rikadakbar@hijra.id | c:13 a:1 r:13 | med | — |
| Dicky Ramadhan | dramadhan@hijra.id | c:7 a:7 r:7 | med | — |
| Guntur Vo | gunturvirgenius@hijra.id | c:5 a:9 r:5 | med | — |
| Muhammad Alfarizi Tazkia | mtazkia@alamisharia.co.id | c:10 a:2 r:10 | med | — |
| Ivan Jond | ijond@alamisharia.co.id | c:9 a:3 r:4 | med | — |
| Ragil Wiradiputra | rwiradiputra@alamisharia.co.id | c:3 a:9 r:3 | med | — |
| Farhan Arrahman | farrahman@alamisharia.co.id | c:10 a:0 r:10 | med | — |
| Halim Cakra | hwardana@alamisharia.co.id | c:10 a:0 r:10 | med | — |
| Rizaldi Habibie | rhabibie@hijra.id | c:9 a:1 r:9 | med | — |
| Ananta Arya Dewa | adewa@alamisharia.co.id | c:6 a:4 r:6 | med | — |
| Muhammad Ali Ridha | mridha@alamisharia.co.id | c:9 a:0 r:9 | med | — |
| Nursan Amar | namar@alamisharia.co.id | c:4 a:5 r:4 | med | — |
| Bagus Juang Wiantoro | bwiantoro@alamisharia.co.id | c:7 a:1 r:7 | med | — |
| Muksin Alfatah | malfatah@alamisharia.co.id | c:3 a:4 r:3 | med | — |
| Danny Dwi Cahyono (Alami acct) | dcahyono@alamisharia.co.id | c:3 a:4 r:3 | med | — |
| Satrio Wisnugroho | swisnugroho@alamisharia.co.id | c:3 a:3 r:3 | med | — |
| Abdul Aziz | aaziz@hijra.id | c:2 a:3 r:2 | med | — |
| Zulkarnaen Zulkarnaen | zulkarnaen@alamisharia.co.id | c:1 a:4 r:1 | med | — |
| Asrorul Umam | aumam@hijra.id | c:4 a:0 r:4 | low | — |
| Teuku Arinal Wakil | twakil@alamisharia.co.id | c:4 a:0 r:4 | low | — |
| Mukti Malik | mmalik@alamisharia.co.id | c:3 a:1 r:3 | low | — |
| Naufal Malik Rabbani | nrabbani@hijra.id | c:3 a:1 r:3 | low | — |
| Rico Dani Suherman | rsuherman@hijra.id | c:2 a:2 r:2 | low | — |
| Wahidyan Kresna Fridayoka | wfridayoka@hijra.id | c:2 a:2 r:2 | low | — |
| Arsita Gadis Gea Ananda | aananda@alamisharia.co.id | c:3 a:0 r:3 | low | — |
| Adam Primarizki | aprimarizki@alamisharia.co.id | c:3 a:0 r:3 | low | — |
| Fika Siwi Lestari | flestari@alamisharia.co.id | c:3 a:0 r:3 | low | — |
| Rosliani Widia Pamungkas | rospamungkas@hijra.id | c:1 a:2 r:1 | low | — |
| Danny Dwi Cahyono (Hijra acct, **API key owner**) | dcahyono@hijra.id | c:1 a:2 r:1 | low | ✅ |
| Ahmad Wigo Prasetya | wprasetya@alamisharia.co.id | c:1 a:1 r:1 | low | — |
| Deddy Pamudji | dpamudji@hijra.id | c:1 a:1 r:1 | low | — |
| Ananda Bayu Putra Yudhistira | ayudhistira@alamisharia.co.id | c:1 a:1 r:1 | low | — |
| Muhammad Syarif Abdullah | mabdullah@hijra.id | c:1 a:1 r:1 | low | — |
| aazis | aazis@alamisharia.co.id | c:1 a:1 r:1 | low | — |
| Nurhadi Wibowo | nwibowo@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Muchamad Lutfi Maulana | mlutfi@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Jody Riztana Putra | jputra@hijra.id | c:1 a:0 r:1 | low | — |
| Mohammad Wildan Yanuar | myanuar@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Ridwan Teharudin | rteharudin@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Doni Dera Wibisana | dwibisana@hijra.id | c:1 a:0 r:1 | low | — |
| Husni Ramdani | hramdani@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Maula faiz Adli | madli@hijra.id | c:1 a:0 r:1 | low | — |
| Mohamad Fahri Nazda | mohnazda@hijra.id | c:1 a:0 r:1 | low | — |
| Syafiq Abdillah Umarghanis | sumarghanis@hijra.id | c:1 a:0 r:1 | low | — |
| Dimas Novan Arif Wicaksono | dwicaksono@hijra.id | c:1 a:0 r:1 | low | — |
| Fajar Ramdhani | framdhani@alamisharia.co.id | c:1 a:0 r:1 | low | — |
| Jaka Ardita | jardita@alamisharia.co.id | c:0 a:1 r:0 | low | — |
| Atwatan Malik Mahardi | amahardi@alamisharia.co.id | c:0 a:1 r:0 | low | — |
| Muhammad Faisal Akbar | muhakbar@hijra.id | c:0 a:1 r:0 | low | — |
| Arief Luthfi Aulia | *(email hidden — likely deactivated; accountId `70121:a887183d…`)* | c:0 a:1 r:0 | low | — |
| Ananda Yulizar Muhammad | ayulizar@hijra.id | c:0 a:1 r:0 | low | — |

**Domain split:** 52 users `@alamisharia.co.id`, 28 `@hijra.id`, 1 hidden. Existing Plane workspace is almost entirely `@hijra.id` IT staff — DEPLOY is the first project dominated by the `@alamisharia.co.id` (Alami) engineering org.

**Name-collision flag:** "Danny Dwi Cahyono" has two Jira accounts — `dcahyono@alamisharia.co.id` (Alami) and `dcahyono@hijra.id` (Hijra, the **API key owner / migration bot**). Assignee resolution keys on email, so the Alami account will NOT resolve to the Plane bot member. Confirm intended.

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md) (8 projects, 11 members — verified unchanged this run, no rewrite). Below is only what's specific to DEPLOY.

- **Target project: does NOT exist yet** in Plane → create new.
- **Proposed identifier:** `DEPLOY` — ⚠️ 6 chars; every existing Plane project identifier is ≤5 chars (`PROJE`, `HLRS`…). Confirm this Plane build accepts a 6-char identifier; if not, fall back to `DEP` / `DPL`.
- **Proposed state seed (subset, mirrors HDR precedent):** Todo (unstarted) · In Progress (started) · Done (completed) — only the 3 statuses actually used.
- **Label seed:** the 8 labels above, verbatim (pending decision).
- **Assignee overlap with current Plane members: 5 of 81.**
  Already resolvable: `smaizir@alamisharia.co.id`, `eariyansyah@hijra.id`, `muzizat@hijra.id`, `jnurohman@hijra.id`, `dcahyono@hijra.id` (bot).
- **Stage 1 invitation list: 75 emails** (76 users minus 5 already-in − 1 hidden-email account that cannot be invited by email). Big batch — see decision below.

<details>
<summary>Stage 1 invitation list (75 emails)</summary>

```
aafinas@alamisharia.co.id aananda@alamisharia.co.id aatmaja@alamisharia.co.id
aazis@alamisharia.co.id aaziz@hijra.id adewa@alamisharia.co.id
agutama@alamisharia.co.id amahardi@alamisharia.co.id anasruddin@alamisharia.co.id
aprimarizki@alamisharia.co.id asyafii@alamisharia.co.id aumam@hijra.id
ayudhistira@alamisharia.co.id ayulizar@hijra.id bsuandi@alamisharia.co.id
bwiantoro@alamisharia.co.id csiregar@alamisharia.co.id dcahyono@alamisharia.co.id
djaman@hijra.id dpamudji@hijra.id dramadhan@hijra.id dsulistyono@alamisharia.co.id
dwibisana@hijra.id dwicaksono@hijra.id eoktaviani@alamisharia.co.id
farrahman@alamisharia.co.id flestari@alamisharia.co.id fmaulana@alamisharia.co.id
fmurpratomo@alamisharia.co.id framdhani@alamisharia.co.id gprasetyoadi@hijra.id
gunturvirgenius@hijra.id hramdani@alamisharia.co.id hwardana@alamisharia.co.id
hyasrizal@alamisharia.co.id ijond@alamisharia.co.id jardita@alamisharia.co.id
jputra@hijra.id ltriyadi@alamisharia.co.id mabdullah@hijra.id madli@hijra.id
malfatah@alamisharia.co.id mdihsan@alamisharia.co.id mihidayat@alamisharia.co.id
mlutfi@alamisharia.co.id mmalik@alamisharia.co.id mnurfaqih@alamisharia.co.id
mohnazda@hijra.id mrahim@alamisharia.co.id mridha@alamisharia.co.id
mromdony@alamisharia.co.id mtazkia@alamisharia.co.id muhakbar@hijra.id
myanuar@alamisharia.co.id namar@alamisharia.co.id nrabbani@hijra.id
nwibowo@alamisharia.co.id rgunawan@alamisharia.co.id rhabibie@hijra.id
rikadakbar@hijra.id rmetafiliana@alamisharia.co.id rospamungkas@hijra.id
rramdhanisti@hijra.id rsetiandy@alamisharia.co.id rsuherman@hijra.id
rteharudin@alamisharia.co.id rwiradiputra@alamisharia.co.id sumarghanis@hijra.id
swisnugroho@alamisharia.co.id twakil@alamisharia.co.id tyuswoyo@alamisharia.co.id
vhermawan@hijra.id wfridayoka@hijra.id wprasetya@alamisharia.co.id
zulkarnaen@alamisharia.co.id
```
</details>

## Decisions (resolved 2026-05-20)

- [x] **History scope** — **migrate all 710** (full deployment-log audit record).
- [x] **Invitation scope** — **invite all 75** in Stage 1 (full coverage; whole Alami eng org joins workspace).
- [x] **Project identifier** — **`DEPLOY`**. ⚠️ 6 chars — verify Plane accepts at create time; fall back to `DEP` only if rejected.
- [x] **State seed** — **3-state subset**: Todo (unstarted) · In Progress (started) · Done (completed).
- [x] **Status mapping** — Done→completed (Done), Todo→unstarted (Todo), In Progress→started (In Progress).
- [x] **Priority** — uniform "Medium" → **`medium`** (preserve literal value).
- [x] **Labels** — **keep all 8 verbatim** (Deployment, ALAMI-DEPLOY, HIJRA-DEPLOY, MISHA_BE, Production, HOTFIX, MobileApps, Risk).
- [x] **Custom fields** — **drop all** (Rank, empty Development, unused Sprint/Start date). No footer — content is in description body.
- [x] **Sub-task** — DEPLOY-23 → **keep as child** of DEPLOY-22 (set `parent_id`).
- [x] **Issue links (Cloners, 130 issues)** — **migrate as Plane work-item relations** (preserve clone lineage).
- [x] **Attachments (25 issues)** — **migrate** (Plane storage needs the Cloudflare `Cookie` + system curl; cookie expires — see prior HIJ/II runs).
- [x] **Comments** — **migrate** (sparse).
- [x] **ADF mention/date/smartlink nodes** — **accept flattening** to plain text (PIC @mentions become non-clickable names).
- [x] **Name collision (Danny)** — **alias** `dcahyono@alamisharia.co.id` → `dcahyono@hijra.id` in `config/users.yaml` (same human; resolves to existing Plane bot/member account).
- [x] **Hidden-email user** — Arief Luthfi Aulia: **leave unresolved** (email hidden, cannot invite; 1 item gets empty assignee + prefix, displayName only).
- [x] **Anything NOT to migrate** — nothing extra; sprints/epics absent so naturally skipped.

### Net entity plan for `/migrate-configure` → migrators
issues (710, incl. `parent_id` for DEPLOY-23) · comments (sparse) · attachments (25) · links (Cloners→relations, 130) · **no cycles** · **no modules**.

---
*Decisions locked. Next: `/migrate-configure DEPLOY`.*
