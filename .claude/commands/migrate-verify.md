---
description: Random-sample verification of migrated items, diffing both sides via MCPs
argument-hint: <JIRA_PROJECT_KEY> [--sample N]
---

Phase 6: verification via random sampling.

Arguments: **$ARGUMENTS** (`<PROJECT>` + optional `--sample N`; default N=10)

Read `.claude/skills/migration-verification/SKILL.md` for the diff rules and reporting format.

## Steps

1. Parse args. Project key required; sample size optional (default 10).
2. Read `state/manifest.jsonl`. Filter to entries where:
   - `project === <PROJECT>`
   - `status === "ok"`
   - `entity === "work_item"` (extend to other entities if user asks)
3. Pick N random entries. Capture both `jira_key` and `plane_id` for each.
4. For each pair (do these in parallel where possible):
   - Fetch the Jira issue via Atlassian MCP (include `expand=renderedFields`)
   - Fetch the Plane work item via Plane MCP
   - Compare per the verification skill's diff rules
5. Produce a report file at `verification/<PROJECT>-<ISO_TIMESTAMP>.md` with:
   - Summary line: `Sample: N | Passed: M | Failed: K`
   - Per-item findings (one section each)
   - Pattern analysis if there are failures (group root causes)
   - Suggested fixes for systematic failures
6. Print the summary line to the user inline. If there are failures, also print the pattern analysis.
7. Suggest follow-ups:
   - Clean → no action needed
   - Failures → fix the root cause (usually a missing mapping), re-run `/migrate-scale <PROJECT> <entity> --resume` for affected items, then re-verify

## What NOT to flag

- "Created by" showing migration bot (Hijra Eng) — expected, captured in description prefix
- Comment author showing migration bot — same
- Historical timestamps not preserved on Plane side — same
- Internal Jira URLs in description (will still point at Jira) — acceptable for now; flag only if the user has indicated they want them rewritten

## Audit trail

The `verification/*.md` reports stay in the repo (not gitignored) — they're part of the audit record showing the migration was verified. Commit them.
