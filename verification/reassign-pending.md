# Stage-3 reassignment — pending (deferred)

> Generated from `state/manifest.jsonl` on 2026-06-22. First full reassign pass is **complete** (1,234 items reassigned, 0 failed). The items below are deferred: their original Jira assignee has **not yet registered on Plane**. Re-run reassignment periodically as people onboard — it is idempotent and only touches still-unassigned items.

## How to clear pending (later)

```
# VPN must be up (plane.hq.hijra.dev:443); API key only, no Plane cookie needed.
# Per project, dry-run first then real:
bun run migrate reassign --jira-project <KEY> --dry-run
bun run migrate reassign --jira-project <KEY>
```
Each run picks up whoever has signed up since the last run. Projects with 0 remaining pending will report `reassigned=0`.

**Note on emails:** many pending assignees use `@alamisharia.co.id` (the original Jira tenant is `alamisharia.atlassian.net`). These are valid — they resolve once the person joins Plane with that company email, same as `@hijra.id` users.

## Pending count per project

| Project | Reassigned (done) | Pending (deferred) |
| --- | ---: | ---: |
| AR | 223 | 839 |
| ARH | 10 | 235 |
| DEPLOY | 23 | 559 |
| HBANK | 670 | 78 |
| HDR | 2 | 52 |
| HLRS | 87 | 313 |
| IHH | 1 | 235 |
| INFRA | 196 | 681 |
| LRP | 22 | 68 |
| **TOTAL** | **1234** | **3060** |

## Who we're waiting on (across all projects)

Sorted by total pending items. When one of these registers, the next reassign run for the listed project(s) will pick up their items.

| Assignee email | Total pending | Projects (count) |
| --- | ---: | --- |
| aafinas@alamisharia.co.id | 217 | AR:140, DEPLOY:32, INFRA:45 |
| agutama@alamisharia.co.id | 200 | AR:73, DEPLOY:20, INFRA:107 |
| anasruddin@alamisharia.co.id | 198 | AR:104, DEPLOY:38, INFRA:56 |
| dramadhan@hijra.id | 193 | AR:63, DEPLOY:7, IHH:1, INFRA:122 |
| amahardi@alamisharia.co.id | 173 | AR:118, DEPLOY:1, INFRA:54 |
| mdihsan@alamisharia.co.id | 136 | AR:59, DEPLOY:27, INFRA:50 |
| rwinanda@hijra.id | 134 | ARH:37, HDR:12, HLRS:81, LRP:4 |
| budiyono@hijra.id | 134 | IHH:134 |
| ldurachman@alamisharia.co.id | 95 | AR:74, INFRA:19, LRP:2 |
| fningsih@hijra.id | 86 | ARH:17, HDR:2, HLRS:67 |
| rmulya@hijra.id | 80 | ARH:19, HLRS:58, LRP:3 |
| hpranoto@alamisharia.co.id | 79 | AR:8, INFRA:71 |
| amuntasir@alamisharia.co.id | 71 | AR:3, IHH:68 |
| ryonanda@hijra.id | 68 | ARH:7, HDR:10, HLRS:28, LRP:23 |
| awiyono@hijra.id | 63 | ARH:28, HDR:1, HLRS:33, LRP:1 |
| mihidayat@alamisharia.co.id | 51 | AR:1, DEPLOY:48, INFRA:2 |
| rtriandy@hijra.id | 51 | ARH:40, HDR:5, LRP:6 |
| mromdony@alamisharia.co.id | 45 | AR:12, DEPLOY:11, INFRA:22 |
| wardana@hijra.id | 43 | AR:36, INFRA:7 |
| danuaw@alamisharia.co.id | 39 | INFRA:39 |
| rsulistyo@hijra.id | 38 | AR:12, HBANK:1, INFRA:25 |
| rsetiandy@alamisharia.co.id | 37 | AR:5, DEPLOY:31, IHH:1 |
| takhmad@hijra.id | 37 | ARH:36, LRP:1 |
| vhermawan@hijra.id | 34 | DEPLOY:34 |
| ayulizar@hijra.id | 33 | AR:16, DEPLOY:1, INFRA:16 |
| smaizir@alamisharia.co.id | 33 | AR:3, DEPLOY:29, INFRA:1 |
| framdhani@alamisharia.co.id | 32 | AR:26, INFRA:6 |
| awikasyah@hijra.id | 32 | ARH:9, HDR:1, HLRS:21, LRP:1 |
| fwidyatmoko@hijra.id | 30 | ARH:24, HDR:6 |
| ranisa@hijra.id | 29 | AR:1, HBANK:28 |
| mnurfaqih@alamisharia.co.id | 29 | DEPLOY:12, HBANK:17 |
| mrahim@alamisharia.co.id | 28 | DEPLOY:28 |
| aramadhan@hijra.id | 23 | ARH:10, HLRS:13 |
| aroziqin@alamisharia.co.id | 21 | AR:9, INFRA:12 |
| rramdhanisti@hijra.id | 20 | AR:4, DEPLOY:15, HBANK:1 |
| djaman@hijra.id | 20 | DEPLOY:19, HBANK:1 |
| rmetafiliana@alamisharia.co.id | 20 | DEPLOY:20 |
| mabdullah@hijra.id | 19 | AR:18, DEPLOY:1 |
| fmaulana@alamisharia.co.id | 18 | AR:1, DEPLOY:16, HBANK:1 |
| fmurpratomo@alamisharia.co.id | 17 | DEPLOY:17 |
| muzizat@hijra.id | 16 | AR:2, DEPLOY:12, IHH:2 |
| dsulistyono@alamisharia.co.id | 16 | AR:1, DEPLOY:15 |
| tyuswoyo@alamisharia.co.id | 15 | DEPLOY:15 |
| muhakbar@hijra.id | 14 | AR:3, DEPLOY:1, HBANK:10 |
| aabdullah@alamisharia.co.id | 14 | AR:6, INFRA:8 |
| gunturvirgenius@hijra.id | 13 | AR:1, DEPLOY:9, INFRA:3 |
| gprasetyoadi@hijra.id | 13 | DEPLOY:10, IHH:3 |
| csiregar@alamisharia.co.id | 13 | DEPLOY:13 |
| asurbakti@alamisharia.co.id | 11 | AR:7, INFRA:4 |
| tjafar@hijra.id | 10 | AR:1, HBANK:9 |
| aharyanto@alamisharia.co.id | 10 | AR:1, IHH:9 |
| hyasrizal@alamisharia.co.id | 10 | AR:1, DEPLOY:9 |
| rmahendra@hijra.id | 10 | ARH:3, HLRS:6, LRP:1 |
| msutisna@hijra.id | 10 | HDR:3, LRP:7 |
| rwiradiputra@alamisharia.co.id | 9 | DEPLOY:9 |
| aatmaja@alamisharia.co.id | 8 | DEPLOY:8 |
| esukmaraga@hijra.id | 7 | ARH:1, HDR:2, HLRS:4 |
| jnurohman@hijra.id | 7 | IHH:6, LRP:1 |
| aferdinand@alamisharia.co.id | 7 | INFRA:7 |
| eariyansyah@hijra.id | 6 | AR:5, IHH:1 |
| mfathurohman@hijra.id | 6 | HBANK:6 |
| aprasetyo@alamisharia.co.id | 5 | AR:5 |
| rliskiyari@hijra.id | 5 | AR:1, HBANK:4 |
| namar@alamisharia.co.id | 5 | DEPLOY:5 |
| asyafii@alamisharia.co.id | 5 | DEPLOY:5 |
| rwicaksana@hijra.id | 5 | LRP:5 |
| ijond@alamisharia.co.id | 4 | AR:1, DEPLOY:3 |
| malfatah@alamisharia.co.id | 4 | DEPLOY:4 |
| adewa@alamisharia.co.id | 4 | DEPLOY:4 |
| rikadakbar@hijra.id | 4 | DEPLOY:1, IHH:3 |
| rhabibie@hijra.id | 4 | DEPLOY:1, IHH:3 |
| zulkarnaen@alamisharia.co.id | 4 | DEPLOY:4 |
| hseptiani@hijra.id | 4 | HDR:1, LRP:3 |
| qfadlan@hijra.id | 3 | AR:3 |
| fgautama@alamisharia.co.id | 3 | AR:3 |
| aelyonsa@hijra.id | 3 | ARH:2, LRP:1 |
| swisnugroho@alamisharia.co.id | 3 | DEPLOY:3 |
| aaziz@hijra.id | 3 | DEPLOY:3 |
| wwidhyastuti@hijra.id | 3 | HDR:1, LRP:2 |
| afariza@hijra.id | 2 | AR:2 |
| aumam@hijra.id | 2 | AR:2 |
| amuhajir@hijra.id | 2 | ARH:2 |
| mtazkia@alamisharia.co.id | 2 | DEPLOY:2 |
| wfridayoka@hijra.id | 2 | DEPLOY:2 |
| dpamudji@hijra.id | 2 | DEPLOY:1, INFRA:1 |
| rsuherman@hijra.id | 2 | DEPLOY:2 |
| rospamungkas@hijra.id | 2 | DEPLOY:2 |
| jardita@alamisharia.co.id | 2 | DEPLOY:1, INFRA:1 |
| atkurniawan@hijra.id | 2 | HDR:2 |
| fdawami@hijra.id | 2 | HDR:1, LRP:1 |
| muhajir@hijra.id | 2 | HDR:2 |
| mnizar@hijra.id | 2 | HDR:2 |
| samelia@hijra.id | 2 | IHH:2 |
| arohmat@hijra.id | 2 | LRP:2 |
| efazrin@hijra.id | 1 | AR:1 |
| fsandi@alamisharia.co.id | 1 | AR:1 |
| nurdiansyah@alamisharia.co.id | 1 | AR:1 |
| ewibowo@alamisharia.co.id | 1 | AR:1 |
| dzubaidi@hijra.id | 1 | AR:1 |
| ialawi@alamisharia.co.id | 1 | AR:1 |
| mtadarus@hijra.id | 1 | AR:1 |
| muhputra@alamisharia.co.id | 1 | AR:1 |
| rgunawan@alamisharia.co.id | 1 | DEPLOY:1 |
| bwiantoro@alamisharia.co.id | 1 | DEPLOY:1 |
| ltriyadi@alamisharia.co.id | 1 | DEPLOY:1 |
| aazis@alamisharia.co.id | 1 | DEPLOY:1 |
| mmalik@alamisharia.co.id | 1 | DEPLOY:1 |
| ayudhistira@alamisharia.co.id | 1 | DEPLOY:1 |
| wprasetya@alamisharia.co.id | 1 | DEPLOY:1 |
| nrabbani@hijra.id | 1 | DEPLOY:1 |
| atriyatmojo@hijra.id | 1 | HDR:1 |
| mghifari@hijra.id | 1 | HLRS:1 |
| esetyawati@hijra.id | 1 | HLRS:1 |
| ahakim@hijra.id | 1 | IHH:1 |
| apajar@hijra.id | 1 | IHH:1 |
| apradana@hijra.id | 1 | INFRA:1 |
| asaepudin@alamisharia.co.id | 1 | INFRA:1 |
| bsuandi@alamisharia.co.id | 1 | INFRA:1 |
| mdaffa@hijra.id | 1 | LRP:1 |
| eprabowo@hijra.id | 1 | LRP:1 |
| famir@hijra.id | 1 | LRP:1 |
| nsatria@alamisharia.co.id | 1 | LRP:1 |

## Per-project detail

### AR — 839 pending

| Assignee email | Items |
| --- | ---: |
| aafinas@alamisharia.co.id | 140 |
| amahardi@alamisharia.co.id | 118 |
| anasruddin@alamisharia.co.id | 104 |
| ldurachman@alamisharia.co.id | 74 |
| agutama@alamisharia.co.id | 73 |
| dramadhan@hijra.id | 63 |
| mdihsan@alamisharia.co.id | 59 |
| wardana@hijra.id | 36 |
| framdhani@alamisharia.co.id | 26 |
| mabdullah@hijra.id | 18 |
| ayulizar@hijra.id | 16 |
| rsulistyo@hijra.id | 12 |
| mromdony@alamisharia.co.id | 12 |
| aroziqin@alamisharia.co.id | 9 |
| hpranoto@alamisharia.co.id | 8 |
| asurbakti@alamisharia.co.id | 7 |
| aabdullah@alamisharia.co.id | 6 |
| eariyansyah@hijra.id | 5 |
| aprasetyo@alamisharia.co.id | 5 |
| rsetiandy@alamisharia.co.id | 5 |
| rramdhanisti@hijra.id | 4 |
| muhakbar@hijra.id | 3 |
| smaizir@alamisharia.co.id | 3 |
| qfadlan@hijra.id | 3 |
| amuntasir@alamisharia.co.id | 3 |
| fgautama@alamisharia.co.id | 3 |
| muzizat@hijra.id | 2 |
| afariza@hijra.id | 2 |
| aumam@hijra.id | 2 |
| tjafar@hijra.id | 1 |
| efazrin@hijra.id | 1 |
| mihidayat@alamisharia.co.id | 1 |
| ranisa@hijra.id | 1 |
| fsandi@alamisharia.co.id | 1 |
| nurdiansyah@alamisharia.co.id | 1 |
| ewibowo@alamisharia.co.id | 1 |
| aharyanto@alamisharia.co.id | 1 |
| ijond@alamisharia.co.id | 1 |
| fmaulana@alamisharia.co.id | 1 |
| dsulistyono@alamisharia.co.id | 1 |
| dzubaidi@hijra.id | 1 |
| rliskiyari@hijra.id | 1 |
| ialawi@alamisharia.co.id | 1 |
| mtadarus@hijra.id | 1 |
| hyasrizal@alamisharia.co.id | 1 |
| gunturvirgenius@hijra.id | 1 |
| muhputra@alamisharia.co.id | 1 |

### ARH — 235 pending

| Assignee email | Items |
| --- | ---: |
| rtriandy@hijra.id | 40 |
| rwinanda@hijra.id | 37 |
| takhmad@hijra.id | 36 |
| awiyono@hijra.id | 28 |
| fwidyatmoko@hijra.id | 24 |
| rmulya@hijra.id | 19 |
| fningsih@hijra.id | 17 |
| aramadhan@hijra.id | 10 |
| awikasyah@hijra.id | 9 |
| ryonanda@hijra.id | 7 |
| rmahendra@hijra.id | 3 |
| aelyonsa@hijra.id | 2 |
| amuhajir@hijra.id | 2 |
| esukmaraga@hijra.id | 1 |

### DEPLOY — 559 pending

| Assignee email | Items |
| --- | ---: |
| mihidayat@alamisharia.co.id | 48 |
| anasruddin@alamisharia.co.id | 38 |
| vhermawan@hijra.id | 34 |
| aafinas@alamisharia.co.id | 32 |
| rsetiandy@alamisharia.co.id | 31 |
| smaizir@alamisharia.co.id | 29 |
| mrahim@alamisharia.co.id | 28 |
| mdihsan@alamisharia.co.id | 27 |
| rmetafiliana@alamisharia.co.id | 20 |
| agutama@alamisharia.co.id | 20 |
| djaman@hijra.id | 19 |
| fmurpratomo@alamisharia.co.id | 17 |
| fmaulana@alamisharia.co.id | 16 |
| dsulistyono@alamisharia.co.id | 15 |
| rramdhanisti@hijra.id | 15 |
| tyuswoyo@alamisharia.co.id | 15 |
| csiregar@alamisharia.co.id | 13 |
| mnurfaqih@alamisharia.co.id | 12 |
| muzizat@hijra.id | 12 |
| mromdony@alamisharia.co.id | 11 |
| gprasetyoadi@hijra.id | 10 |
| hyasrizal@alamisharia.co.id | 9 |
| rwiradiputra@alamisharia.co.id | 9 |
| gunturvirgenius@hijra.id | 9 |
| aatmaja@alamisharia.co.id | 8 |
| dramadhan@hijra.id | 7 |
| namar@alamisharia.co.id | 5 |
| asyafii@alamisharia.co.id | 5 |
| malfatah@alamisharia.co.id | 4 |
| adewa@alamisharia.co.id | 4 |
| zulkarnaen@alamisharia.co.id | 4 |
| swisnugroho@alamisharia.co.id | 3 |
| ijond@alamisharia.co.id | 3 |
| aaziz@hijra.id | 3 |
| mtazkia@alamisharia.co.id | 2 |
| wfridayoka@hijra.id | 2 |
| rsuherman@hijra.id | 2 |
| rospamungkas@hijra.id | 2 |
| mabdullah@hijra.id | 1 |
| muhakbar@hijra.id | 1 |
| rgunawan@alamisharia.co.id | 1 |
| ayulizar@hijra.id | 1 |
| bwiantoro@alamisharia.co.id | 1 |
| rikadakbar@hijra.id | 1 |
| ltriyadi@alamisharia.co.id | 1 |
| aazis@alamisharia.co.id | 1 |
| mmalik@alamisharia.co.id | 1 |
| ayudhistira@alamisharia.co.id | 1 |
| rhabibie@hijra.id | 1 |
| wprasetya@alamisharia.co.id | 1 |
| nrabbani@hijra.id | 1 |
| amahardi@alamisharia.co.id | 1 |
| dpamudji@hijra.id | 1 |
| jardita@alamisharia.co.id | 1 |

### HBANK — 78 pending

| Assignee email | Items |
| --- | ---: |
| ranisa@hijra.id | 28 |
| mnurfaqih@alamisharia.co.id | 17 |
| muhakbar@hijra.id | 10 |
| tjafar@hijra.id | 9 |
| mfathurohman@hijra.id | 6 |
| rliskiyari@hijra.id | 4 |
| rramdhanisti@hijra.id | 1 |
| djaman@hijra.id | 1 |
| rsulistyo@hijra.id | 1 |
| fmaulana@alamisharia.co.id | 1 |

### HDR — 52 pending

| Assignee email | Items |
| --- | ---: |
| rwinanda@hijra.id | 12 |
| ryonanda@hijra.id | 10 |
| fwidyatmoko@hijra.id | 6 |
| rtriandy@hijra.id | 5 |
| msutisna@hijra.id | 3 |
| esukmaraga@hijra.id | 2 |
| atkurniawan@hijra.id | 2 |
| fningsih@hijra.id | 2 |
| muhajir@hijra.id | 2 |
| mnizar@hijra.id | 2 |
| fdawami@hijra.id | 1 |
| hseptiani@hijra.id | 1 |
| awikasyah@hijra.id | 1 |
| wwidhyastuti@hijra.id | 1 |
| atriyatmojo@hijra.id | 1 |
| awiyono@hijra.id | 1 |

### HLRS — 313 pending

| Assignee email | Items |
| --- | ---: |
| rwinanda@hijra.id | 81 |
| fningsih@hijra.id | 67 |
| rmulya@hijra.id | 58 |
| awiyono@hijra.id | 33 |
| ryonanda@hijra.id | 28 |
| awikasyah@hijra.id | 21 |
| aramadhan@hijra.id | 13 |
| rmahendra@hijra.id | 6 |
| esukmaraga@hijra.id | 4 |
| mghifari@hijra.id | 1 |
| esetyawati@hijra.id | 1 |

### IHH — 235 pending

| Assignee email | Items |
| --- | ---: |
| budiyono@hijra.id | 134 |
| amuntasir@alamisharia.co.id | 68 |
| aharyanto@alamisharia.co.id | 9 |
| jnurohman@hijra.id | 6 |
| rikadakbar@hijra.id | 3 |
| gprasetyoadi@hijra.id | 3 |
| rhabibie@hijra.id | 3 |
| muzizat@hijra.id | 2 |
| samelia@hijra.id | 2 |
| eariyansyah@hijra.id | 1 |
| dramadhan@hijra.id | 1 |
| ahakim@hijra.id | 1 |
| rsetiandy@alamisharia.co.id | 1 |
| apajar@hijra.id | 1 |

### INFRA — 681 pending

| Assignee email | Items |
| --- | ---: |
| dramadhan@hijra.id | 122 |
| agutama@alamisharia.co.id | 107 |
| hpranoto@alamisharia.co.id | 71 |
| anasruddin@alamisharia.co.id | 56 |
| amahardi@alamisharia.co.id | 54 |
| mdihsan@alamisharia.co.id | 50 |
| aafinas@alamisharia.co.id | 45 |
| danuaw@alamisharia.co.id | 39 |
| rsulistyo@hijra.id | 25 |
| mromdony@alamisharia.co.id | 22 |
| ldurachman@alamisharia.co.id | 19 |
| ayulizar@hijra.id | 16 |
| aroziqin@alamisharia.co.id | 12 |
| aabdullah@alamisharia.co.id | 8 |
| wardana@hijra.id | 7 |
| aferdinand@alamisharia.co.id | 7 |
| framdhani@alamisharia.co.id | 6 |
| asurbakti@alamisharia.co.id | 4 |
| gunturvirgenius@hijra.id | 3 |
| mihidayat@alamisharia.co.id | 2 |
| apradana@hijra.id | 1 |
| dpamudji@hijra.id | 1 |
| asaepudin@alamisharia.co.id | 1 |
| jardita@alamisharia.co.id | 1 |
| bsuandi@alamisharia.co.id | 1 |
| smaizir@alamisharia.co.id | 1 |

### LRP — 68 pending

| Assignee email | Items |
| --- | ---: |
| ryonanda@hijra.id | 23 |
| msutisna@hijra.id | 7 |
| rtriandy@hijra.id | 6 |
| rwicaksana@hijra.id | 5 |
| rwinanda@hijra.id | 4 |
| rmulya@hijra.id | 3 |
| hseptiani@hijra.id | 3 |
| ldurachman@alamisharia.co.id | 2 |
| wwidhyastuti@hijra.id | 2 |
| arohmat@hijra.id | 2 |
| mdaffa@hijra.id | 1 |
| fdawami@hijra.id | 1 |
| eprabowo@hijra.id | 1 |
| jnurohman@hijra.id | 1 |
| aelyonsa@hijra.id | 1 |
| famir@hijra.id | 1 |
| awikasyah@hijra.id | 1 |
| takhmad@hijra.id | 1 |
| awiyono@hijra.id | 1 |
| nsatria@alamisharia.co.id | 1 |
| rmahendra@hijra.id | 1 |

