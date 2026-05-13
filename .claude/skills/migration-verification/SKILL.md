---
name: migration-verification
description: Procedure for verifying a Jira-to-Plane migration by diffing both sides via MCPs. Covers what fields to compare, what tolerances are acceptable, what differences are expected and should NOT be flagged, and the format of the verification report. Use when running /migrate-verify, when investigating a specific reported discrepancy, or any time you need to spot-check migrated items.
---

# Migration verification

After migration, verify that what's in Plane faithfully represents what was in Jira. This skill is the exact diff procedure.

## When to run verification

- After every `/migrate-pilot` run (5-item check, inline summary)
- After every `/migrate-scale` run (random sample via `/migrate-verify`)
- When investigating a specific reported discrepancy ("ENG-123 looks wrong")

## What to compare for a work_item pair

| Field          | Comparison rule |
|----------------|-----------------|
| Title          | Exact string match |
| Description    | Strip the migration prefix block from the Plane side (first `>` blockquote line + the blank line after it), then text-match. Some markdown rendering may differ — focus on textual content, not whitespace. |
| State group    | Mapped Jira `status` → Plane `state_group`. Must match `config/mappings.yaml` `status` rules. |
| Priority       | Mapped per `config/mappings.yaml` `priority` rules. |
| Labels         | Set equality (order-independent). Apply `config/mappings.yaml` `labels` renames first. |
| Assignees      | If Jira assignee email is in current Plane members → must be in Plane assignees. Otherwise → Plane assignees must be empty AND the email must appear in the description prefix. |
| Custom fields  | Per `config/mappings.yaml` `custom_fields` actions: `drop` → not present on Plane; `description` → text appended to description (after the prefix); `property:<name>` → matches the named Plane custom property. |
| Attachments    | Count match. Don't byte-diff files. |
| Comments       | Count match. Spot-check 1 comment's body for prefix presence. |

For a sprint / cycle pair:
- Name match
- Date range match (start_date, end_date)
- Member work item count match

For an epic / module pair:
- Name match
- Description match (with prefix stripped)
- Member work item count match

## How to diff via MCPs

1. **Fetch Jira side**: Atlassian MCP, `getJiraIssue` with `expand=renderedFields` (to get description in HTML/markdown). Don't include `changelog` unless you need history.
2. **Fetch Plane side**: Plane MCP's get-work-item tool with the `plane_id` from the manifest.
3. **Batch the fetches** — collect all `(jira_key, plane_id)` pairs first, then fetch all sides, then compare. Avoids interleaving MCP calls awkwardly.
4. **Compare per the rules above.**

## Differences that are EXPECTED — do NOT flag these

These are not failures; they're consequences of Plane API constraints, captured in the prefix:

- "Created by" on Plane shows the migration bot, not the original Jira creator. The real creator is in the description prefix.
- Comment authors on Plane show the migration bot. Original authors are in the comment prefix.
- `created_at` and `updated_at` on Plane reflect the migration time, not the original Jira dates. Original date is in the description prefix.
- Internal Jira URLs in the description still point at Jira (`alamisharia.atlassian.net/...`). Acceptable for now unless the user has explicitly asked for URL rewriting.
- Jira's `customfield_XXXXX` references aren't preserved on Plane unless explicitly mapped via `config/mappings.yaml`.

## Differences that ARE failures — flag these

- Title mismatch (anything but exact)
- State group not matching the configured mapping
- Priority not matching the configured mapping
- Labels missing or extra (after applying renames)
- Assignee resolvable in current members but not set on Plane (means reassign hasn't run or the migrator has a bug)
- Assignee empty AND email not in description prefix (means the prefix logic broke)
- Custom field configured as `property:<name>` but not present on Plane
- Attachment count mismatch
- Comment count mismatch

## Report format

Always write a file to `verification/<PROJECT>-<ISO_TIMESTAMP>.md` even when everything passes — these reports are the audit record. They are NOT gitignored; commit them.

```markdown
# Verification: <PROJECT> — <ISO_TIMESTAMP>

Sample size: N
Passed: M
Failed: K

## Per-item findings

### ENG-123 → <plane_id> · ✅ PASS

(no findings)

### ENG-456 → <plane_id> · ❌ FAIL

- Priority: expected `high`, got `medium`
- Labels: missing `tech-debt` on Plane side

### ENG-789 → <plane_id> · ⚠️ INFO

- Assignee empty on Plane (bob@hijra.co.id not yet a workspace member) — email present in description prefix, will resolve on next /migrate-reassign

## Pattern analysis

Of K=2 failures:
- 1 unique: ENG-456 priority — looks like Jira value `Major` is not in `config/mappings.yaml` priority section
- 1 unique: ENG-456 labels — `tech-debt` label needs a rename rule

## Suggested fixes

1. Add `Major: medium` to `config/mappings.yaml` `priority` section
2. Add `tech-debt: technical-debt` to `config/mappings.yaml` `labels` section
3. Re-run: `/migrate-scale <PROJECT> issues` (will skip already-ok items; affected items will need manual deletion + manifest line removal first)
```

## How to handle systematic failures

If multiple items fail for the same reason, that's a config/code bug, not data noise:

1. Identify the root cause (the pattern analysis section)
2. Fix it (usually a one-line change in `config/mappings.yaml` or a mapper)
3. For already-migrated items: manually delete them in the Plane UI, remove their manifest lines, then re-run `/migrate-scale --resume`
4. Verify again

If failures are scattered with no pattern, they're likely data quality issues in Jira (unusual fields, weird states). Note them in the report and decide per-item.

## What to print inline to the user

After writing the file, print a short summary inline:

```
Verification complete: 18/20 passed, 2 failed.
Report: verification/ENG-2026-05-12T...md

Pattern: both failures are priority mapping (Jira "Major" not in config/mappings.yaml).
Fix: add "Major: medium" to mappings, re-run /migrate-scale ENG issues.
```

Don't dump the full per-item findings inline — keep that in the file.
