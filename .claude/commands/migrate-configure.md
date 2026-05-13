---
description: Translate a discovery doc into config/*.yaml files (propose diffs, wait for approval)
argument-hint: <JIRA_PROJECT_KEY>
---

Phase 2 of the migration: fill in config files based on the discovery doc.

Target project: **$ARGUMENTS**

## Steps

1. Read `discovery/$ARGUMENTS.md`. If it doesn't exist or the `## Decisions needed` checklist is empty/unchecked, STOP and tell the user to run `/migrate-discover $ARGUMENTS` first (and annotate decisions).
2. Read the current `config/projects.yaml`, `config/users.yaml`, `config/mappings.yaml`. If they don't exist, read the `.example` versions.
3. For each of the three config files, produce a proposed diff that adds entries for `$ARGUMENTS`:
   - **`config/projects.yaml`**: one project entry with `plane_project_name`, `plane_project_identifier`, `create_if_missing: true`, and `migrate_entities` list.
   - **`config/users.yaml`**: one entry per discovered user. Shape: `<accountId>: {email, displayName, role}`. No `plane_user_id` — we resolve via email lookup at runtime. Default role is `member`.
   - **`config/mappings.yaml`**: status, priority, labels, custom_fields mappings following the user's annotations in the discovery doc.
4. **STOP and present the diffs.** Do NOT write the files. Ask the user to approve each diff explicitly ("yes apply" / "no change X").
5. After explicit per-file approval, apply the approved diffs.
6. Suggest the next step:
   - If `state/manifest.jsonl` has no `entity: "invitation"` entries yet → `/migrate-invite-members`
   - Otherwise → `/migrate-implement issues`

## Hard rules

- Never make decisions on the user's behalf for status, priority, or custom field mappings — those are judgment calls captured in the discovery doc.
- Never write any of the three config files without explicit approval, even partial.
