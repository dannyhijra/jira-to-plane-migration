# Deferred migration work

Outstanding entities deliberately skipped during a project's migration. Each row is a piece of work that must be resumed before the project can be considered fully migrated.

Add an entry whenever `migrate_entities` in `config/projects.yaml` is set narrower than what the project actually contains. Remove the entry once the deferred entity has been migrated and verified.

| Project | Entity      | Scope                                | Deferred on  | Reason                                         | How to resume |
| ------- | ----------- | ------------------------------------ | ------------ | ---------------------------------------------- | ------------- |
| HDR     | attachments | 37 of 54 issues carry attachments    | 2026-05-18   | Explicit user instruction during /migrate-pilot | (1) Add `attachments` to `config/projects.yaml` HDR `migrate_entities`. (2) `bun run migrate run --jira-project HDR --only attachments --resume`. (3) Re-run `scripts/verify-hdr-sample.ts` — INFO findings on attachment-bearing items should flip to PASS. |
