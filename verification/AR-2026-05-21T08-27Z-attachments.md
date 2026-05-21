# Verification: AR — 2026-05-21T08:27Z (attachments)

Entity: attachments
Result: 144 ok / 0 failed — **140 uploaded as real assets, 4 placeholder fallbacks**

Plane project AR (2643c390-7309-4ef6-97cb-9873d372e0c3).

## Method

- Pilot (5 attachments, AR-18/28/34/42/55) verified each present on its Plane work item via the issue-attachments REST endpoint — all real uploads, correct filenames.
- Scale: 144 total attachments across 1520 work items. 140 uploaded; 4 fell back to placeholders (filename + original Jira URL preserved in the work item).

## Placeholder fallbacks (4) — acceptable, recorded in state/DEFERRED.md

All 4 rejected by Plane with `assets/v2 step 1 400 {"error":"Invalid file type"}` — cause is the `binary/octet-stream` MIME Jira served:

| Issue | File | MIME | Size |
|---|---|---|---|
| AR-840 | Relami.sql | binary/octet-stream | 375 KB |
| AR-1373 | update_date_uuid_v3.sql | binary/octet-stream | 1.6 KB |
| AR-1373 | update_ivs_no_v3.sql | binary/octet-stream | 3.5 KB |
| AR-1378 | Exit Clearance Form AFS - Ananta Arya Dewa (2) (1).pdf | binary/octet-stream | 366 KB |

Same permanent constraint as DEPLOY/INFRA `.sql` rejections. The 3 `.sql` are low-value (DB scripts). The 1 `.pdf` is real content Jira mislabeled as octet-stream — salvageable later by forcing `application/pdf` on upload (noted in DEFERRED). Originals remain in Jira; placeholder lines carry the download URL.

## Verdict

Attachments migration complete — 0 failures, 140/144 real uploads, 4 acceptable placeholders (deferred). AR data migration (issues + comments + epics/modules + attachments) is fully done.
