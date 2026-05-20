# Discovery: AR

Generated: 2026-05-20T17:07+07:00 by Claude Code

Jira project **AR — "Access Request"** (project id `10052`, team-managed/`simplified` software project). Self-service access-request queue: each ticket asks for access to some system (DB, VPN, Kibana, GCP, repos, …). Overwhelmingly flat `Task`s, single priority, mostly `Done`. Largest project migrated so far by issue count.

## Jira side

### Project summary
- Total issues: **1523** (high-water key AR-1549; gap = deletes)
- Issue types: Task 1520, Epic 3 — **0 sub-tasks**
- Sprints (active/closed/future): **0 / 0 / 0** — no Agile board / sprint field in use
- Epics: **3**
- Distinct user-accounts touching the project: **217** (211 distinct emails; 6 accounts expose no email)

### Issue types
| Type | Count | Notes |
| ---- | ----- | ----- |
| Task | 1520  | flat work items |
| Epic | 3     | → Plane modules |
| Subtask | 0  | none present; no `parent_id` handling needed |

### Statuses
| Jira status        | Count | Proposed Plane state group | Proposed Plane state name |
| ------------------ | ----- | -------------------------- | ------------------------- |
| Done               | 1360  | completed                  | Done                      |
| On Hold/Cancelled  | 87    | cancelled                  | On Hold/Cancelled         |
| To Do              | 64    | unstarted                  | To Do                     |
| In Progress        | 9     | started                    | In Progress               |
| Need Review        | 3     | started                    | In Review (reuse II custom) |

Only 5 statuses in use. Following the HDR/HLRS precedent (seed only the statuses the project actually uses, verbatim), proposed seed = these 5 — no default `Backlog` since AR has none.

### Priorities
| Jira priority | Count | Proposed Plane priority |
| ------------- | ----- | ----------------------- |
| Medium        | 1523  | medium                  |

Every issue is `Medium`. Trivial: map `Medium → medium`, leave Plane default for the rest.

### Labels
| Label   | Count |
| ------- | ----- |
| IAM     | 2     |
| Product | 1     |
| support | 1     |
| FOS     | 1     |
| Other   | 1     |

Only 6 label-applications across 5 labels. Proposal: keep all 5 verbatim (1:1), trivial cost. (Alternative: drop — negligible signal.)

### Custom fields (populated on ≥1 issue)
| Field id           | Name        | Type   | Count | Sample values | Proposed action |
| ------------------ | ----------- | ------ | ----- | ------------- | --------------- |
| customfield_10000  | Development | object | 1523  | `{}`, `{pullrequest=…state=MERGED}` | **drop** — Jira dev-panel/Git integration data, not user content |
| customfield_10019  | Rank        | string | 1523  | `2\|hzrhkn:` | **drop** — internal LexoRank ordering |
| customfield_10393  | Date        | date   | 25    | `2024-01-31`, `2024-02-22` | **decision** — real date on 25 (mostly 2024) issues. `description` (fold into footer) or `drop`? |
| customfield_10017  | Issue color | string | 3     | `purple` | **drop** — cosmetic epic colour |

No real custom-property target exists on this Plane CE build (Work Item Types stripped — see `config/_plane.md`). Anything kept becomes a description footer, not a true property.

### Sprints
None. No board, no sprint custom field populated. Nothing to migrate as cycles.

### Epics
3 total — migrate as Plane modules (proposal):
- AR-620: Request access VPN Hijra Non Prod
- AR-646: Request Acceess VPN Hijra Staging
- AR-1221: [Database Access] Access Request DB Colms Prod IT Support

Child-task linkage not yet counted; the epics→modules migrator reports membership at run time. With only 3 epics this is low-cost either way.

### Users
217 accounts touched AR (sorted by total activity = created + assigned + reported). `act`: high ≥100, med ≥20, low <20. `mem` = already a Plane workspace member.

| email | display name | c/a/r | act | mem |
| ----- | ------------ | ----- | --- | --- |
| jnurohman@hijra.id | Jati Nurohman | c17/a223/r17 | high | ✅ |
| aafinas@alamisharia.co.id | Achmad Mu'ammar Afinas | c10/a140/r10 | high |  |
| ldurachman@alamisharia.co.id | Lukmanul Hakim Durachman | c34/a73/r33 | high | ✅ |
| amahardi@alamisharia.co.id | Atwatan Malik Mahardi | c5/a119/r5 | high |  |
| anasruddin@alamisharia.co.id | anan | c1/a104/r1 | high |  |
| mihidayat@alamisharia.co.id | Muhammad Ilham Hidayat | c47/a1/r47 | med |  |
| agutama@alamisharia.co.id | Agus Wibawa | c9/a73/r9 | med |  |
| rmetafiliana@alamisharia.co.id | Muhammad Rizfardi Metafiliana | c44/a0/r44 | med |  |
| smaizir@alamisharia.co.id | Sirajuddin Maizir | c42/a3/r42 | med | ✅ |
| wardana@hijra.id | Wahyu Muqsita Wardana | c20/a36/r20 | med |  |
| eariyansyah@hijra.id | Eka Ariyansyah | c35/a5/r35 | med | ✅ |
| dramadhan@hijra.id | Dicky Ramadhan | c5/a64/r5 | med |  |
| wfridayoka@hijra.id | Wahidyan Kresna Fridayoka | c37/a0/r37 | med |  |
| mdihsan@alamisharia.co.id | Maulid Ihsan | c3/a59/r3 | med |  |
| mnurfaqih@alamisharia.co.id | Muhammad Anova Nurfaqih | c32/a0/r32 | med |  |
| fmaulana@alamisharia.co.id | Firman Maulana | c31/a1/r31 | med |  |
| mabdullah@hijra.id | Muhammad Syarif Abdullah | c22/a18/r22 | med |  |
| rramdhanisti@hijra.id | Reza Ramdhanisti | c27/a4/r27 | med |  |
| vhermawan@hijra.id | vhermawan | c26/a0/r26 | med |  |
| qfadlan@hijra.id | Q Fadlan | c23/a3/r23 | med |  |
| aprasetyo@alamisharia.co.id | Anom Prasetyo Utomo | c21/a5/r21 | med |  |
| muzizat@hijra.id | ziezat | c22/a2/r22 | med | ✅ |
| adewa@alamisharia.co.id | Ananta Arya Dewa | c23/a0/r23 | med |  |
| afariza@hijra.id | Arifah Fariza | c22/a2/r22 | med |  |
| rhabibie@hijra.id | Rizaldi Habibie | c21/a0/r21 | med |  |
| niskandar@alamisharia.co.id | Nurfauzi Iskandar | c20/a0/r21 | med |  |
| hyasrizal@alamisharia.co.id | Hadyan Putra Yasrizal | c18/a1/r18 | med |  |
| djaman@hijra.id | Dede Badru Jaman | c18/a0/r18 | med |  |
| akautsar@alamisharia.co.id | Edo Kautsar | c18/a0/r18 | med |  |
| rmunandar@alamisharia.co.id | Ray Munandar | c17/a0/r17 | med |  |
| framdhani@alamisharia.co.id | Fajar Ramdhani | c4/a26/r4 | med |  |
| mromdony@alamisharia.co.id | Mochamad Taufik Romdony | c10/a12/r10 | med |  |
| ijond@alamisharia.co.id | Ivan Jond | c15/a1/r15 | med |  |
| ranisa@hijra.id | Rahma Anisa | c15/a1/r15 | med |  |
| aabdullah@alamisharia.co.id | Ainun Abdullah | c12/a6/r12 | med |  |
| bwiantoro@alamisharia.co.id | Bagus Juang Wiantoro | c15/a0/r15 | med |  |
| myanuar@alamisharia.co.id | Mohammad Wildan Yanuar | c15/a0/r15 | med |  |
| fmurpratomo@alamisharia.co.id | Fahmi Murpratomo | c15/a0/r15 | med |  |
| rsetiandy@alamisharia.co.id | Rommy Akbar Ferdian Setiandy | c12/a5/r12 | med |  |
| andputra@alamisharia.co.id | Andida Syahendar Dwi Putra | c14/a0/r14 | med |  |
| mrahim@alamisharia.co.id | Muhammad Rais Rahim | c14/a0/r14 | med |  |
| rikadakbar@hijra.id | Rikad Akbar Ramadhan | c14/a0/r14 | med |  |
| ltriyadi@alamisharia.co.id | Lukman Triyadi | c14/a0/r14 | med |  |
| gunturvirgenius@hijra.id | Guntur Vo | c13/a1/r13 | med |  |
| asaifullah@hijra.id | Ahsanul Khuluq Saifullah | c13/a0/r13 | med |  |
| msabdono@alamisharia.co.id | Muhammad Robby | c13/a0/r13 | med |  |
| malfatah@alamisharia.co.id | Muksin Alfatah | c13/a0/r13 | med |  |
| namar@alamisharia.co.id | Nursan Amar | c12/a0/r12 | med |  |
| tjiwandana@alamisharia.co.id | Teguh Jiwandana | c12/a0/r12 | med |  |
| gprasetyoadi@hijra.id | Gumilar Prasetyoadi | c11/a0/r11 | med |  |
| ayudhistira@alamisharia.co.id | Ananda Bayu Putra Yudhistira | c11/a0/r11 | med |  |
| ayulizar@hijra.id | Ananda Yulizar Muhammad | c3/a16/r3 | med |  |
| dsulistyono@alamisharia.co.id | Dimas Harry Sulistyono | c10/a1/r10 | med |  |
| muhakbar@hijra.id | Muhammad Faisal Akbar | c9/a3/r9 | med |  |
| nurdiansyah@alamisharia.co.id | Nurdiansyah | c10/a1/r10 | med |  |
| hpranoto@alamisharia.co.id | Heru Pranoto | c6/a8/r6 | med |  |
| asetyo@alamisharia.co.id | Aris Noor Setyo | c10/a0/r10 | med |  |
| nalhumaira@hijra.id | Nadya Zalsabila Alhumaira | c10/a0/r10 | med |  |
| rteharudin@alamisharia.co.id | Ridwan Teharudin | c10/a0/r10 | med |  |
| farrahman@alamisharia.co.id | Farhan Arrahman | c10/a0/r10 | med |  |
| mwidahta@alamisharia.co.id | Malna Widahta | c10/a0/r10 | med |  |
| efazrin@hijra.id | Efriliawan Noor Fazrin | c9/a1/r9 | low | ✅ |
| tyuswoyo@alamisharia.co.id | Yusuf Tri Yuswoyo | c9/a0/r9 | low |  |
| mfathurohman@hijra.id | Muhammad Arif Fathurohman | c9/a0/r9 | low |  |
| mtazkia@alamisharia.co.id | Muhammad Alfarizi Tazkia | c9/a0/r9 | low |  |
| mmaromi@alamisharia.co.id | Muhammad S Maromi | c9/a0/r9 | low |  |
| dcahyono@alamisharia.co.id | Danny Dwi Cahyono | c9/a0/r9 | low |  |
| kdongoran@alamisharia.co.id | Khairul Abdi Dongoran | c9/a0/r9 | low |  |
| fsandi@alamisharia.co.id | Fitra Adhitya Sandi | c8/a1/r8 | low |  |
| dzubaidi@hijra.id | Daud Abdilah Zubaidi | c8/a1/r8 | low |  |
| mlutfi@alamisharia.co.id | Muchamad Lutfi Maulana | c8/a0/r8 | low |  |
| aumam@hijra.id | Asrorul Umam | c7/a2/r7 | low |  |
| ayohana@alamisharia.co.id | Arif Yohana | c8/a0/r8 | low |  |
| rsulistyo@hijra.id | Rheno Sulistyo | c2/a12/r2 | low |  |
| ialawi@alamisharia.co.id | Irfan Husni Alawi | c7/a1/r7 | low |  |
| madli@hijra.id | Maula faiz Adli | c7/a0/r7 | low |  |
| mohnazda@hijra.id | Mohamad Fahri Nazda | c7/a0/r7 | low |  |
| nrabbani@hijra.id | Naufal Malik Rabbani | c7/a0/r7 | low |  |
| rgunawan@alamisharia.co.id | Rakhmat Setia Gunawan | c7/a0/r7 | low |  |
| swisnugroho@alamisharia.co.id | Satrio Wisnugroho | c7/a0/r7 | low |  |
| muhputra@alamisharia.co.id | Muhammad Sidiq Putra | c6/a1/r6 | low |  |
| amuntasir@alamisharia.co.id | Adnan Muntasir | c5/a3/r5 | low |  |
| nnurhamdani@alamisharia.co.id | Nova Nurhamdani | c6/a0/r6 | low |  |
| admin@alamisharia.co.id | Mina Admina | c6/a0/r6 | low |  |
| nlatifah@hijra.id | Nina Latifah | c6/a0/r6 | low |  |
| apradana@hijra.id | Anggi Rifa Pradana | c6/a0/r6 | low |  |
| fbelladina@hijra.id | Raden Ajeng Feby Lailani Belladina | c6/a0/r6 | low |  |
| ddzahaban@hijra.id | Dahru Dzahaban | c6/a0/r6 | low |  |
| asyafii@alamisharia.co.id | Abdul Mughni | c6/a0/r6 | low |  |
| phanum@alamisharia.co.id | Panji Hanum | c6/a0/r6 | low |  |
| aroziqin@alamisharia.co.id | Ahmad Irsyadur Roziqin | c1/a10/r1 | low |  |
| rliskiyari@hijra.id | Redita Liskiyari | c5/a1/r5 | low |  |
| koktaviari@hijra.id | Kartika Nur Oktaviari | c5/a0/r5 | low |  |
| ftamara@alamisharia.co.id | Fahreza Tamara | c5/a0/r5 | low |  |
| tsetyawan@hijra.id | Teguh Ambar Setyawan | c5/a0/r5 | low |  |
| rwinata@hijra.id | Rully Rosmeidy Winata | c5/a0/r5 | low |  |
| abaidowi@hijra.id | Achmad Thoriq Baidowi | c5/a0/r5 | low |  |
| danuaw@alamisharia.co.id | Danu | c5/a0/r5 | low |  |
| aprimarizki@alamisharia.co.id | Adam Primarizki | c5/a0/r5 | low |  |
| nufaira@alamisharia.co.id | Nisrina Dhia Ufaira | c5/a0/r5 | low |  |
| fsaputra@hijra.id | Ferri Saputra | c5/a0/r5 | low |  |
| hnupus@hijra.id | Hamdatun Nupus | c5/a0/r5 | low |  |
| brianto@alamisharia.co.id | Bima Priambodo Wahyu Rianto | c5/a0/r5 | low |  |
| rwiradiputra@alamisharia.co.id | Ragil Wiradiputra | c5/a0/r5 | low |  |
| nwibowo@alamisharia.co.id | Nurhadi Wibowo | c5/a0/r5 | low |  |
| twakil@alamisharia.co.id | Teuku Arinal Wakil | c5/a0/r5 | low |  |
| aharyanto@alamisharia.co.id | Agus Haryanto | c4/a1/r4 | low |  |
| rospamungkas@hijra.id | Rosliani Widia Pamungkas | c4/a0/r4 | low |  |
| fraihan@hijra.id | Faiq Raihan | c4/a0/r4 | low |  |
| aaziz@hijra.id | Abdul Aziz | c4/a0/r4 | low |  |
| jputra@hijra.id | Jody Riztana Putra | c4/a0/r4 | low |  |
| ndinda@hijra.id | Nurul Rahma Dinda | c4/a0/r4 | low |  |
| dwicaksono@hijra.id | Dimas Novan Arif Wicaksono | c4/a0/r4 | low |  |
| adzutama@alamisharia.co.id | adzanny | c4/a0/r4 | low |  |
| mridha@alamisharia.co.id | Muhammad Ali Ridha | c4/a0/r4 | low |  |
| afirmansyah@hijra.id | Ardi Firmansyah | c4/a0/r4 | low |  |
| aazis@alamisharia.co.id | aazis | c4/a0/r4 | low |  |
| eoktaviani@alamisharia.co.id | Erliandra Oktaviani Ernanto | c4/a0/r4 | low |  |
| mfirdausi@alamisharia.co.id | Muhammad Fakhry Firdausi | c4/a0/r4 | low |  |
| moktareza@alamisharia.co.id | MAHESA OKTAREZA | c4/a0/r4 | low |  |
| fnurul@hijra.id | Fria Nurul Hidayat | c4/a0/r4 | low |  |
| dcahyono@hijra.id | Danny Dwi Cahyono | c4/a0/r4 | low | ✅ |
| asurbakti@alamisharia.co.id | Agung Wibowo | c0/a7/r0 | low |  |
| dwibisana@hijra.id | Doni Dera Wibisana | c3/a0/r3 | low |  |
| arhakim@hijra.id | Arief Rahman Hakim | c3/a0/r3 | low |  |
| vhentyadi@alamisharia.co.id | Viskaya Purbowo Hentyadi | c3/a0/r3 | low |  |
| sumarghanis@hijra.id | Syafiq Abdillah Umarghanis | c3/a0/r3 | low |  |
| fmuchtar@hijra.id | Fajrian Muchtar | c3/a0/r3 | low |  |
| lnurrohman@hijra.id | Latief Nurrohman | c3/a0/r3 | low |  |
| fhanifah@alamisharia.co.id | Filza Hanifah | c3/a0/r3 | low |  |
| apaksi@hijra.id | Anggoro Bintang Nur Paksi | c3/a0/r3 | low | ✅ |
| bsuandi@alamisharia.co.id | Berri Suandi | c3/a0/r3 | low |  |
| jardita@alamisharia.co.id | Jaka Ardita | c3/a0/r3 | low |  |
| maidzola@hijra.id | maidzola | c3/a0/r3 | low | ✅ |
| wprasetya@alamisharia.co.id | Ahmad Wigo Prasetya | c3/a0/r3 | low |  |
| mmalik@alamisharia.co.id | Mukti Malik | c3/a0/r3 | low |  |
| ksuryani@alamisharia.co.id | Karina Novita Suryani | c3/a0/r3 | low |  |
| akoraji@alamisharia.co.id | Azhima Koraji | c3/a0/r3 | low |  |
| fgautama@alamisharia.co.id | Firman Gautama | c1/a3/r1 | low |  |
| mtadarus@hijra.id | Muhamad Tadarus | c2/a1/r2 | low |  |
| ewibowo@alamisharia.co.id | Eriyanto Wibowo | c2/a1/r2 | low |  |
| rpriastomo@alamisharia.co.id | Ristyo Yogi Priastomo | c2/a0/r2 | low |  |
| azain@alamisharia.co.id | Achmad Baichuni Zain | c2/a0/r2 | low |  |
| ssetiawati@hijra.id | Septi Setiawati | c2/a0/r2 | low |  |
| hsaputra@alamisharia.co.id | Hendra Saputra | c2/a0/r2 | low |  |
| flestari@alamisharia.co.id | Fika Siwi Lestari | c2/a0/r2 | low |  |
| rhidayat@alamisharia.co.id | Rio Husnady Hidayat | c2/a0/r2 | low |  |
| dsarachika@hijra.id | Desnanti Sarachika | c2/a0/r2 | low |  |
| rsuherman@hijra.id | Rico Dani Suherman | c2/a0/r2 | low |  |
| aramadhan@alamisharia.co.id | Akbar Ramadhan | c2/a0/r2 | low |  |
| wrizky@alamisharia.co.id | Wahyu Rizky | c2/a0/r2 | low |  |
| azmaulia@alamisharia.co.id | Azzahra Maulia | c2/a0/r2 | low |  |
| aatmaja@alamisharia.co.id | Arta Kusuma | c2/a0/r2 | low |  |
| asari@alamisharia.co.id | Astarina Natya Sari | c2/a0/r2 | low |  |
| fzuhri@alamisharia.co.id | Faishal Nuruz | c2/a0/r2 | low |  |
| mjunizar@alamisharia.co.id | Muhammad Luky Junizar | c2/a0/r2 | low |  |
| tpamungkas@alamisharia.co.id | Topan Adi Pamungkas | c2/a0/r2 | low |  |
| ebitrava@alamisharia.co.id | Egtheasavianca B. | c2/a0/r2 | low |  |
| awicaksono@alamisharia.co.id | Ardanu Wicaksono | c2/a0/r2 | low |  |
| malzikri@alamisharia.co.id | Muhammad Zaki Alzikri | c2/a0/r2 | low |  |
| rrezki@alamisharia.co.id | Rangga Rezki | c2/a0/r2 | low |  |
| akhasanah@alamisharia.co.id | Amin Tatik Uswatun Khasanah | c2/a0/r2 | low |  |
| rwahyuni@alamisharia.co.id | Risanti Wahyuni | c2/a0/r2 | low |  |
| pnuramini@alamisharia.co.id | Pratiwi Nur Amini | c2/a0/r2 | low |  |
| szafira@alamisharia.co.id | Sefrina Zafira Riski | c2/a0/r2 | low |  |
| dpamudji@hijra.id | Deddy Pamudji | c2/a0/r2 | low |  |
| mrizki@alamisharia.co.id | Muhamad Septian Rizki | c2/a0/r2 | low |  |
| qfadlan@alamisharia.co.id | Q Fadlan | c2/a0/r2 | low |  |
| tputri@alamisharia.co.id | Tita Aulia Edi Putri | c2/a0/r2 | low |  |
| dpramudya@alamisharia.co.id | Dhimas Bagus Pramudya | c1/a0/r1 | low |  |
| azfauzi@alamisharia.co.id | Azhar Ali Fauzi | c1/a0/r1 | low |  |
| mwidzamil@alamisharia.co.id | Muhamad Hudan Widzamil | c1/a0/r1 | low |  |
| **(no email)** | Yudiz Patria | c1/a0/r1 | low |  |
| cdhewana@alamisharia.co.id | Cakti Dhewana | c1/a0/r1 | low |  |
| apajar@hijra.id | Afif Pajar | c1/a0/r1 | low |  |
| ssofyaningrat@alamisharia.co.id | Siti Sarah Sofyaningrat | c1/a0/r1 | low |  |
| **(no email)** | Ya'suf Dany | c1/a0/r1 | low |  |
| radenwijaya@hijra.id | Raden Agung Wijaya | c1/a0/r1 | low |  |
| ahakim@hijra.id | Abdul Hakim | c1/a0/r1 | low |  |
| spurnomo@alamisharia.co.id | Siddik Purnomo | c1/a0/r1 | low |  |
| **(no email)** | maidzola | c1/a0/r1 | low |  |
| dpermatasari@alamisharia.co.id | Diah Permatasari | c1/a0/r1 | low |  |
| hhakim@alamisharia.co.id | Hafidh Izzudin Hakim | c1/a0/r1 | low |  |
| asucinugraha@hijra.id | Anggara Suci Nugraha | c1/a0/r1 | low |  |
| rsetiawan@alamisharia.co.id | Rully Setiawan | c1/a0/r1 | low |  |
| slatief@alamisharia.co.id | Shabrina Adzhani Awanis Latief | c1/a0/r1 | low |  |
| hramdani@alamisharia.co.id | Husni Ramdani | c1/a0/r1 | low |  |
| amushoffa@alamisharia.co.id | Ahmad Ridwan Mushoffa | c1/a0/r1 | low |  |
| sshaztika@alamisharia.co.id | Sarah Shanaz S | c1/a0/r1 | low |  |
| gsharfina@alamisharia.co.id | Giska Adilah | c1/a0/r1 | low |  |
| hsakila@alamisharia.co.id | Hesti Muslimatun Sakila | c1/a0/r1 | low |  |
| **(no email)** | Arief Luthfi Aulia | c1/a0/r1 | low |  |
| hkhadiki@hijra.id | Hasan Khadiki | c1/a0/r1 | low |  |
| fikbar@alamisharia.co.id | fikbar | c1/a0/r1 | low |  |
| csetiawan@hijra.id | wahyu setiawan | c1/a0/r1 | low |  |
| zulkarnaen@alamisharia.co.id | Zulkarnaen Zulkarnaen | c1/a0/r1 | low |  |
| ikhozani@alamisharia.co.id | Islahul Khozani | c1/a0/r1 | low |  |
| fmutia@alamisharia.co.id | Fara Mutia | c1/a0/r1 | low |  |
| csiregar@alamisharia.co.id | Heru Siregar | c1/a0/r1 | low |  |
| budiyono@hijra.id | Budiyono | c1/a0/r1 | low |  |
| kanwar@hijra.id | Khairil Anwar | c1/a0/r1 | low |  |
| dmaulana@hijra.id | Dendra Ichsan Maulana | c1/a0/r1 | low |  |
| sukmayanti@alamisharia.co.id | Sukmayanti | c1/a0/r1 | low |  |
| msiregar@alamisharia.co.id | Muhammad Hafiz Siregar | c1/a0/r1 | low |  |
| aharmalatari@alamisharia.co.id | Alika Harmalatari Pratadi | c1/a0/r1 | low |  |
| mnabhany@alamisharia.co.id | Hilmy An Nabhany | c1/a0/r1 | low |  |
| snurhabibah@alamisharia.co.id | Syahnya Alifia Nurhabibah | c1/a0/r1 | low |  |
| mumar@alamisharia.co.id | Umar Abdul Aziz | c1/a0/r1 | low |  |
| rsetiaputra@hijra.id | Risyad Tri Setiaputra | c1/a0/r1 | low |  |
| ycitrawati@hijra.id | Yuni Citrawati | c1/a0/r1 | low |  |
| npraisal@alamisharia.co.id | nanda praisal | c1/a0/r1 | low |  |
| rhamonangan@hijra.id | Reza Adha Hamonangan | c1/a0/r1 | low |  |
| ffauziyah@alamisharia.co.id | Ferawati Syarif Fauziyah | c1/a0/r1 | low |  |
| **(no email)** | Shabrina | c1/a0/r1 | low |  |
| **(no email)** | aalbaab | c1/a0/r1 | low |  |
| nirawan@hijra.id | Nicky Irawan | c1/a0/r1 | low |  |
| tjafar@hijra.id | Taqiyuddin Ja'far | c0/a1/r0 | low | ✅ |

**Email flags (decisions needed):**

- **6 accounts expose no email** — cannot resolve as assignee, cannot invite. All are low-activity (1 created issue each), so impact is small: Yudiz Patria, Ya'suf Dany, maidzola (`601fe1cf…`), Arief Luthfi Aulia, Shabrina, aalbaab. Leave assignees empty + migration prefix.
- **Same person, two domains/accounts** (Alami `@alamisharia.co.id` vs Hijra `@hijra.id`):
  - Danny Dwi Cahyono → `dcahyono@alamisharia.co.id` **and** `dcahyono@hijra.id` (the API-key owner). Same alias situation as DEPLOY — Alami account should resolve to the Hijra Plane member.
  - Q Fadlan → `qfadlan@alamisharia.co.id` **and** `qfadlan@hijra.id`.
  - maidzola → `maidzola@hijra.id` (Plane member) **and** a no-email duplicate.
  - Decision: add alias entries in `config/users.yaml` so the Alami-domain account maps to the existing Hijra Plane member.
- **Domain split:** 136 Alami-account uses vs 75 Hijra-account uses. AR is an Alami-org-heavy project like DEPLOY.

## Plane target (project-specific)

Workspace-wide Plane state lives in [`config/_plane.md`](../config/_plane.md). Below is only what's specific to `AR`.

- **Target project: does NOT exist yet in Plane → create new.** No identifier `AR` present (note: `ARH` = "Anyur Request" is a *different* project; `AR` is distinct and available).
- **Proposed Plane project identifier:** `AR` (2 chars, unique, free).
- **Proposed project name:** `Access Request`.
- **Proposed state seed:** the 5 states in the Statuses table above (To Do / In Progress / In Review / Done / On Hold/Cancelled). Reuse the `In Review` (group `started`) custom state pattern from II for `Need Review`.
- **Assignee overlap with current Plane members:** 10 of the 11 current members are already AR users (all but external `lukman@cnrg-labs.id`). So 10 assignees resolve immediately on day one; the rest wait for Stage 3.
- **Stage 1 invitation list:** **201 distinct emails** not yet Plane members (134 Alami + 67 Hijra). Of these, **79 already exist in `config/users.yaml`** (carried over from DEPLOY/others) and **122 are new**. Full list below.

### Stage 1 invitation list (201 emails — not yet Plane members)

```
aabdullah@alamisharia.co.id
aafinas@alamisharia.co.id
aatmaja@alamisharia.co.id
aazis@alamisharia.co.id
aaziz@hijra.id
abaidowi@hijra.id
adewa@alamisharia.co.id
admin@alamisharia.co.id
adzutama@alamisharia.co.id
afariza@hijra.id
afirmansyah@hijra.id
agutama@alamisharia.co.id
ahakim@hijra.id
aharmalatari@alamisharia.co.id
aharyanto@alamisharia.co.id
akautsar@alamisharia.co.id
akhasanah@alamisharia.co.id
akoraji@alamisharia.co.id
amahardi@alamisharia.co.id
amuntasir@alamisharia.co.id
amushoffa@alamisharia.co.id
anasruddin@alamisharia.co.id
andputra@alamisharia.co.id
apajar@hijra.id
apradana@hijra.id
aprasetyo@alamisharia.co.id
aprimarizki@alamisharia.co.id
aramadhan@alamisharia.co.id
arhakim@hijra.id
aroziqin@alamisharia.co.id
asaifullah@hijra.id
asari@alamisharia.co.id
asetyo@alamisharia.co.id
asucinugraha@hijra.id
asurbakti@alamisharia.co.id
asyafii@alamisharia.co.id
aumam@hijra.id
awicaksono@alamisharia.co.id
ayohana@alamisharia.co.id
ayudhistira@alamisharia.co.id
ayulizar@hijra.id
azain@alamisharia.co.id
azfauzi@alamisharia.co.id
azmaulia@alamisharia.co.id
brianto@alamisharia.co.id
bsuandi@alamisharia.co.id
budiyono@hijra.id
bwiantoro@alamisharia.co.id
cdhewana@alamisharia.co.id
csetiawan@hijra.id
csiregar@alamisharia.co.id
danuaw@alamisharia.co.id
dcahyono@alamisharia.co.id
ddzahaban@hijra.id
djaman@hijra.id
dmaulana@hijra.id
dpamudji@hijra.id
dpermatasari@alamisharia.co.id
dpramudya@alamisharia.co.id
dramadhan@hijra.id
dsarachika@hijra.id
dsulistyono@alamisharia.co.id
dwibisana@hijra.id
dwicaksono@hijra.id
dzubaidi@hijra.id
ebitrava@alamisharia.co.id
eoktaviani@alamisharia.co.id
ewibowo@alamisharia.co.id
farrahman@alamisharia.co.id
fbelladina@hijra.id
ffauziyah@alamisharia.co.id
fgautama@alamisharia.co.id
fhanifah@alamisharia.co.id
fikbar@alamisharia.co.id
flestari@alamisharia.co.id
fmaulana@alamisharia.co.id
fmuchtar@hijra.id
fmurpratomo@alamisharia.co.id
fmutia@alamisharia.co.id
fnurul@hijra.id
fraihan@hijra.id
framdhani@alamisharia.co.id
fsandi@alamisharia.co.id
fsaputra@hijra.id
ftamara@alamisharia.co.id
fzuhri@alamisharia.co.id
gprasetyoadi@hijra.id
gsharfina@alamisharia.co.id
gunturvirgenius@hijra.id
hhakim@alamisharia.co.id
hkhadiki@hijra.id
hnupus@hijra.id
hpranoto@alamisharia.co.id
hramdani@alamisharia.co.id
hsakila@alamisharia.co.id
hsaputra@alamisharia.co.id
hyasrizal@alamisharia.co.id
ialawi@alamisharia.co.id
ijond@alamisharia.co.id
ikhozani@alamisharia.co.id
jardita@alamisharia.co.id
jputra@hijra.id
kanwar@hijra.id
kdongoran@alamisharia.co.id
koktaviari@hijra.id
ksuryani@alamisharia.co.id
lnurrohman@hijra.id
ltriyadi@alamisharia.co.id
mabdullah@hijra.id
madli@hijra.id
malfatah@alamisharia.co.id
malzikri@alamisharia.co.id
mdihsan@alamisharia.co.id
mfathurohman@hijra.id
mfirdausi@alamisharia.co.id
mihidayat@alamisharia.co.id
mjunizar@alamisharia.co.id
mlutfi@alamisharia.co.id
mmalik@alamisharia.co.id
mmaromi@alamisharia.co.id
mnabhany@alamisharia.co.id
mnurfaqih@alamisharia.co.id
mohnazda@hijra.id
moktareza@alamisharia.co.id
mrahim@alamisharia.co.id
mridha@alamisharia.co.id
mrizki@alamisharia.co.id
mromdony@alamisharia.co.id
msabdono@alamisharia.co.id
msiregar@alamisharia.co.id
mtadarus@hijra.id
mtazkia@alamisharia.co.id
muhakbar@hijra.id
muhputra@alamisharia.co.id
mumar@alamisharia.co.id
mwidahta@alamisharia.co.id
mwidzamil@alamisharia.co.id
myanuar@alamisharia.co.id
nalhumaira@hijra.id
namar@alamisharia.co.id
ndinda@hijra.id
nirawan@hijra.id
niskandar@alamisharia.co.id
nlatifah@hijra.id
nnurhamdani@alamisharia.co.id
npraisal@alamisharia.co.id
nrabbani@hijra.id
nufaira@alamisharia.co.id
nurdiansyah@alamisharia.co.id
nwibowo@alamisharia.co.id
phanum@alamisharia.co.id
pnuramini@alamisharia.co.id
qfadlan@alamisharia.co.id
qfadlan@hijra.id
radenwijaya@hijra.id
ranisa@hijra.id
rgunawan@alamisharia.co.id
rhabibie@hijra.id
rhamonangan@hijra.id
rhidayat@alamisharia.co.id
rikadakbar@hijra.id
rliskiyari@hijra.id
rmetafiliana@alamisharia.co.id
rmunandar@alamisharia.co.id
rospamungkas@hijra.id
rpriastomo@alamisharia.co.id
rramdhanisti@hijra.id
rrezki@alamisharia.co.id
rsetiandy@alamisharia.co.id
rsetiaputra@hijra.id
rsetiawan@alamisharia.co.id
rsuherman@hijra.id
rsulistyo@hijra.id
rteharudin@alamisharia.co.id
rwahyuni@alamisharia.co.id
rwinata@hijra.id
rwiradiputra@alamisharia.co.id
slatief@alamisharia.co.id
snurhabibah@alamisharia.co.id
spurnomo@alamisharia.co.id
ssetiawati@hijra.id
sshaztika@alamisharia.co.id
ssofyaningrat@alamisharia.co.id
sukmayanti@alamisharia.co.id
sumarghanis@hijra.id
swisnugroho@alamisharia.co.id
szafira@alamisharia.co.id
tjiwandana@alamisharia.co.id
tpamungkas@alamisharia.co.id
tputri@alamisharia.co.id
tsetyawan@hijra.id
twakil@alamisharia.co.id
tyuswoyo@alamisharia.co.id
vhentyadi@alamisharia.co.id
vhermawan@hijra.id
wardana@hijra.id
wfridayoka@hijra.id
wprasetya@alamisharia.co.id
wrizky@alamisharia.co.id
ycitrawati@hijra.id
zulkarnaen@alamisharia.co.id
```

## Decisions needed

Resolved 2026-05-20 (user). Ready for `/migrate-configure AR`:

- [x] **Status mapping** — Done→completed, On Hold/Cancelled→cancelled, To Do→unstarted, In Progress→started, Need Review→**In Review** (started).
- [x] **State seed** — seed **only the 5 used** states (To Do, In Progress, In Review, Done, On Hold/Cancelled). No `Backlog`.
- [x] **Priority** — `Medium → medium`.
- [x] **Custom fields** — `Development` **drop**, `Rank` **drop**, `Issue color` **drop**, `Date` (10393) **drop**. No custom fields migrated.
- [x] **Labels** — keep all **5 verbatim** (IAM, Product, support, FOS, Other).
- [x] **No-email users** — leave assignee empty + migration prefix for the 6 emailless accounts.
- [x] **Alias mapping** — alias the 3 Alami↔Hijra twins to their existing Hijra Plane member: `dcahyono@alamisharia.co.id`→`dcahyono@hijra.id`, `qfadlan@alamisharia.co.id`→`qfadlan@hijra.id`, maidzola no-email dup→`maidzola@hijra.id`. Everyone else resolves by exact Jira email.
- [x] **Epics** — migrate the **3 epics as modules**.
- [x] **Sprints** — none; nothing to do.
- [x] **Identifier** — new Plane project identifier **`AR`**, name `Access Request`.
- [x] **Exclusions** — **migrate all 1523** (full history, no date cap).

## STOP

Discovery only. No config files written. Next: review/annotate above, then `/migrate-configure AR`.
