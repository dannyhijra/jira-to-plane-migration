import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";
import { logger } from "../lib/logger";

/** Browser UA — the session-gated `flyingpdf` endpoint rejects obviously-scripted
 * clients. Matches the UA used for Plane's cookie-gated uploads. */
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: "global" | "personal";
  status: "current" | "archived";
}

export interface ConfluencePage {
  id: string;
  title: string;
  /** null for top-level pages (children of the space, no page parent). */
  parentId: string | null;
  status: string;
  /** Monotonic version number — bumps on every edit. Used as the idempotency key. */
  version: number;
}

/** Thrown when the cookie is missing or the session expired (flyingpdf 401/403). */
export class ConfluenceCookieError extends Error {}

/** Thrown when the async export finishes but no PDF download link can be parsed. */
export class ConfluenceExportError extends Error {}

export class ConfluenceClient {
  /** e.g. https://alamisharia.atlassian.net/wiki */
  private readonly baseUrl: string;
  private readonly auth: string;
  private readonly cookieHeader: string | undefined;
  /** When set, raw HTML/XML responses from the export flow are dumped here. */
  debugDir: string | undefined;

  constructor(config: Config) {
    this.baseUrl = config.confluence.baseUrl.replace(/\/$/, "");
    const creds = `${config.jira.email}:${config.jira.apiToken}`;
    this.auth = "Basic " + Buffer.from(creds).toString("base64");
    this.cookieHeader = config.confluence.cookieHeader;
  }

  get hasCookie(): boolean {
    return Boolean(this.cookieHeader);
  }

  /** Token-authed JSON GET against the v2 REST API. */
  private async getJson<T>(path: string): Promise<T> {
    return withRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { Authorization: this.auth, Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Confluence ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
      }
      return res.json() as Promise<T>;
    });
  }

  /** Resolve a space key (e.g. "ENG") to its space record. Throws if not found. */
  async getSpaceByKey(key: string): Promise<ConfluenceSpace> {
    const data = await this.getJson<{ results: any[] }>(
      `/api/v2/spaces?keys=${encodeURIComponent(key)}&limit=1`,
    );
    const s = data.results?.[0];
    if (!s) throw new Error(`Confluence space not found for key "${key}"`);
    return { id: String(s.id), key: s.key, name: s.name, type: s.type, status: s.status };
  }

  /**
   * All current pages in a space, paginated via the v2 cursor. Returns id,
   * title, parentId (for tree reconstruction) and version (idempotency key).
   */
  async listPages(spaceId: string): Promise<ConfluencePage[]> {
    const out: ConfluencePage[] = [];
    // We only read metadata fields; the v2 list endpoint returns version inline.
    // Cursor links in _links.next are returned verbatim by the API.
    let path: string | null = `/api/v2/spaces/${spaceId}/pages?limit=250&status=current`;
    while (path) {
      const page: { results: any[]; _links?: { next?: string } } = await this.getJson(path);
      for (const p of page.results ?? []) {
        out.push({
          id: String(p.id),
          title: p.title ?? `(untitled-${p.id})`,
          parentId: p.parentId != null ? String(p.parentId) : null,
          status: p.status,
          version: p.version?.number ?? 0,
        });
      }
      const next = page._links?.next;
      // next is a full path beginning with /wiki/api/v2/...; strip the /wiki prefix
      // since baseUrl already ends in /wiki.
      path = next ? next.replace(/^\/wiki/, "") : null;
    }
    return out;
  }

  private async dump(name: string, body: string): Promise<void> {
    if (!this.debugDir) return;
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(this.debugDir, { recursive: true });
    await writeFile(`${this.debugDir}/${name}`, body);
  }

  private cookieHeaders(accept: string): Record<string, string> {
    return {
      Cookie: this.cookieHeader!,
      "User-Agent": BROWSER_UA,
      Accept: accept,
      "X-Atlassian-Token": "no-check",
    };
  }

  /**
   * Export a single page to PDF via Confluence Cloud's `flyingpdf` exporter.
   *
   * The endpoint is session-gated (token Basic-auth gets 403), so it runs on the
   * browser cookie. Modern Confluence Cloud ("isV3") exports asynchronously —
   * the flow below mirrors exactly what the in-page exporter JavaScript does:
   *   1. GET pdfpageexport.action?pageId=ID → starts the server task; the task
   *      id is in the `ajs-taskId` <meta> of the returned HTML shell.
   *   2. poll GET /api/v2/pdfexporttask/progress/{taskId} (JSON) until
   *      `progress` reaches 100 / state SUCCEEDED. HTTP 500 = the task failed.
   *   3. the final response's `result` field is a ready-to-GET media URL
   *      (api.media.atlassian.com/...?token=…) → fetch it for the PDF bytes.
   */
  async exportPagePdf(pageId: string): Promise<Blob> {
    if (!this.cookieHeader) {
      throw new ConfluenceCookieError(
        "CONFLUENCE_COOKIE_HEADER not configured — the flyingpdf export is session-gated",
      );
    }

    // ── Step 1: start the task ───────────────────────────────────────────
    const startUrl = `${this.baseUrl}/spaces/flyingpdf/pdfpageexport.action?pageId=${pageId}`;
    const start = await fetch(startUrl, { headers: this.cookieHeaders("text/html") });
    if (start.status === 401 || start.status === 403) {
      throw new ConfluenceCookieError(
        `flyingpdf ${start.status} (auth): refresh CONFLUENCE_COOKIE_HEADER from a fresh browser session`,
      );
    }
    const html = await start.text();
    await this.dump(`page-${pageId}-1-start.html`, html);
    const taskId = html.match(/<meta name="ajs-taskId" content="([^"]+)"/)?.[1];
    if (!taskId) {
      throw new ConfluenceExportError(
        `page ${pageId}: no ajs-taskId in the export response (status ${start.status}). ` +
          `Run with --debug and inspect the dumped start HTML.`,
      );
    }

    // ── Step 2: poll progress ────────────────────────────────────────────
    const resultUrl = await this.pollProgress(taskId, pageId);

    // ── Step 3: download the media file ──────────────────────────────────
    return this.downloadPdf(resultUrl, pageId);
  }

  /** Poll the v2 progress endpoint until done; return the `result` download URL. */
  private async pollProgress(taskId: string, pageId: string): Promise<string> {
    const url = `${this.baseUrl}/api/v2/pdfexporttask/progress/${encodeURIComponent(taskId)}`;
    const MAX_ATTEMPTS = 120; // ~4 min at 2s — large pages can take a while
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, { headers: this.cookieHeaders("application/json") });
      if (res.status === 401 || res.status === 403) {
        throw new ConfluenceCookieError(`pdfexporttask progress ${res.status}: refresh CONFLUENCE_COOKIE_HEADER`);
      }
      // The exporter JS treats 500 as a hard failure of the export task.
      if (res.status === 500) {
        throw new ConfluenceExportError(`page ${pageId}: pdf export task failed (progress 500)`);
      }
      const body = await res.text();
      let resp: { progress?: number; state?: string; result?: string };
      try {
        resp = JSON.parse(body);
      } catch {
        throw new ConfluenceExportError(`page ${pageId}: non-JSON progress response: ${body.slice(0, 200)}`);
      }
      if (attempt === 0) await this.dump(`page-${pageId}-2-progress-first.json`, body);

      if ((resp.progress ?? 0) >= 100) {
        await this.dump(`page-${pageId}-2-progress-final.json`, body);
        if (resp.state && /fail|error/i.test(resp.state)) {
          throw new ConfluenceExportError(`page ${pageId}: export state=${resp.state}`);
        }
        if (!resp.result) {
          throw new ConfluenceExportError(`page ${pageId}: progress complete but no result URL. Inspect dumped JSON.`);
        }
        return resp.result;
      }
      await sleep(2000);
    }
    throw new ConfluenceExportError(`page ${pageId}: pdf export did not complete within timeout`);
  }

  /**
   * GET the final download URL → PDF Blob. The `result` URL points at the
   * Atlassian media API and carries its own access token, so it does NOT need
   * (and should not be sent) the Confluence session cookie. Site-relative URLs
   * are resolved against the site origin and do get the cookie.
   */
  private async downloadPdf(urlOrPath: string, pageId: string): Promise<Blob> {
    const origin = this.baseUrl.replace(/\/wiki$/, "");
    let url = urlOrPath;
    let sameSite = true;
    if (url.startsWith("/wiki")) url = `${origin}${url}`;
    else if (url.startsWith("/")) url = `${this.baseUrl}${url}`;
    else sameSite = url.startsWith(origin);

    const headers: Record<string, string> = { "User-Agent": BROWSER_UA, Accept: "application/pdf,*/*" };
    if (sameSite) headers.Cookie = this.cookieHeader!;

    return withRetry(async () => {
      const res = await fetch(url, { headers, redirect: "follow" });
      if (res.status === 401 || res.status === 403) {
        throw new ConfluenceCookieError(`PDF download ${res.status}: token/session expired — refresh CONFLUENCE_COOKIE_HEADER`);
      }
      if (!res.ok) {
        throw new Error(`page ${pageId} PDF download ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const ct = res.headers.get("content-type") ?? "";
      const blob = await res.blob();
      if (!/pdf|octet-stream/.test(ct)) {
        logger.warn(`page ${pageId}: download ct=${ct} size=${blob.size} — may not be a PDF`);
      }
      return blob;
    });
  }
}
