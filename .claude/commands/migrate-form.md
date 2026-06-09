---
description: Convert a Jira (ProForma) form (given as screenshots) into an importable n8n workflow that creates a Plane work item on submit
argument-hint: <JIRA_PROJECT_KEY> <screenshots_dir>
---

Convert a Jira intake form into an importable n8n workflow JSON (Form Trigger → Code → HTTP create in Plane → completion screen).

Read `.claude/skills/migration-form-to-n8n/SKILL.md` for the full procedure before doing anything.

Arguments: **$ARGUMENTS**
- `$1` = Jira project key (e.g. `HLRS`) — used to resolve the target Plane project by `identifier`.
- `$2` = path to a folder of form screenshots (capture every field; expand truncated dropdowns). The form is NOT API-readable, so these screenshots are the source of truth — see skill.

## Steps

1. Resolve target Plane project: Plane MCP `list_projects`, match `$1` to a project `identifier`, capture its UUID. `get_project_members` → build the `MEMBER_MAP` for any user-picker field.
2. Read every image in `$2` (vision). Extract per field: exact label, type, required `*`, help text, all dropdown options. Keep original language verbatim — do NOT translate.
3. **STOP for confirmation.** Output a field inventory table (each Jira field → proposed n8n `fieldType`) + the Plane payload mapping + the standard decisions (title format; user-picker → assignee vs capture-only; link fields text/textarea; choice → description vs label). Do NOT generate JSON yet.
4. On confirmation: write the spec to `n8n/specs/<slug>.json` (decode `&amp;`→`&`), run `python3 n8n/build_form_workflow.py n8n/specs/<slug>.json`, validate (`jq -e`). For several forms at once, fan out the screenshot-reading across parallel agents (a Workflow), then build each spec deterministically.
5. Report the output path `n8n/<slug>.workflow.json`, the placeholders to fill (`YOUR_PLANE_BASE`, `PLANE_TARGET_PROJECT_ID`, `YOUR_PLANE_API_KEY`), and the member-snapshot caveat.

## Never

- Generate the JSON before the user confirms the field mapping.
- Translate form labels/options, or set `created_by` in the Plane payload.
- Auto-resolve emails → assignee UUIDs beyond the `MEMBER_MAP` built from live Plane members.
