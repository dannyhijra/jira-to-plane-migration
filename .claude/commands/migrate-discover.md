---
description: Inventory a Jira project and current Plane state to seed migration config
argument-hint: <JIRA_PROJECT_KEY>
---

Phase 1 of the Jira → Plane migration: discovery.

Read `.claude/skills/migration-discovery/SKILL.md` for the full procedure before doing anything.

Target project: **$ARGUMENTS**

Goal: produce a complete `discovery/$ARGUMENTS.md` file capturing everything we need to decide mappings, then STOP for human review.

## Steps

1. Verify both MCPs are available (`atlassian` and `plane`).
2. Via the Atlassian MCP, inventory Jira project `$ARGUMENTS` per the discovery skill: issue types, statuses, priorities, labels, custom fields, sprints, epics, users.
3. Via the Plane MCP, inventory current Plane workspace state: existing projects, workspace members (user_id + email), state groups, priorities.
4. Write `discovery/$ARGUMENTS.md` following the format in the discovery skill, including a `## Decisions needed` checklist at the bottom.

## STOP after writing

Do NOT modify any config files. The user needs to annotate the discovery doc with decisions (which custom fields to migrate, status mappings, etc.). Once they confirm the doc looks complete, the next step is `/migrate-configure $ARGUMENTS`.
