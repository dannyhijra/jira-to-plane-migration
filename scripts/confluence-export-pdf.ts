#!/usr/bin/env bun
// Download Confluence pages as PDF, one file per page, mirroring the space tree.
//
// Stage 1 of the Confluence→Google-Drive migration. Stage 2 (the GDrive upload)
// is a separate script that consumes this manifest. This script only downloads.
//
// Idempotent: an append-only manifest (state/confluence-manifest.jsonl) records
// each page's id + version. A re-run skips any page whose recorded version is
// still current AND whose PDF still exists on disk; an edited page (higher
// version) is re-downloaded. Use --force to ignore the manifest entirely.
//
// Page enumeration uses the Jira API token. The PDF export itself is the native
// Confluence "Export to PDF" (flyingpdf), which is session-gated — set
// CONFLUENCE_COOKIE_HEADER in .env (grab it from a logged-in browser, same as
// PLANE_COOKIE_HEADER). The cookie expires in hours; refresh when it 403s.
//
// Usage:
//   bun run scripts/confluence-export-pdf.ts ENG TD            # whole spaces
//   bun run scripts/confluence-export-pdf.ts ENG --dry-run     # plan only, no writes
//   bun run scripts/confluence-export-pdf.ts --page 1933600 --debug   # one page, dump raw responses
//   bun run scripts/confluence-export-pdf.ts ENG --force       # re-download everything
//   bun run scripts/confluence-export-pdf.ts ENG --out ./confluence-pdf
//
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadConfig } from "../src/lib/config";
import { ConfluenceClient, ConfluenceCookieError } from "../src/clients/confluence";
import { subtree, computePaths } from "../src/lib/confluence-tree";
import { loadManifest, appendManifest, fileExists } from "../src/lib/confluence-manifest";
import { logger } from "../src/lib/logger";

interface Args {
  spaceKeys: string[];
  dryRun: boolean;
  debug: boolean;
  force: boolean;
  outDir: string;
  page: string | null;
  limit: number | null;
  under: string | null;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { spaceKeys: [], dryRun: false, debug: false, force: false, outDir: "confluence-pdf", page: null, limit: null, under: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--debug") a.debug = true;
    else if (arg === "--force") a.force = true;
    else if (arg === "--out") a.outDir = argv[++i];
    else if (arg === "--page") a.page = argv[++i];
    else if (arg === "--limit") a.limit = Math.max(0, parseInt(argv[++i] ?? "0", 10));
    else if (arg === "--under") a.under = argv[++i];
    else if (arg.startsWith("--")) throw new Error(`Unknown flag: ${arg}`);
    else a.spaceKeys.push(arg);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const client = new ConfluenceClient(config);
  if (args.debug) client.debugDir = "state/confluence-debug";

  logger.info(
    `confluence-export-pdf: spaces=[${args.spaceKeys.join(", ") || "-"}] page=${args.page ?? "-"} ` +
      `dryRun=${args.dryRun} force=${args.force} out=${args.outDir} cookie=${client.hasCookie ? "set" : "MISSING"}`,
  );

  if (!args.dryRun && !client.hasCookie) {
    throw new ConfluenceCookieError(
      "CONFLUENCE_COOKIE_HEADER not set in .env — the native PDF export needs a browser session cookie. " +
        "Use --dry-run to plan without it.",
    );
  }

  // ── Single-page debug mode ──────────────────────────────────────────────
  if (args.page) {
    const blob = await client.exportPagePdf(args.page);
    const out = join(args.outDir, `page-${args.page}.pdf`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await blob.arrayBuffer()));
    logger.info(`wrote ${out} (${blob.size} bytes)`);
    return;
  }

  if (args.spaceKeys.length === 0) {
    throw new Error("No space keys given. Pass one or more space keys (e.g. ENG TD) or use --page <id>.");
  }

  const manifest = await loadManifest();
  const totals = { pages: 0, downloaded: 0, skipped: 0, failed: 0 };

  for (const key of args.spaceKeys) {
    if (args.limit != null && totals.downloaded >= args.limit) break;
    const space = await client.getSpaceByKey(key);
    const allPages = await client.listPages(space.id);
    // Paths are always computed over the full space tree so folder structure is
    // identical whether or not --under is used (sub-tree runs merge cleanly).
    const paths = computePaths(space.key, allPages);
    let pages = allPages;
    if (args.under) {
      pages = subtree(allPages, args.under);
      if (pages.length === 0) {
        logger.warn(`space ${space.key}: no page with id ${args.under} (or it has no descendants) — skipping`);
        continue;
      }
      logger.info(`space ${space.key} (${space.name}): ${allPages.length} pages, ${pages.length} under ${args.under}`);
    } else {
      logger.info(`space ${space.key} (${space.name}): ${allPages.length} current pages`);
    }

    for (const page of pages) {
      // --limit caps export attempts this run (skips don't count) — pilot then scale.
      if (args.limit != null && totals.downloaded >= args.limit) break;
      totals.pages++;
      const rel = paths.get(page.id)!;
      const abs = join(args.outDir, rel);

      // Idempotency: skip unchanged page whose file is still present.
      if (!args.force) {
        const prev = manifest.get(page.id);
        if (prev?.status === "ok" && prev.version >= page.version && (await fileExists(abs))) {
          totals.skipped++;
          logger.debug(`skip ${page.id} v${page.version} (unchanged): ${rel}`);
          continue;
        }
      }

      if (args.dryRun) {
        totals.downloaded++; // would-download count
        logger.info(`[dry-run] would export ${page.id} v${page.version} → ${rel}`);
        continue;
      }

      try {
        const blob = await client.exportPagePdf(page.id);
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, Buffer.from(await blob.arrayBuffer()));
        await appendManifest({
          ts: new Date().toISOString(),
          spaceKey: space.key,
          pageId: page.id,
          version: page.version,
          title: page.title,
          target: "disk",
          file: rel,
          status: "ok",
          bytes: blob.size,
        });
        totals.downloaded++;
        logger.info(`ok ${page.id} v${page.version} (${blob.size}b) → ${rel}`);
      } catch (err) {
        // A dead cookie fails every subsequent page — stop fast with guidance.
        if (err instanceof ConfluenceCookieError) {
          logger.error(`cookie/session problem: ${err.message}`);
          throw err;
        }
        const msg = err instanceof Error ? err.message : String(err);
        await appendManifest({
          ts: new Date().toISOString(),
          spaceKey: space.key,
          pageId: page.id,
          version: page.version,
          title: page.title,
          file: rel,
          status: "failed",
          error: msg.slice(0, 500),
        });
        totals.failed++;
        logger.error(`FAILED ${page.id} (${page.title}): ${msg}`);
      }
    }
  }

  logger.info(
    `done: ${totals.pages} pages · ${totals.downloaded} ${args.dryRun ? "to-download" : "downloaded"} · ` +
      `${totals.skipped} skipped · ${totals.failed} failed`,
  );
  if (totals.failed > 0 && !args.dryRun) process.exitCode = 1;
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
