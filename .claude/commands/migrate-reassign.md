---
description: Stage 3 — reassign work items to users who have now joined Plane
argument-hint: <JIRA_PROJECT_KEY>
---

Stage 3 of the three-stage user flow: reassignment for users who have accepted invitations since the migration ran.

Target project: **$ARGUMENTS**

Read `.claude/skills/migration-user-strategy/SKILL.md` for context on what this does and why.

## How it works (recap)

Each work item migrated in Stage 2 has a "migration prefix" in its description capturing the original Jira creator and assignee emails. This command:
1. Fetches the project's work items from Plane
2. Pulls the current workspace members list
3. For each work item with an unparsed prefix, looks up the assignee email in current members
4. If the email is now a workspace member → sets the `assignees` field
5. Optionally removes the prefix line (default: keep it for audit; configurable)

Safe to re-run anytime. Only items with prefixes still pointing at non-members get touched.

## Steps

1. If `src/migrators/reassign.ts` and a `reassign` CLI subcommand don't exist yet, implement them now (follow the implementing-migrators skill). This migrator is an **updater** rather than a creator — it `PATCH`es existing Plane work items.
2. **Dry run first:**
   ```
   bun run migrate reassign --jira-project $ARGUMENTS --dry-run
   ```
   Output should show: X work items found, Y can be reassigned now (emails match current members), Z still pending (emails don't match — invitations not yet accepted).
3. Ask the user to review. Proceed if Y > 0 and the resolved names look right.
4. **Real run:**
   ```
   bun run migrate reassign --jira-project $ARGUMENTS
   ```
5. Append manifest entries with `entity: "reassign"` for audit. Use the work item's plane_id as the key, with notes like `"resolved: alice@hijra.co.id → <user_id>"`.
6. Report: reassigned, still-pending, failed.

## Suggested cadence

- Run this weekly during the onboarding rollout window
- Each run picks up users who've signed up since the last run
- Eventually all prefixes resolve (or the remaining ones are users who never joined — those stay as historical records)
