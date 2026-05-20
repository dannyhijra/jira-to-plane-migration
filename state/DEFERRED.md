# Deferred migration work

Outstanding entities deliberately skipped during a project's migration. Each row is a piece of work that must be resumed before the project can be considered fully migrated.

Add an entry whenever `migrate_entities` in `config/projects.yaml` is set narrower than what the project actually contains. Remove the entry once the deferred entity has been migrated and verified.

| Project | Entity      | Scope                                | Deferred on  | Reason                                         | How to resume |
| ------- | ----------- | ------------------------------------ | ------------ | ---------------------------------------------- | ------------- |
| HDR     | attachments | 37 of 54 issues carry attachments    | 2026-05-18   | Explicit user instruction during /migrate-pilot | (1) Add `attachments` to `config/projects.yaml` HDR `migrate_entities`. (2) `bun run migrate run --jira-project HDR --only attachments --resume`. (3) Re-run `scripts/verify-hdr-sample.ts` — INFO findings on attachment-bearing items should flip to PASS. |
| DEPLOY  | attachments | 7 of 51 attachments (`.sql` on DEPLOY-159/161/162/194) | 2026-05-20 | Plane storage rejects `binary/octet-stream` `.sql` ("Invalid file type" 400). **Permanent — not retryable.** Stored as placeholders (filename + original Jira URL preserved); files remain in Jira. | Not resumable as-is. Only path: convert to a Plane-accepted type (e.g. wrap as `.txt`) — likely not worth it; SQL lives in Jira + GitHub release links already. |
| DEPLOY  | links       | 102 of 217 links (cross-project: AC/ECO/HTR/INFRA/II/HLS/Polaris targets) | 2026-05-20 | Plane relations are project-scoped — both items must exist in the same Plane project. Targets are issues from Jira projects not migrated into DEPLOY's Plane project. Recorded as `skipped` in the manifest with the target key. | Conditional: only if those projects are migrated into the same Plane workspace AND Plane supports cross-project relations (unverified). Otherwise accept as permanent. The 115 within-DEPLOY relations migrated fine. |
