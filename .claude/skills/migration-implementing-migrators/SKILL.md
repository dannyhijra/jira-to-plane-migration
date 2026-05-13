---
name: migration-implementing-migrators
description: Code patterns and the contract for implementing migrator modules under src/migrators/. Covers the standard migrator structure, mandatory behaviors (dry-run, resume, retry, manifest), pagination, error handling, and entity-specific notes for issues, comments, sprints, epics, attachments, links, and reassign. Use whenever writing or editing a migrator file.
---

# Implementing migrators

Every migrator under `src/migrators/` follows the same shape. This skill is the contract.

## Standard signature

```typescript
import type { JiraClient } from "../clients/jira";
import type { PlaneClient } from "../clients/plane";
import type { MigrationContext, MigrationResult } from "../state/types";

export interface MigratorArgs {
  ctx: MigrationContext;
  jira: JiraClient;
  plane: PlaneClient;
  planeProjectId: string;
}

export async function migrate<Entity>(args: MigratorArgs): Promise<MigrationResult>;
```

The `MigratorArgs` interface lives in `src/migrators/issues.ts` (canonical). Other migrators import from there.

## Mandatory behaviors — every migrator MUST do these

1. **Honor `ctx.dryRun`.** No Plane writes, no manifest writes. Log `[dry-run] would create: <key> → <preview>` per item. Return a result reflecting "would migrate" counts.

2. **Honor `ctx.resume`.** Before processing each item, call `await hasMigrated(entity, jiraKey)`. If it returns true, skip silently. Don't append a "skipped" manifest entry on resume — the existing "ok" entry is the record.

3. **Honor `ctx.limit` and `ctx.batch`.**
   - `limit`: hard cap on total items processed in this run. Used during pilots.
   - `batch`: page size for paginated reads.

4. **Wrap every API call in `withRetry`.** Both Jira reads and Plane writes. The default retry policy handles 429 and 5xx with exponential backoff.

5. **Use `paginate` for paginated reads.** Don't write per-migrator pagination loops.

6. **Append a manifest entry per attempt.**
   - Success → `status: "ok"`, with `plane_id`
   - Failure → `status: "failed"`, with `error` (truncate to ~500 chars)
   - Skipped by business rule (not resume) → `status: "skipped"`, with `notes`

7. **Catch and log errors per-item; do NOT abort the run on a single failure.** Append a failure entry and continue to the next item. One bad ticket shouldn't sink a 5,000-issue migration.

## Standard structure (template)

```typescript
import { logger } from "../lib/logger";
import { withRetry } from "../lib/retry";
import { paginate } from "../lib/paginate";
import { append, hasMigrated } from "../state/manifest";
import type { MigratorArgs } from "./issues";
import type { MigrationResult } from "../state/types";

export async function migrateXxx(args: MigratorArgs): Promise<MigrationResult> {
  const { ctx, jira, plane, planeProjectId } = args;
  logger.info(`migrateXxx start: project=${ctx.jiraProject} dryRun=${ctx.dryRun}`);

  // Pre-fetch reference data once (NOT per-item)
  const memberLookup = await prefetchMemberLookup(plane);

  let migrated = 0, skipped = 0, failed = 0;
  let processed = 0;

  const source = paginate<JiraXxxRaw, string>(async (cursor) => {
    return jira.searchXxx(ctx.jiraProject, cursor, ctx.batch);
    // searchXxx returns { items, nextCursor }
  });

  for await (const item of source) {
    if (ctx.limit && processed >= ctx.limit) break;
    processed++;

    const jiraKey = extractKey(item);

    // Resume: skip already-done items silently
    if (ctx.resume && (await hasMigrated("<entity>", jiraKey))) {
      continue;
    }

    try {
      const payload = mapItem(item, ctx.config, memberLookup);

      if (ctx.dryRun) {
        logger.info(
          `[dry-run] would create: ${jiraKey} → ${JSON.stringify(payload).slice(0, 200)}`
        );
        skipped++;
        continue;
      }

      const result = await plane.createXxx(planeProjectId, payload);

      await append({
        entity: "<entity>",
        project: ctx.jiraProject,
        jira_key: jiraKey,
        plane_id: result.id,
        status: "ok",
        at: new Date().toISOString(),
      });
      migrated++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      logger.warn(`failed: ${jiraKey}: ${error}`);

      await append({
        entity: "<entity>",
        project: ctx.jiraProject,
        jira_key: jiraKey,
        status: "failed",
        at: new Date().toISOString(),
        error: error.slice(0, 500),
      });
      failed++;
    }
  }

  logger.info(
    `migrateXxx done: migrated=${migrated} skipped=${skipped} failed=${failed}`
  );
  return { ok: failed === 0, migrated, skipped, failed };
}
```

## Mapping conventions

- Field mappers live under `src/mappers/`. Don't inline mapping logic in migrators.
- A mapper is a pure function: takes Jira value + relevant config + optionally a lookup map, returns the Plane value.
- Unknown values fall back to safe defaults (`unstarted` for status, `none` for priority).
- For assignee resolution, the lookup map is `Map<lowercase_email, plane_user_id>`. Misses return undefined; the migrator handles the prefix logic.

## Author / assignee handling

Read `.claude/skills/migration-user-strategy/SKILL.md` for the full strategy. Summary applied to code:

- Look up Jira assignee's lowercased email in the pre-fetched `memberLookup`. If present, include in `assignees`. If absent, leave `assignees: []`.
- ALWAYS prepend the migration prefix to the description, regardless of whether the email resolved.
- NEVER attempt to set `created_by` — Plane ignores it. Don't include the field in payloads.

## Entity-specific notes

- **issues** — the canonical migrator; all others mirror its shape. Implement first; the patterns get reused.
- **comments** — depends on `issues` being done. Look up `work_item plane_id` from the manifest via `getEntry("work_item", jiraKey)`. Comment text gets the comment prefix prepended.
- **sprints** — Jira's Agile API. First find the board associated with the project (via Atlassian MCP), then list sprints. Each sprint → one Plane cycle. Cycle membership requires `issues` to be done (look up plane_ids from manifest).
- **epics** — Jira epics are issues with `issuetype = Epic`. Query them separately. Each epic → one Plane module. Child issues link via the `Epic Link` custom field or the `parent` field (next-gen projects).
- **attachments** — the slowest entity. Expect partial failures and retry liberally. Three-step Plane upload: get upload credentials → upload file (often to S3 presigned URL) → complete upload. Stream the Jira download into the Plane upload to avoid buffering large files in memory.
- **links** — run LAST. Both sides of every link must already exist in Plane. Map Jira link types (`blocks`, `is blocked by`, `relates to`, etc.) to Plane relation types.
- **reassign** — an **updater** (`PATCH`), not a creator. Reads existing Plane work items, parses the description prefix, looks up the email in the current member list, patches `assignees` if resolvable. Idempotent on the `entity: "reassign"` manifest entries.

## Pitfalls

- Forgetting to lowercase emails before lookup → assignee resolution misses real matches.
- Mutating the source Jira object → causes confusing logs. Always destructure or clone.
- Pre-fetching member lookup per item → quadratic API calls and rate limiting. Pre-fetch once at run start.
- Not honoring `--dry-run` → catastrophic on a Plane workspace; you can't undo at scale.
- Aborting the run on the first failure → loses the 4,999 good items in a 5,000-issue migration. Always catch per-item.
