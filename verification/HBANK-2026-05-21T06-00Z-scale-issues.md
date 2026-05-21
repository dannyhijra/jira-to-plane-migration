# Verification: HBANK — 2026-05-21T06:00Z (issues scale)

Plane project: `bae8b0e4-e780-4158-8cbf-de155e85b4da`.
Scale run: migrated=985 (this run) + 5 (pilot) = **990 ok, 0 failed**. `linkSubtaskParents: linked=100 failed=0`.
Verified via X-API-Key REST (Plane MCP `/issues/` endpoints 404 on this self-hosted build).

## Count parity ✅
- Jira current total (`project = HBANK`): **990**
- Manifest `work_item` ok (unique keys): **990** (0 duplicates)
- Plane issues listed: **990**

(Discovery captured 967 on 2026-05-20; project grew to 990 since — new tickets incl. migration-tracking HBANK-983..990. All current issues migrated.)

## Field-level checks ✅
- **State-group distribution**: unstarted 183 / started 243 / completed 564 — mapping applied (not collapsed to unstarted). Consistent with Jira (Done≈564 completed, To Do≈183 unstarted, 5 in-progress statuses≈243 started).
- **Sub-task parenting**: exactly **100** Plane items have `parent` set = the 100 Jira sub-tasks. Spot-check HBANK-752 "[BE] Create API Get List Tier" (`type:subtask`) → parent = HBANK-746's plane_id ✓ EXACT MATCH.
- **Epics as work items**: HBANK-932 "[PRODPlatform] eKYC API Migration…" exists as a work item with label `type:epic`, no parent (top-level) ✓ — `epics_as_work_items` confirmed.
- **Labels**: **990/990** items carry ≥1 label (every item gets a `type:*` label minimum; squad:/eng: + native where applicable).

## INFO (expected, not failures)
- Assignees migrated empty (brand-new project; only API owner is a member). Original creator/assignee emails captured in description prefix. Resolves via `/migrate-reassign` once members join the project — same situation as IHH/AR/INFRA.

## Result
No failures. Issues entity is **complete and verified** for HBANK.

## Next entities (dependency order)
1. `comments` (684 across 274 issues) — looks up work_item plane_id from manifest (now present for all 990).
2. `epics` entity — creates the 48 **modules** + assigns the 700 children (the epic *work items* already exist from this run; the module groupings do not yet).
3. `attachments` (819 files / 205 issues) — watch the Cloudflare cookie (`PLANE_COOKIE_HEADER`); expect some placeholders.
4. `links` — Relates→relates, Blocks→blocked_by/blocking; Polaris + migration_parent dropped.
