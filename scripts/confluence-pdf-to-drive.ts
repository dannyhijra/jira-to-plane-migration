#!/usr/bin/env bun
// Export Confluence pages as native PDFs and upload them to Google Drive,
// mirroring the space tree as nested Drive folders. Stage 2 of the
// Confluence→Google-Drive pipeline (the local-disk variant is
// scripts/confluence-export-pdf.ts; this one uploads instead of writing files).
//
// Reuses the validated ConfluenceClient.exportPagePdf() flow and the shared
// tree/manifest helpers. Idempotent two ways:
//   1. the append-only manifest (state/confluence-manifest.jsonl) — a page whose
//      recorded DRIVE version is still current is skipped without any work;
//   2. Drive appProperties (confluencePageId/confluenceVersion) — if the
//      manifest is lost, an existing up-to-date Drive file is detected and the
//      manifest is back-filled, so no duplicate is uploaded.
// --force re-exports and re-uploads regardless.
//
// Auth: page enumeration uses JIRA_API_TOKEN; the PDF export needs
// CONFLUENCE_COOKIE_HEADER (session cookie, expires in hours — refresh on 403
// and re-run, the manifest resumes); Drive uses the OAuth refresh token from
// scripts/google-auth.ts plus GOOGLE_DRIVE_FOLDER_ID.
//
// Usage:
//   bun run scripts/confluence-pdf-to-drive.ts --page 189399052           # one page
//   bun run scripts/confluence-pdf-to-drive.ts ENG --under 189399052 --limit 5
//   bun run scripts/confluence-pdf-to-drive.ts ENG --dry-run              # plan only
//   bun run scripts/confluence-pdf-to-drive.ts ENG --under 189399052 --keep-local
//   bun run scripts/confluence-pdf-to-drive.ts ENG --force
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadConfig } from "../src/lib/config";
import { ConfluenceClient, ConfluenceCookieError } from "../src/clients/confluence";
import { GoogleDriveClient } from "../src/clients/googleDrive";
import { subtree, computePaths, ancestorTitles, safeSeg } from "../src/lib/confluence-tree";
import { loadManifest, appendManifest, type ManifestEntry } from "../src/lib/confluence-manifest";
import { logger } from "../src/lib/logger";

interface Args {
  spaceKeys: string[];
  dryRun: boolean;
  debug: boolean;
  force: boolean;
  keepLocal: boolean;
  outDir: string;
  page: string | null;
  limit: number | null;
  under: string | null;
  folder: string | null; // overrides GOOGLE_DRIVE_FOLDER_ID
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    spaceKeys: [], dryRun: false, debug: false, force: false, keepLocal: false,
    outDir: "confluence-pdf", page: null, limit: null, under: null, folder: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--debug") a.debug = true;
    else if (arg === "--force") a.force = true;
    else if (arg === "--keep-local") a.keepLocal = true;
    else if (arg === "--out") a.outDir = argv[++i];
    else if (arg === "--page") a.page = argv[++i];
    else if (arg === "--limit") a.limit = Math.max(0, parseInt(argv[++i] ?? "0", 10));
    else if (arg === "--under") a.under = argv[++i];
    else if (arg === "--folder") a.folder = argv[++i];
    else if (arg.startsWith("--")) throw new Error(`Unknown flag: ${arg}`);
    else a.spaceKeys.push(arg);
  }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const confluence = new ConfluenceClient(config);
  if (args.debug) confluence.debugDir = "state/confluence-debug";

  const rootFolderId = args.folder ?? config.google.driveFolderId;
  const g = config.google;

  logger.info(
    `confluence-pdf-to-drive: spaces=[${args.spaceKeys.join(", ") || "-"}] page=${args.page ?? "-"} ` +
      `under=${args.under ?? "-"} limit=${args.limit ?? "-"} dryRun=${args.dryRun} force=${args.force} ` +
      `keepLocal=${args.keepLocal} cookie=${confluence.hasCookie ? "set" : "MISSING"} ` +
      `driveFolder=${rootFolderId ? "set" : "MISSING"}`,
  );

  if (!args.dryRun) {
    if (!confluence.hasCookie) {
      throw new ConfluenceCookieError(
        "CONFLUENCE_COOKIE_HEADER not set in .env — the native PDF export needs a browser session cookie. " +
          "Use --dry-run to plan without it.",
      );
    }
    if (!g.clientId || !g.clientSecret || !g.refreshToken) {
      throw new Error("Google OAuth not configured — run scripts/google-auth.ts first (need refresh token in .env).");
    }
    if (!rootFolderId) {
      throw new Error("No Drive destination — set GOOGLE_DRIVE_FOLDER_ID in .env or pass --folder <id>.");
    }
  }

  const drive =
    !args.dryRun && g.clientId && g.clientSecret && g.refreshToken
      ? new GoogleDriveClient({
          clientId: g.clientId,
          clientSecret: g.clientSecret,
          refreshToken: g.refreshToken,
          sharedDriveId: g.sharedDriveId,
        })
      : null;

  const manifest = await loadManifest();
  const totals = { pages: 0, uploaded: 0, skipped: 0, failed: 0 };

  // ── Single-page mode ──────────────────────────────────────────────────────
  // A lone page has no enumerated tree, so it goes straight under the root folder.
  if (args.page) {
    const blob = await confluence.exportPagePdf(args.page);
    const name = `page-${args.page}.pdf`;
    if (drive) {
      const id = await drive.uploadPdf(blob, name, rootFolderId!, {
        confluencePageId: args.page,
        confluenceVersion: "0",
      });
      logger.info(`uploaded ${args.page} (${blob.size}b) → drive ${id}`);
    } else {
      logger.info(`[dry-run] would upload ${args.page} (${blob.size}b) → ${rootFolderId ?? "<folder>"}`);
    }
    if (args.keepLocal) {
      const out = join(args.outDir, name);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(await blob.arrayBuffer()));
      logger.info(`kept local copy ${out}`);
    }
    return;
  }

  if (args.spaceKeys.length === 0) {
    throw new Error("No space keys given. Pass one or more space keys (e.g. ENG) or use --page <id>.");
  }

  for (const key of args.spaceKeys) {
    if (args.limit != null && totals.uploaded >= args.limit) break;
    const space = await confluence.getSpaceByKey(key);
    const allPages = await confluence.listPages(space.id);
    // Paths/ancestors are computed over the full space tree so the Drive folder
    // structure is identical whether or not --under is used.
    const localPaths = computePaths(space.key, allPages);
    let pages = allPages;
    if (args.under) {
      pages = subtree(allPages, args.under);
      if (pages.length === 0) {
        logger.warn(`space ${space.key}: no page with id ${args.under} (or no descendants) — skipping`);
        continue;
      }
      logger.info(`space ${space.key} (${space.name}): ${allPages.length} pages, ${pages.length} under ${args.under}`);
    } else {
      logger.info(`space ${space.key} (${space.name}): ${allPages.length} current pages`);
    }

    const branchRoot = args.under ?? space.key;

    for (const page of pages) {
      if (args.limit != null && totals.uploaded >= args.limit) break;
      totals.pages++;

      // 1) Manifest skip — no Drive/Confluence calls for an unchanged drive entry.
      if (!args.force) {
        const prev = manifest.get(page.id);
        if (prev?.status === "ok" && prev.target === "drive" && prev.driveFileId && prev.version >= page.version) {
          totals.skipped++;
          logger.debug(`skip ${page.id} v${page.version} (manifest): drive ${prev.driveFileId}`);
          continue;
        }
      }

      // Folder segments mirror the Confluence tree: <SPACE>/<ancestor titles…>.
      const segments = ancestorTitles(space.key, allPages, page.id).map(safeSeg);
      const breadcrumb = ancestorTitles(space.key, allPages, page.id).join(" / ");
      const fileName = `${safeSeg(page.title)}__${page.id}.pdf`;

      if (args.dryRun) {
        totals.uploaded++; // would-upload count
        logger.info(`[dry-run] would upload ${page.id} v${page.version} → ${segments.join("/")}/${fileName}`);
        continue;
      }

      try {
        const folderId = await drive!.ensureFolderPath(segments, rootFolderId!);

        // 2) Drive self-heal — if an up-to-date copy already exists, back-fill manifest.
        if (!args.force) {
          const existing = await drive!.findExisting(page.id, folderId);
          const existingVer = parseInt(existing?.appProperties?.confluenceVersion ?? "-1", 10);
          if (existing && existingVer >= page.version) {
            await appendManifest({
              ts: new Date().toISOString(), spaceKey: space.key, pageId: page.id,
              version: page.version, title: page.title, target: "drive",
              driveFileId: existing.id, status: "ok",
            });
            totals.skipped++;
            logger.info(`skip ${page.id} v${page.version} (already in drive ${existing.id})`);
            continue;
          }
        }

        const blob = await confluence.exportPagePdf(page.id);
        const driveFileId = await drive!.uploadPdf(blob, fileName, folderId, {
          confluencePageId: page.id,
          confluenceVersion: String(page.version),
          confluenceBranchRoot: branchRoot,
          confluenceBreadcrumb: breadcrumb.slice(0, 124), // appProperty value cap is 124 chars
        });

        if (args.keepLocal) {
          const out = join(args.outDir, localPaths.get(page.id)!);
          await mkdir(dirname(out), { recursive: true });
          await writeFile(out, Buffer.from(await blob.arrayBuffer()));
        }

        await appendManifest({
          ts: new Date().toISOString(), spaceKey: space.key, pageId: page.id,
          version: page.version, title: page.title, target: "drive",
          driveFileId, file: args.keepLocal ? localPaths.get(page.id) : undefined,
          status: "ok", bytes: blob.size,
        });
        totals.uploaded++;
        logger.info(`ok ${page.id} v${page.version} (${blob.size}b) → drive ${driveFileId} (${segments.join("/")}/${fileName})`);
      } catch (err) {
        // A dead cookie fails every subsequent page — stop fast with guidance.
        if (err instanceof ConfluenceCookieError) {
          logger.error(`cookie/session problem: ${err.message}`);
          throw err;
        }
        const msg = err instanceof Error ? err.message : String(err);
        await appendManifest({
          ts: new Date().toISOString(), spaceKey: space.key, pageId: page.id,
          version: page.version, title: page.title, target: "drive",
          status: "failed", error: msg.slice(0, 500),
        });
        totals.failed++;
        logger.error(`FAILED ${page.id} (${page.title}): ${msg}`);
      }
    }
  }

  logger.info(
    `done: ${totals.pages} pages · ${totals.uploaded} ${args.dryRun ? "to-upload" : "uploaded"} · ` +
      `${totals.skipped} skipped · ${totals.failed} failed`,
  );
  if (totals.failed > 0 && !args.dryRun) process.exitCode = 1;
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
