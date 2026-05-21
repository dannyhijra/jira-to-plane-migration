import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";
import type { JiraIssueLink } from "../clients/jira";
import { PlaneRelationError } from "../clients/plane";
import { logger } from "../lib/logger";
import { append, hasMigrated, loadManifest } from "../state/manifest";
import { mapJiraLinkToPlaneRelation } from "../mappers/links";

/**
 * Migrate Jira issue links to Plane work-item relations.
 *
 * Runs LAST — both sides of every link must already exist in Plane, so we resolve
 * each end's plane_id from the `work_item` manifest entries. Links whose other end
 * has no plane_id (cross-project, deleted, or not-yet-migrated) are skipped.
 *
 * Dedup: a Jira link appears on both linked issues with the same link `id`; that id
 * is the manifest key, and an in-run `seen` set guards against creating it twice
 * within a single pass (when --resume is off).
 *
 * Relations use the cookie-gated internal API (see PlaneClient.createRelation) — a
 * PlaneRelationError (missing/expired cookie or Cloudflare) aborts the run early.
 */
export async function migrateLinks(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  logger.info(`migrateLinks start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`);

  if (!ctx.dryRun && !ctx.config.plane.cookieHeader) {
    logger.error(
      "migrateLinks: PLANE_COOKIE_HEADER not set — relations use the cookie-gated internal API. " +
        "Set a fresh browser Cookie in .env and re-run.",
    );
    return { ok: false, migrated: 0, skipped: 0, failed: 0, notes: "missing cookie" };
  }

  // jira_key (e.g. "DEPLOY-300") → Plane work-item UUID, from successful issue migrations.
  const manifest = await loadManifest();
  const planeIdByKey = new Map<string, string>();
  for (const e of manifest.values()) {
    if (e.entity === "work_item" && e.project === ctx.jiraProject && e.status === "ok" && e.plane_id) {
      planeIdByKey.set(e.jira_key, e.plane_id);
    }
  }
  logger.info(`migrateLinks: ${planeIdByKey.size} migrated work items available for link resolution`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  const seen = new Set<string>();

  let nextPageToken: string | undefined;
  try {
    while (true) {
      const page = await jira.searchIssues({
        jql: `project = ${ctx.jiraProject} ORDER BY created ASC`,
        fields: ["issuelinks"],
        pageSize: ctx.batch,
        nextPageToken,
      });

      for (const issue of page.issues) {
        const links = (issue.fields.issuelinks as JiraIssueLink[] | undefined) ?? [];
        for (const link of links) {
          if (ctx.limit && processed >= ctx.limit) return done(migrated, skipped, failed);

          // Dedup: same link id appears on both issues; process it once per run.
          if (seen.has(link.id)) continue;
          seen.add(link.id);
          processed++;

          if (ctx.resume && (await hasMigrated("link", link.id))) continue;

          const otherIssue = link.outwardIssue ?? link.inwardIssue;
          const direction: "inward" | "outward" = link.outwardIssue ? "outward" : "inward";
          const fromKey = issue.key;
          const otherKey = otherIssue?.key;

          // Missing other end (malformed link) or either side not migrated → skip.
          const fromId = planeIdByKey.get(fromKey);
          const otherId = otherKey ? planeIdByKey.get(otherKey) : undefined;
          if (!otherKey || !fromId || !otherId) {
            const reason = !otherKey
              ? "link has no linked issue"
              : `unresolved plane_id (${!fromId ? fromKey + " " : ""}${!otherId ? otherKey : ""})`.trim();
            logger.warn(`skip link ${link.id} (${fromKey} ↔ ${otherKey ?? "?"}): ${reason}`);
            if (!ctx.dryRun) {
              await append({
                entity: "link",
                project: ctx.jiraProject,
                jira_key: link.id,
                status: "skipped",
                at: new Date().toISOString(),
                notes: `${link.type?.name ?? "link"} ${fromKey}→${otherKey ?? "?"}: ${reason}`,
              });
            }
            skipped++;
            continue;
          }

          const relationType = mapJiraLinkToPlaneRelation(link.type?.name ?? "", direction);

          // Deliberately-dropped link types (Polaris, migration_parent) → record skipped.
          if (!relationType) {
            logger.info(`skip link ${link.id} (${fromKey} ↔ ${otherKey}): dropped link type "${link.type?.name}"`);
            if (!ctx.dryRun) {
              await append({
                entity: "link",
                project: ctx.jiraProject,
                jira_key: link.id,
                status: "skipped",
                at: new Date().toISOString(),
                notes: `dropped link type ${link.type?.name} ${fromKey}→${otherKey}`,
              });
            }
            skipped++;
            continue;
          }

          try {
            if (ctx.dryRun) {
              logger.info(
                `[dry-run] link ${link.id}: ${fromKey} --${relationType}--> ${otherKey} (Jira "${link.type?.name}")`,
              );
              skipped++;
              continue;
            }

            const created = await plane.createRelation(planeProjectId, fromId, relationType, [otherId]);
            await append({
              entity: "link",
              project: ctx.jiraProject,
              jira_key: link.id,
              plane_id: created.id,
              status: "ok",
              at: new Date().toISOString(),
              notes: `${link.type?.name} ${fromKey}→${otherKey} (${relationType})`,
            });
            logger.info(`linked ${fromKey} --${relationType}--> ${otherKey}`);
            migrated++;
          } catch (err) {
            if (err instanceof PlaneRelationError) throw err; // abort the whole run
            const error = err instanceof Error ? err.message : String(err);
            logger.warn(`failed: link ${link.id} (${fromKey}→${otherKey}): ${error}`);
            await append({
              entity: "link",
              project: ctx.jiraProject,
              jira_key: link.id,
              status: "failed",
              at: new Date().toISOString(),
              error: error.slice(0, 500),
            });
            failed++;
          }
        }
      }

      if (!page.nextPageToken) break;
      nextPageToken = page.nextPageToken;
    }
  } catch (err) {
    if (err instanceof PlaneRelationError) {
      logger.error(`migrateLinks aborted: ${err.message}`);
      return { ok: false, migrated, skipped, failed, notes: err.message };
    }
    throw err;
  }

  return done(migrated, skipped, failed);
}

function done(migrated: number, skipped: number, failed: number): MigrationResult {
  logger.info(`migrateLinks done: migrated=${migrated} skipped=${skipped} failed=${failed}`);
  return { ok: failed === 0, migrated, skipped, failed };
}
