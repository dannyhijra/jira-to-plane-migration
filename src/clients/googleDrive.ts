// Lean Google Drive client — raw `fetch` only (no googleapis SDK; repo rule).
//
// Auth is OAuth installed-app: a long-lived refresh token (obtained once via
// scripts/google-auth.ts) is exchanged for a short-lived access token, cached
// for the run. Supports My Drive and Shared Drives (supportsAllDrives).
//
// Used by scripts/confluence-pdf-to-drive.ts to mirror the Confluence tree as
// nested Drive folders and upload each page's native PDF.
import { withRetry } from "../lib/retry";
import { logger } from "../lib/logger";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Shared Drive id — set only when the destination lives on a Shared Drive. */
  sharedDriveId?: string;
}

/** Thrown on OAuth/permission failures (refresh token revoked, scope too narrow). */
export class GoogleAuthError extends Error {}

export interface DriveFile {
  id: string;
  name: string;
  appProperties?: Record<string, string>;
}

/** Escape a value for use inside a Drive query string literal (single quotes). */
function q(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export class GoogleDriveClient {
  private readonly cfg: GoogleDriveConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  /** Cache resolved folder ids: `${parentId}/${name}` → folder id. */
  private readonly folderCache = new Map<string, string>();

  constructor(cfg: GoogleDriveConfig) {
    this.cfg = cfg;
  }

  /** Exchange the refresh token for an access token, cached ~55 min. */
  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    const body = new URLSearchParams({
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      refresh_token: this.cfg.refreshToken,
      grant_type: "refresh_token",
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new GoogleAuthError(
        `Google token refresh ${res.status}: ${text.slice(0, 300)} — re-run scripts/google-auth.ts`,
      );
    }
    const json = JSON.parse(text) as { access_token: string; expires_in: number };
    this.accessToken = json.access_token;
    // Refresh 5 min early to stay clear of clock skew / request latency.
    this.tokenExpiresAt = Date.now() + (json.expires_in - 300) * 1000;
    return this.accessToken;
  }

  private async authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.token()}`, ...extra };
  }

  /** Shared-Drive query params appended to list/create calls. */
  private driveScopeParams(): Record<string, string> {
    const p: Record<string, string> = { supportsAllDrives: "true" };
    if (this.cfg.sharedDriveId) {
      p.includeItemsFromAllDrives = "true";
      p.corpora = "drive";
      p.driveId = this.cfg.sharedDriveId;
    }
    return p;
  }

  private async listFiles(query: string, fields = "files(id,name,appProperties)"): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: query,
      fields,
      pageSize: "100",
      ...this.driveScopeParams(),
    });
    return withRetry(async () => {
      const res = await fetch(`${API}/files?${params}`, { headers: await this.authHeaders() });
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new GoogleAuthError(`Drive files.list ${res.status}: ${text.slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(`Drive files.list ${res.status}: ${text.slice(0, 300)}`);
      return (JSON.parse(text).files ?? []) as DriveFile[];
    });
  }

  /** Find a child folder by name under `parentId`, creating it if absent. Cached. */
  async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const cacheKey = `${parentId}/${name}`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) return cached;

    const existing = await this.listFiles(
      `name = '${q(name)}' and '${q(parentId)}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      "files(id,name)",
    );
    if (existing[0]) {
      this.folderCache.set(cacheKey, existing[0].id);
      return existing[0].id;
    }

    const params = new URLSearchParams({ fields: "id", ...this.driveScopeParams() });
    const id = await withRetry(async () => {
      const res = await fetch(`${API}/files?${params}`, {
        method: "POST",
        headers: await this.authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
      });
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new GoogleAuthError(`Drive folder create ${res.status}: ${text.slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(`Drive folder create ${res.status}: ${text.slice(0, 300)}`);
      return JSON.parse(text).id as string;
    });
    this.folderCache.set(cacheKey, id);
    logger.debug(`drive: created folder "${name}" under ${parentId} → ${id}`);
    return id;
  }

  /** Resolve a chain of nested folder names under a root, creating as needed. */
  async ensureFolderPath(segments: string[], rootId: string): Promise<string> {
    let parent = rootId;
    for (const seg of segments) parent = await this.findOrCreateFolder(seg, parent);
    return parent;
  }

  /**
   * Look up an already-uploaded page by its `confluencePageId` appProperty under
   * `parentId`. Lets a run self-heal even if the local manifest is lost.
   */
  async findExisting(pageId: string, parentId: string): Promise<DriveFile | null> {
    const files = await this.listFiles(
      `appProperties has { key='confluencePageId' and value='${q(pageId)}' } and ` +
        `'${q(parentId)}' in parents and trashed = false`,
    );
    return files[0] ?? null;
  }

  /** Multipart/related upload of a PDF blob. Returns the created file id. */
  async uploadPdf(
    blob: Blob,
    name: string,
    parentFolderId: string,
    appProperties: Record<string, string>,
  ): Promise<string> {
    const metadata = {
      name,
      parents: [parentFolderId],
      mimeType: "application/pdf",
      appProperties,
    };
    const boundary = "confluence-pdf-boundary-7e1c";
    const pre =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      "Content-Type: application/pdf\r\n\r\n";
    const post = `\r\n--${boundary}--`;
    const multipart = new Blob([pre, blob, post], {
      type: `multipart/related; boundary=${boundary}`,
    });

    const params = new URLSearchParams({
      uploadType: "multipart",
      fields: "id",
      ...this.driveScopeParams(),
    });
    return withRetry(async () => {
      const res = await fetch(`${UPLOAD}?${params}`, {
        method: "POST",
        headers: await this.authHeaders({ "Content-Type": `multipart/related; boundary=${boundary}` }),
        body: multipart,
      });
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new GoogleAuthError(
          `Drive upload ${res.status}: ${text.slice(0, 300)} — ` +
            `if this is a permission error, the dest folder may not be app-owned (drive.file scope); re-auth with --scope drive`,
        );
      }
      if (!res.ok) throw new Error(`Drive upload ${res.status}: ${text.slice(0, 300)}`);
      return JSON.parse(text).id as string;
    });
  }

  /** Trivial connectivity check used by the auth helper. */
  async whoamiCheck(): Promise<void> {
    await this.listFiles("trashed = false", "files(id,name)");
  }
}
