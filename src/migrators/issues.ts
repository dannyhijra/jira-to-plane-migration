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

export interface MigratorArgs {
  ctx: MigrationContext;
  jira: JiraClient;
  plane: PlaneClient;
  planeProjectId: string;
}

/** Jira fields requested per issue. Keep tight to minimize payload size. */
const ISSUE_FIELDS = [
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
  // Custom fields appear in mappings.yaml; we pull them via *all when needed.
  // For LDRH the only meaningful one is customfield_10468.
  "customfield_10468",
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
  const [members, planeStates, planeLabels] = ctx.dryRun
    ? await Promise.all([
        planeProjectId === "dry-run-project-id" ? Promise.resolve([]) : plane.listProjectMembers(planeProjectId),
        planeProjectId === "dry-run-project-id" ? Promise.resolve([]) : plane.listStates(planeProjectId),
        planeProjectId === "dry-run-project-id" ? Promise.resolve([]) : plane.listLabels(planeProjectId),
      ])
    : await Promise.all([
        plane.listProjectMembers(planeProjectId),
        plane.listStates(planeProjectId),
        plane.listLabels(planeProjectId),
      ]);

  const memberLookup = buildPlaneMemberLookup(members);
  const stateLookup = new Map(planeStates.map((s) => [s.name, s.id]));
  const stateByGroup = new Map(planeStates.map((s) => [s.group, s.id])); // first hit per group
  const labelLookup = new Map(planeLabels.map((l) => [l.name, l.id]));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  let nextPageToken: string | undefined;
  while (true) {
    const page = await jira.searchIssues({
      jql: `project = ${ctx.jiraProject} ORDER BY created ASC`,
      fields: ISSUE_FIELDS,
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

/**
 * Build the Plane createWorkItem payload for one Jira issue. All field
 * resolution (state, priority, assignee, labels, custom-field-in-description)
 * happens here. Unresolved state falls back to the project's first
 * "unstarted" state; unresolved labels are skipped (not auto-created mid-run).
 */
function buildPayload(
  issue: JiraIssue,
  ctx: MigrationContext,
  projectCfg: import("../lib/config").ProjectConfig,
  memberLookup: Map<string, string>,
  stateLookup: Map<string, string>,
  stateByGroup: Map<string, string>,
  labelLookup: Map<string, string>,
): {
  name: string;
  description_html: string;
  state?: string;
  priority: string;
  assignees: string[];
  labels: string[];
} {
  const mappings = ctx.config.mappings;

  // Status: per-project mapping in mappings.status[<PROJECT>] maps to Plane state NAME.
  const statusName = issue.fields.status?.name ?? "";
  const projectStatusMap = (mappings.status as unknown as Record<string, Record<string, string>>)[ctx.jiraProject] ?? {};
  const planeStateName = projectStatusMap[statusName];
  let stateId = planeStateName ? stateLookup.get(planeStateName) : undefined;

  if (!stateId) {
    // Fallback: map via state group from the (legacy) flat status mapping or default to unstarted.
    const fallbackGroup = mapJiraStatusToPlaneState(statusName, mappings);
    stateId = stateByGroup.get(fallbackGroup) ?? undefined;
    if (planeStateName) {
      logger.warn(`state name '${planeStateName}' not on Plane project — fell back to group '${fallbackGroup}'`);
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
      projectCfg.properties,
    ),
  );

  const labelIds: string[] = [];
  for (const name of mapJiraLabels(issue.fields.labels ?? [], mappings)) {
    const id = labelLookup.get(name);
    if (id) labelIds.push(id);
    else logger.warn(`label '${name}' not pre-seeded on Plane project — skipping for ${issue.key}`);
  }

  return {
    name: issue.fields.summary,
    description_html,
    state: stateId,
    priority,
    assignees: assigneeRes.planeUserId ? [assigneeRes.planeUserId] : [],
    labels: labelIds,
  };
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
