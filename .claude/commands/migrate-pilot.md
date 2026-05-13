---
description: Run a small pilot of one entity for one project — dry-run, real run on 5, verify
argument-hint: <JIRA_PROJECT_KEY> <entity>
---

Phases 4–6 of the migration: pilot dry-run, real run on 5, verify.

Arguments: **$ARGUMENTS** (expected as `<PROJECT> <entity>`)

## Steps

1. Parse the project key and entity from `$ARGUMENTS`. If either is missing or ambiguous, ask the user before doing anything.
2. **Dry run first:**
   ```
   bun run migrate run --jira-project <PROJECT> --only <entity> --dry-run --limit 5
   ```
   Show the output. Call out: how many items found, what the mapped payloads look like (especially the description prefix on issues), any warnings, any users that fell back to empty assignee.
3. Ask the user if the dry-run output looks correct. If not, fix the code or config (config is more often the culprit) and re-run. The manifest is untouched on dry-runs — you can re-run freely.
4. **Real run on 5:**
   ```
   bun run migrate run --jira-project <PROJECT> --only <entity> --limit 5
   ```
5. **Verify via MCPs.** Read `.claude/skills/migration-verification/SKILL.md` for the diff procedure. For the 5 just-migrated items:
   - Pull each from Atlassian MCP using the jira_key
   - Pull each from Plane MCP using the plane_id from the manifest
   - Compare per the verification skill
   - Produce a brief findings summary inline (no need to write a file at pilot stage)
6. If issues found:
   - Cosmetic / acceptable → note and move on
   - Systematic (same issue across multiple items) → diagnose, fix the cause, manually delete those 5 items in Plane UI, remove their manifest lines, re-run
7. Suggest the next step: `/migrate-scale <PROJECT> <entity>` once the pilot looks right.

## Pitfalls to call out

- If the entity is `issues` and assignees are all empty on Plane, that's **expected** if no users have accepted invites yet — verify the emails are in the description prefix instead.
- If state groups all collapsed to `unstarted`, the status mapping in `config/mappings.yaml` is incomplete.
- If custom fields are missing on Plane, check `config/mappings.yaml` custom_fields section — fields with `drop` action are intentionally absent.
