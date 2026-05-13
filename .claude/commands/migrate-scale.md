---
description: Full migration for one entity in one project (no limit, with --resume)
argument-hint: <JIRA_PROJECT_KEY> <entity>
---

Phase 7: full migration run for one entity in one project.

Arguments: **$ARGUMENTS** (expected as `<PROJECT> <entity>`)

## Pre-flight checklist — verify before running

- The pilot for this entity has been run and verified (`/migrate-pilot <PROJECT> <entity>` succeeded)
- `state/manifest.jsonl` contains successful pilot entries for this project + entity
- The user is ready for the full run (this writes to Plane at scale; if rolled back, it's manual)

If the entity isn't specified, **ask** — don't assume "all entities."

## Steps

1. Show the user the planned command:
   ```
   bun run migrate run --jira-project <PROJECT> --only <entity> --resume
   ```
   Explain: `--resume` makes it idempotent (skips items already in the manifest), so it's safe to re-run if it fails partway.
2. Ask for explicit confirmation ("yes, run it"). Wait.
3. Run the command. The output may scroll a lot — that's fine.
4. After completion, report from `state/manifest.jsonl`:
   - Total successful for this project + entity (count of `status: "ok"` entries since pilot)
   - Failed count
   - Top 3 error messages grouped by `error` field (most common failures)
5. If failures exist:
   - Categorize them (auth, validation, missing mapping, API quirk)
   - Suggest fixes (often: add a user to `config/users.yaml` or a label rename in `config/mappings.yaml`)
   - The user re-runs `/migrate-scale <PROJECT> <entity>` after fixing — `--resume` skips the already-ok items
6. Once clean (or acceptable losses noted), suggest:
   - `/migrate-verify <PROJECT> --sample 20` for a random spot check
   - Move to the next entity in the dependency order: issues → comments → sprints → epics → attachments → links

## Reminders

- This command modifies Plane state. Always commit `state/manifest.jsonl` is gitignored, but consider backing it up before running large entities like attachments.
- For attachments: expect partial failures (5–15% is normal). Re-run with `--resume` and most will resolve.
