// Tree/path helpers shared by the Confluence PDF exporters (local + Drive).
//
// Both scripts/confluence-export-pdf.ts (writes to disk) and
// scripts/confluence-pdf-to-drive.ts (uploads to Google Drive) reconstruct the
// space hierarchy from the flat page list and derive each page's mirrored path.
import { join } from "node:path";
import type { ConfluencePage } from "../clients/confluence";

/** Subtree of `pages` rooted at `rootId` (root + all descendants), via parentId. */
export function subtree(pages: ConfluencePage[], rootId: string): ConfluencePage[] {
  const childrenOf = new Map<string, ConfluencePage[]>();
  for (const p of pages) {
    if (!p.parentId) continue;
    (childrenOf.get(p.parentId) ?? childrenOf.set(p.parentId, []).get(p.parentId)!).push(p);
  }
  const root = pages.find((p) => p.id === rootId);
  if (!root) return [];
  const out: ConfluencePage[] = [];
  const queue: ConfluencePage[] = [root];
  while (queue.length) {
    const p = queue.shift()!;
    out.push(p);
    queue.push(...(childrenOf.get(p.id) ?? []));
  }
  return out;
}

/** Filesystem-/Drive-safe segment: collapse unsafe chars, trim, cap length. */
export function safeSeg(s: string): string {
  return (
    s
      .replace(/[\/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+/, "")
      .slice(0, 120) || "untitled"
  );
}

/** Ordered ancestor titles of a page (root-most first), excluding the page itself. */
export function ancestorTitles(spaceKey: string, pages: ConfluencePage[], pageId: string): string[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: ConfluencePage[] = [];
  const seen = new Set<string>();
  let cur: ConfluencePage | undefined = byId.get(pageId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  // Drop the page itself; prepend the space key so the tree is rooted per-space.
  return [spaceKey, ...chain.slice(0, -1).map((p) => p.title)];
}

/** Build each page's on-disk path: <SPACE>/<ancestor titles…>/<title>__<id>.pdf */
export function computePaths(spaceKey: string, pages: ConfluencePage[]): Map<string, string> {
  const paths = new Map<string, string>();
  for (const p of pages) {
    const segs = ancestorTitles(spaceKey, pages, p.id).map(safeSeg);
    const file = `${safeSeg(p.title)}__${p.id}.pdf`;
    paths.set(p.id, join(...segs, file));
  }
  return paths;
}
