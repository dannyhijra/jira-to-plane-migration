# Verification: HBANK — 2026-05-21T08:45Z (data migration COMPLETE)

Plane project: `bae8b0e4-e780-4158-8cbf-de155e85b4da`. First **software** project migrated.

## Entity totals (manifest, status=ok)

| Entity | ok | Notes |
|--------|----|-------|
| work_item (issues) | **990** | incl. 48→49 epics as work items (`type:epic`); 100 sub-tasks parented |
| comment | **684** | author-attribution prefix verified |
| module (epics) | **49** | 722 child work items assigned (1:1 epic↔module) |
| attachment | **820** | 817 uploaded + 3 placeholders (413 too-large) |
| link (relations) | **102** | + 23 skipped (18 cross-project + 5 dropped Polaris/migration_parent); 0 failed |

0 failed across every entity.

## Verified
- **Count parity** (issues): Jira 990 = manifest 990 (unique) = Plane 990.
- **State mapping**: distributed unstarted 183 / started 243 / completed 564 (not collapsed).
- **Sub-task parenting**: exactly 100 items have `parent`; HBANK-752→HBANK-746 plane_id exact match.
- **Epic as work item**: HBANK-932 exists as work item, `type:epic`, no parent.
- **Labels**: 990/990 labeled — native + `type:*` + `squad:`/`eng:` confirmed (HBANK-1).
- **Comments**: prefix `> _Originally posted by \`<email>\` on <date>_` confirmed on HBANK-1/2/3; @mentions flattened to plain text (per ADF decision).
- **Links**: drop-list working (4 Polaris + 1 migration_parent recorded `dropped`); within-project relations created; cross-project skipped (project-scoped, expected).

## Deferred (see state/DEFERRED.md)
- **3 attachments** (HBANK-462/513/850) — HTTP 413 too-large; placeholders, files remain in Jira. Resumable if server body-size limit raised.
- **18 cross-project Relates links** — Plane relations are project-scoped; conditional on cross-project support.

## Expected / INFO (not failures)
- **Assignees empty** on all work items — brand-new project; only the API owner is a project member, so even existing workspace members don't resolve yet. Original creator/assignee emails captured in the description prefix. Resolves via **Stage 3 `/migrate-reassign HBANK`** as members join the project. (Same as INFRA/AR/IHH.)

## Result
HBANK **data migration COMPLETE**. Remaining work is people/workflow: Stage 1 invites (covered by prior org-wide batches) and Stage 3 `/migrate-reassign` runs as members join.
