import type { JiraClient, JiraIssue } from "../clients/jira";
import type { PlaneClient } from "../clients/plane";
import type { MigrationContext, MigrationResult } from "../state/types";
import { logger } from "../lib/logger";
import { append, hasMigrated } from "../state/manifest";
import { mapJiraStatusToPlaneState } from "../mappers/status";
import { mapJiraPriorityToPlanePriority } from "../mappers/priority";
import { mapJiraLabels } from "../mappers/labels";
import { buildPlaneMemberLookup, resolveJiraAssignee } from "../mappers/users";
import { buildDescription } from "../mappers/description";
import { customFieldAction, customFieldIds, type BuiltinField } from "../mappers/customFields";

export interface MigratorArgs {
  ctx: MigrationContext;
  jira: JiraClient;
  plane: PlaneClient;
  planeProjectId: string;
}

/** Jira built-in fields requested for every issue regardless of project. */
const BASE_ISSUE_FIELDS = [
  "summary",
  "description",
  "status",
  "issuetype",
  "priority",
  "labels",
  "assignee",
  "creator",
  "reporter",
  "created",
  "updated",
];

export async function migrateIssues(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  const projectCfg = ctx.config.projects[ctx.jiraProject];
  if (!projectCfg) {
    logger.error(`migrateIssues: no project config for ${ctx.jiraProject}`);
    return { ok: false, migrated: 0, skipped: 0, failed: 1, notes: "missing project config" };
  }
  logger.info(`migrateIssues start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`);

  // Pre-fetch reference data once per run.
  const isDryRunNoProject = ctx.dryRun && planeProjectId === "dry-run-project-id";
  const [members, planeStates, planeLabels] = isDryRunNoProject
    ? [[], [], []]
    : await Promise.all([
        plane.listProjectMembers(planeProjectId),
        plane.listStates(planeProjectId),
        plane.listLabels(planeProjectId),
      ]);

  const memberLookup = buildPlaneMemberLookup(members);
  const stateLookup = new Map(planeStates.map((s) => [s.name, s.id]));
  const stateByGroup = new Map(planeStates.map((s) => [s.group, s.id])); // first hit per group
  const labelLookup = new Map(planeLabels.map((l) => [l.name, l.id]));

  // Pull only the custom/built-in fields this project actually maps.
  const projectFieldIds = customFieldIds(ctx.config.mappings, ctx.jiraProject);
  const issueFields = Array.from(new Set([...BASE_ISSUE_FIELDS, ...projectFieldIds]));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  // Projects that turn Jira epics into Plane modules (the `epics` entity) must
  // NOT also import epics as work items — they become module groupings instead.
  // Gated on config so Task-only projects (no `epics` entity) are unaffected.
  const excludeEpics = projectCfg.migrate_entities?.includes("epics") ?? false;
  const issuesJql = `project = ${ctx.jiraProject}${excludeEpics ? " AND issuetype != Epic" : ""} ORDER BY created ASC`;
  if (excludeEpics) logger.info(`migrateIssues: excluding issuetype=Epic (handled by the epics→modules migrator)`);

  let nextPageToken: string | undefined;
  while (true) {
    const page = await jira.searchIssues({
      jql: issuesJql,
      fields: issueFields,
      pageSize: ctx.batch,
      nextPageToken,
    });

    for (const issue of page.issues) {
      if (ctx.limit && processed >= ctx.limit) {
        return done(migrated, skipped, failed);
      }
      processed++;

      const jiraKey = issue.key;
      if (ctx.resume && (await hasMigrated("work_item", jiraKey))) {
        continue;
      }

      try {
        const payload = buildPayload(issue, ctx, projectCfg, memberLookup, stateLookup, stateByGroup, labelLookup);

        if (ctx.dryRun) {
          logger.info(
            `[dry-run] ${jiraKey} → ${JSON.stringify({
              name: payload.name,
              state: payload.state,
              priority: payload.priority,
              assignees: payload.assignees,
              labels: payload.labels,
              start_date: payload.start_date,
              target_date: payload.target_date,
              description_preview: (payload.description_html ?? "").slice(0, 120),
            })}`,
          );
          skipped++;
          continue;
        }

        const created = await plane.createWorkItem(planeProjectId, payload);
        await append({
          entity: "work_item",
          project: ctx.jiraProject,
          jira_key: jiraKey,
          plane_id: created.id,
          status: "ok",
          at: new Date().toISOString(),
        });
        logger.info(`migrated ${jiraKey} → ${projectCfg.plane_project_identifier}-${created.sequence_id}`);
        migrated++;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.warn(`failed: ${jiraKey}: ${error}`);
        if (!ctx.dryRun) {
          await append({
            entity: "work_item",
            project: ctx.jiraProject,
            jira_key: jiraKey,
            status: "failed",
            at: new Date().toISOString(),
            error: error.slice(0, 500),
          });
        }
        failed++;
      }
    }

    if (!page.nextPageToken) break;
    nextPageToken = page.nextPageToken;
  }

  return done(migrated, skipped, failed);
}

function done(migrated: number, skipped: number, failed: number): MigrationResult {
  logger.info(`migrateIssues done: migrated=${migrated} skipped=${skipped} failed=${failed}`);
  return { ok: failed === 0, migrated, skipped, failed };
}

interface CreatePayload {
  name: string;
  description_html: string;
  state?: string;
  priority: string;
  assignees: string[];
  labels: string[];
  start_date?: string | null;
  target_date?: string | null;
}

/**
 * Build the Plane createWorkItem payload for one Jira issue. All field
 * resolution (state, priority, assignee, labels, custom fields) happens here.
 * Unknown state falls back to the project's first "unstarted" state;
 * unresolved labels are skipped (not auto-created mid-run).
 */
function buildPayload(
  issue: JiraIssue,
  ctx: MigrationContext,
  projectCfg: import("../lib/config").ProjectConfig,
  memberLookup: Map<string, string>,
  stateLookup: Map<string, string>,
  stateByGroup: Map<string, string>,
  labelLookup: Map<string, string>,
): CreatePayload {
  const mappings = ctx.config.mappings;
  const project = ctx.jiraProject;

  // Status: per-project jira status name → plane state name.
  const statusName = issue.fields.status?.name ?? "";
  const planeStateName = mapJiraStatusToPlaneState(statusName, mappings, project);
  let stateId = planeStateName ? stateLookup.get(planeStateName) : undefined;
  if (!stateId) {
    stateId = stateByGroup.get("unstarted");
    if (planeStateName) {
      logger.warn(`state '${planeStateName}' missing on Plane project — fell back to 'unstarted' for ${issue.key}`);
    } else if (statusName) {
      logger.warn(`no mapping for jira status '${statusName}' (project ${project}) — fell back to 'unstarted' for ${issue.key}`);
    }
  }

  const priority = mapJiraPriorityToPlanePriority(issue.fields.priority?.name, mappings);

  const assigneeRes = resolveJiraAssignee(issue.fields.assignee?.accountId, ctx.config.users, memberLookup);

  const creatorEmail = issue.fields.creator?.emailAddress ?? null;
  const creatorDisplayName = issue.fields.creator?.displayName ?? null;
  const createdDate = (issue.fields.created ?? "").slice(0, 10);

  const description_html = wrapAsHtml(
    buildDescription(
      issue,
      {
        jiraKey: issue.key,
        creatorEmail,
        creatorDisplayName,
        assigneeEmail: assigneeRes.email,
        createdDate,
      },
      mappings,
      project,
      projectCfg.properties,
    ),
  );

  const labelIds: string[] = [];
  for (const name of mapJiraLabels(issue.fields.labels ?? [], mappings)) {
    const id = labelLookup.get(name);
    if (id) labelIds.push(id);
    else logger.warn(`label '${name}' not pre-seeded on Plane project — skipping for ${issue.key}`);
  }

  const builtins = collectBuiltinDates(issue, mappings, project);

  return {
    name: issue.fields.summary,
    description_html,
    state: stateId,
    priority,
    assignees: assigneeRes.planeUserId ? [assigneeRes.planeUserId] : [],
    labels: labelIds,
    start_date: builtins.start_date ?? null,
    target_date: builtins.target_date ?? null,
  };
}

/**
 * Read every Jira field whose mapping action is `builtin:<plane_field>` and
 * collect them into the Plane work-item payload shape. Values are normalised to
 * YYYY-MM-DD; null/empty values are ignored so Plane defaults take over.
 */
function collectBuiltinDates(
  issue: JiraIssue,
  mappings: import("../lib/config").MappingsConfig,
  project: string,
): Partial<Record<BuiltinField, string | null>> {
  const out: Partial<Record<BuiltinField, string | null>> = {};
  const projectMap = mappings.custom_fields[project] ?? {};
  for (const fieldId of Object.keys(projectMap)) {
    const action = customFieldAction(fieldId, mappings, project);
    if (action.kind !== "builtin") continue;
    const raw = issue.fields[fieldId];
    const iso = normaliseDate(raw);
    if (iso) out[action.field] = iso;
  }
  // Plane rejects start_date > target_date. Some Jira projects use those fields
  // with inverted semantics (e.g. ARH intake form: duedate=submission date,
  // start_date=desired completion). Swap when inverted so both dates survive.
  if (out.start_date && out.target_date && out.start_date > out.target_date) {
    [out.start_date, out.target_date] = [out.target_date, out.start_date];
  }
  return out;
}

function normaliseDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;
  // Accept "YYYY-MM-DD" directly; otherwise slice from a full ISO string.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return null;
}

/**
 * Wrap markdown in a single <p> block. Plane stores this verbatim in
 * `description_html` and renders newlines + bullet chars as plain text —
 * matches how existing II work items are stored. The migration prefix
 * survives intact, which is what /migrate-reassign relies on.
 */
function wrapAsHtml(markdown: string): string {
  if (!markdown) return "";
  // Only neutralise raw HTML tags from the ADF (e.g. <script>), not the markdown
  // chars (`>`, `*`, `_`) — those must stay literal for reassign to parse.
  const safe = markdown.replace(/<(\/?[a-zA-Z][^>]*)>/g, "&lt;$1&gt;");
  return `<p>${safe}</p>`;
}
