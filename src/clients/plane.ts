import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface PlaneProject {
  id: string;
  identifier: string;
  name: string;
}

export interface PlaneState {
  id: string;
  name: string;
  group: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  color: string;
  sequence: number;
  default: boolean;
}

export interface PlaneLabel {
  id: string;
  name: string;
  color: string;
}

export interface PlaneModule {
  id: string;
  name: string;
  description?: string;
}

export interface PlaneProjectMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export interface PlaneWorkItem {
  id: string;
  name: string;
  description_html: string | null;
  state: string;
  priority: string;
  sequence_id: number;
  assignees: string[];
  labels: string[];
  created_by?: string;
}

interface PlanePaginated<T> {
  results: T[];
  next_cursor?: string | null;
  /** Plane returns `next_cursor` even on the last page; this flag is authoritative. */
  next_page_results?: boolean;
  total_count?: number;
}

/** Default state colors when seeding — chosen to roughly match Plane's defaults. */
const DEFAULT_STATE_COLOR: Record<PlaneState["group"], string> = {
  backlog: "#A3A3A3",
  unstarted: "#3A3A3A",
  started: "#F59E0B",
  completed: "#16A34A",
  cancelled: "#EF4444",
};

export class PlaneClient {
  private readonly baseUrl: string;
  private readonly workspaceSlug: string;
  private readonly apiKey: string;
  private readonly cookieHeader: string | undefined;
  private readonly csrfToken: string | undefined;

  constructor(config: Config) {
    this.baseUrl = config.plane.baseUrl.replace(/\/$/, "");
    this.workspaceSlug = config.plane.workspaceSlug;
    this.apiKey = config.plane.apiKey;
    this.cookieHeader = config.plane.cookieHeader;
    this.csrfToken = config.plane.csrfToken;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return withRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "X-API-Key": this.apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") ?? "5", 10);
        // Sleep before throwing so withRetry's backoff layers on top of the
        // server-suggested wait — avoids hammering a rate-limited server.
        await new Promise((r) => setTimeout(r, Math.max(retryAfter, 1) * 1000));
        throw new Error(`Plane 429 ${path}: rate limited, retry-after ${retryAfter}s`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Plane ${res.status} ${path}: ${body.slice(0, 500)}`);
      }
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    });
  }

  private workspacePath(suffix: string): string {
    return `/api/v1/workspaces/${this.workspaceSlug}${suffix}`;
  }

  private projectPath(projectId: string, suffix: string): string {
    return this.workspacePath(`/projects/${projectId}${suffix}`);
  }

  /**
   * Drains all pages of a Plane list endpoint. Some Plane endpoints return a
   * bare array instead of the paginated wrapper (notably project members),
   * so we accept both shapes.
   */
  private async paginatedList<T>(path: string, perPage = 100): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | null = null;
    while (true) {
      const sep = path.includes("?") ? "&" : "?";
      const url: string = `${path}${sep}per_page=${perPage}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const res = await this.request<PlanePaginated<T> | T[]>(url);
      if (Array.isArray(res)) {
        out.push(...res);
        break;
      }
      out.push(...(res.results ?? []));
      if (!res.next_page_results || !res.next_cursor) break;
      cursor = res.next_cursor;
    }
    return out;
  }

  async listProjects(): Promise<PlaneProject[]> {
    return this.paginatedList<PlaneProject>(this.workspacePath("/projects/"));
  }

  async createProject(payload: { name: string; identifier: string }): Promise<PlaneProject> {
    return this.request<PlaneProject>(this.workspacePath("/projects/"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async listStates(projectId: string): Promise<PlaneState[]> {
    return this.paginatedList<PlaneState>(this.projectPath(projectId, "/states/"));
  }

  async createState(
    projectId: string,
    payload: { name: string; group: PlaneState["group"]; color?: string; sequence?: number; default?: boolean },
  ): Promise<PlaneState> {
    return this.request<PlaneState>(this.projectPath(projectId, "/states/"), {
      method: "POST",
      body: JSON.stringify({
        color: DEFAULT_STATE_COLOR[payload.group],
        ...payload,
      }),
    });
  }

  async listLabels(projectId: string): Promise<PlaneLabel[]> {
    return this.paginatedList<PlaneLabel>(this.projectPath(projectId, "/labels/"));
  }

  async createLabel(
    projectId: string,
    payload: { name: string; color?: string },
  ): Promise<PlaneLabel> {
    return this.request<PlaneLabel>(this.projectPath(projectId, "/labels/"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Project-scoped member list. We use this as a workspace-member proxy because
   * `/workspaces/{slug}/members/` 404s on this self-hosted Plane (project-scoped
   * API only). Every workspace member who has joined any shared project will
   * show up here for that project; for assignee resolution we query the
   * target project's member list.
   */
  async listProjectMembers(projectId: string): Promise<PlaneProjectMember[]> {
    return this.paginatedList<PlaneProjectMember>(this.projectPath(projectId, "/members/"));
  }

  async createWorkItem(
    projectId: string,
    payload: {
      name: string;
      description_html?: string;
      state?: string;
      priority?: string;
      assignees?: string[];
      labels?: string[];
      /** ISO date (YYYY-MM-DD). Built-in Plane field. */
      start_date?: string | null;
      /** ISO date (YYYY-MM-DD). Built-in Plane field. */
      target_date?: string | null;
    },
  ): Promise<PlaneWorkItem> {
    return this.request<PlaneWorkItem>(this.projectPath(projectId, "/issues/"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Adds a comment to a Plane work item. Comment author is always the API key
   * owner — there is no API field to override it. Original Jira author is
   * preserved in the comment_html prefix at the caller (see migrators/comments.ts).
   */
  async addComment(
    projectId: string,
    workItemId: string,
    payload: { comment_html: string; access?: "EXTERNAL" | "INTERNAL" },
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      this.projectPath(projectId, `/issues/${workItemId}/comments/`),
      {
        method: "POST",
        body: JSON.stringify({ access: "INTERNAL", ...payload }),
      },
    );
  }

  async createCycle(
    _projectId: string,
    _payload: { name: string; start_date: string; end_date: string },
  ): Promise<unknown> {
    throw new Error("PlaneClient.createCycle: not implemented");
  }

  async listModules(projectId: string): Promise<PlaneModule[]> {
    return this.paginatedList<PlaneModule>(this.projectPath(projectId, "/modules/"));
  }

  async createModule(
    projectId: string,
    payload: { name: string; description?: string },
  ): Promise<PlaneModule> {
    return this.request<PlaneModule>(this.projectPath(projectId, "/modules/"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  /**
   * Bulk-add work items to a module. Plane treats this as idempotent — re-adding
   * an already-linked work item is a no-op (returns the existing link record).
   * Caller passes Plane work-item UUIDs, not Jira keys.
   */
  async addWorkItemsToModule(
    projectId: string,
    moduleId: string,
    workItemIds: string[],
  ): Promise<unknown> {
    return this.request<unknown>(
      this.projectPath(projectId, `/modules/${moduleId}/module-issues/`),
      {
        method: "POST",
        body: JSON.stringify({ issues: workItemIds }),
      },
    );
  }

  /**
   * Create a relation between work items on this self-hosted Plane.
   *
   * Like attachments, relations are NOT in the public X-API-Key v1 API — the
   * `issue-relation` endpoint exists only on the internal app API
   * (`/api/workspaces/...`, no `/v1`), which is session-cookie gated and sits
   * behind Cloudflare Bot Management. So this shells out to system `curl` with
   * the browser cookie + Cloudflare-passing headers, same as uploadAttachment.
   *
   * `POST .../issues/{workItemId}/issue-relation/` body `{relation_type, issues}`.
   * Plane stores the relation bidirectionally (creating `blocking` A→B also sets
   * `blocked_by` on B; `relates_to`/`duplicate` are symmetric), so each Jira
   * link should be created exactly once.
   *
   * Throws PlaneRelationError when the cookie is missing or the session/Cloudflare
   * challenge rejects the request, so the caller can fail fast rather than burn
   * through every remaining link with the same error.
   */
  async createRelation(
    projectId: string,
    workItemId: string,
    relationType: string,
    issues: string[],
  ): Promise<{ id: string }> {
    if (!this.cookieHeader) {
      throw new PlaneRelationError(
        "PLANE_COOKIE_HEADER not configured — relations use the cookie-gated internal API",
      );
    }
    const url = `${this.baseUrl}/api/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${workItemId}/issue-relation/`;
    const res = await curl({
      method: "POST",
      url,
      headers: [
        "accept: application/json, text/plain, */*",
        "content-type: application/json",
        ...(this.csrfToken ? [`x-csrftoken: ${this.csrfToken}`] : []),
        `origin: ${this.baseUrl}`,
        `referer: ${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/`,
        "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      ],
      cookie: this.cookieHeader,
      body: JSON.stringify({ relation_type: relationType, issues }),
    });
    if (res.status === 401 || res.status === 403) {
      throw new PlaneRelationError(
        `issue-relation ${res.status} (auth/Cloudflare): refresh PLANE_COOKIE_HEADER from a fresh browser session and re-run`,
      );
    }
    if (!ok2xx(res.status)) {
      throw new Error(`issue-relation ${res.status}: ${res.body.slice(0, 300)}`);
    }
    // Response is the created relation record(s). Best-effort id; fall back to a
    // composite so the manifest entry is still meaningful for verification.
    let id = `${relationType}:${issues[0]}`;
    try {
      const parsed = JSON.parse(res.body);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      if (first?.id) id = String(first.id);
    } catch {
      /* keep composite id */
    }
    return { id };
  }

  /**
   * Upload a file as an attachment on a Plane work item.
   *
   * On this self-hosted Plane the storage backend is wired only to the modern
   * `/api/assets/v2/.../attachments/` endpoint — which (a) is session-cookie
   * gated, not X-API-Key, and (b) sits behind Cloudflare Bot Management that
   * challenges scripted HTTP clients (bun fetch, undici) by TLS fingerprint
   * even with valid cookies. System `curl` passes the challenge.
   *
   * Implementation therefore shells out to `curl` for the 3 cookie-gated
   * steps when `cookieHeader` is configured:
   *   1. POST /api/assets/v2/.../attachments/  → signed S3 upload data + asset_id
   *   2. POST <upload_data.url> multipart/form-data with the file + signed fields
   *   3. PATCH /api/assets/v2/.../attachments/{asset_id}/  → mark as uploaded
   *
   * When `cookieHeader` is empty, throws `PlaneAttachmentStorageError` so the
   * caller falls back to placeholder mode.
   */
  async uploadAttachment(
    projectId: string,
    workItemId: string,
    blob: Blob,
    filename: string,
    mimeType: string,
  ): Promise<{ id: string }> {
    if (!this.cookieHeader) {
      throw new PlaneAttachmentStorageError(
        "PLANE_COOKIE_HEADER not configured — cannot upload via assets/v2 endpoint",
      );
    }

    const size = blob.size;
    const cookie = this.cookieHeader;
    const csrf = this.csrfToken;

    // Step 1: register the asset, get signed S3 upload params.
    const step1Url = `${this.baseUrl}/api/assets/v2/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${workItemId}/attachments/`;
    const step1Body = JSON.stringify({ name: filename, size, type: mimeType });
    const step1Headers = [
      "accept: application/json, text/plain, */*",
      "content-type: application/json",
      ...(csrf ? [`x-csrftoken: ${csrf}`] : []),
      `origin: ${this.baseUrl}`,
      `referer: ${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/`,
      "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    ];
    const step1 = await curl({
      method: "POST",
      url: step1Url,
      headers: step1Headers,
      cookie,
      body: step1Body,
    });
    // 401/403 = session expired or Cloudflare re-challenged the client
    // (cookies/cf_clearance rotated). Treat as backend-down so the migrator
    // trips into placeholder-only mode rather than burning through every
    // remaining attachment with the same failure.
    if (step1.status === 401 || step1.status === 403) {
      throw new PlaneAttachmentStorageError(
        `assets/v2 step 1 ${step1.status} (auth/Cloudflare): refresh PLANE_COOKIE_HEADER from a fresh browser session and re-run`,
      );
    }
    if (step1.status >= 500) {
      throw new PlaneAttachmentStorageError(`assets/v2 step 1 ${step1.status}: ${step1.body.slice(0, 300)}`);
    }
    // 400 covers per-file rejections like "Invalid file type." (Plane refuses
    // HTML/script content for security). Treat as per-file fallback — the
    // next attachment may have a valid mime type.
    if (step1.status === 400) {
      throw new PlaneAttachmentStorageError(
        `assets/v2 step 1 400: ${step1.body.slice(0, 200)}`,
        { backendDown: false },
      );
    }
    if (!ok2xx(step1.status)) {
      throw new Error(`assets/v2 step 1 ${step1.status}: ${step1.body.slice(0, 300)}`);
    }
    const reg = JSON.parse(step1.body) as AssetRegistration;

    // Step 2: upload the binary to S3 with the signed form fields.
    const tmpDir = await mkdtemp(join(tmpdir(), "plane-upload-"));
    const tmpFile = join(tmpDir, filename.replace(/[^A-Za-z0-9._-]/g, "_"));
    try {
      await writeFile(tmpFile, Buffer.from(await blob.arrayBuffer()));
      const uploadForm: Array<[string, string]> = [];
      for (const [k, v] of Object.entries(reg.upload_data.fields)) {
        uploadForm.push([k, String(v)]);
      }
      const step2 = await curl({
        method: "POST",
        url: reg.upload_data.url,
        headers: [
          "accept: application/json, text/plain, */*",
          `origin: ${this.baseUrl}`,
          `referer: ${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/`,
          "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        ],
        cookie,
        form: uploadForm,
        fileField: { name: "file", path: tmpFile, type: mimeType },
      });
      // 413 (nginx body-size limit) → per-file issue; placeholder, don't trip.
      // 5xx → backend-down; placeholder, trip after threshold.
      if (step2.status === 413) {
        throw new PlaneAttachmentStorageError(
          `assets/v2 step 2 413 (file too large for storage): ${step2.body.slice(0, 200)}`,
          { backendDown: false },
        );
      }
      if (step2.status >= 500) {
        throw new PlaneAttachmentStorageError(`assets/v2 step 2 ${step2.status}: ${step2.body.slice(0, 300)}`);
      }
      if (!ok2xx(step2.status)) {
        throw new Error(`assets/v2 step 2 ${step2.status}: ${step2.body.slice(0, 300)}`);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }

    // Step 3: tell Plane the upload completed.
    const step3Url = `${this.baseUrl}/api/assets/v2/workspaces/${this.workspaceSlug}/projects/${projectId}/issues/${workItemId}/attachments/${reg.asset_id}/`;
    const step3 = await curl({
      method: "PATCH",
      url: step3Url,
      headers: [
        "accept: application/json, text/plain, */*",
        "content-type: application/json",
        ...(csrf ? [`x-csrftoken: ${csrf}`] : []),
        `origin: ${this.baseUrl}`,
        `referer: ${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/`,
        "user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      ],
      cookie,
      body: "{}",
    });
    if (!ok2xx(step3.status)) {
      throw new Error(`assets/v2 step 3 ${step3.status}: ${step3.body.slice(0, 300)}`);
    }

    return { id: reg.asset_id };
  }
}

interface AssetRegistration {
  asset_id: string;
  upload_data: {
    url: string;
    fields: Record<string, string>;
  };
  attachment?: { id: string };
}

function ok2xx(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Minimal `curl` subprocess wrapper. Returns parsed status + body. We need
 * curl (not bun fetch) because Cloudflare Bot Management TLS-fingerprints
 * non-browser clients; curl's fingerprint plus a valid `cf_clearance` cookie
 * passes the challenge that defeats fetch/undici.
 */
interface CurlOpts {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  url: string;
  headers: string[];
  cookie?: string;
  /** Raw body string for JSON. Mutually exclusive with `form`. */
  body?: string;
  /** `-F key=value` repeated. Mutually exclusive with `body`. */
  form?: Array<[string, string]>;
  fileField?: { name: string; path: string; type: string };
}
async function curl(opts: CurlOpts): Promise<{ status: number; body: string }> {
  const args = ["-sS", "-o", "-", "-w", "\n__CURL_STATUS__%{http_code}", "-X", opts.method, opts.url];
  for (const h of opts.headers) {
    args.push("-H", h);
  }
  if (opts.cookie) {
    args.push("-b", opts.cookie);
  }
  if (opts.body != null) {
    args.push("--data-raw", opts.body);
  }
  if (opts.form) {
    for (const [k, v] of opts.form) {
      args.push("-F", `${k}=${v}`);
    }
  }
  if (opts.fileField) {
    args.push("-F", `${opts.fileField.name}=@${opts.fileField.path};type=${opts.fileField.type}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => errChunks.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`curl exited ${code}: ${Buffer.concat(errChunks).toString().slice(0, 300)}`));
      }
      const out = Buffer.concat(chunks).toString("utf8");
      const idx = out.lastIndexOf("\n__CURL_STATUS__");
      if (idx < 0) {
        return reject(new Error(`curl output missing status sentinel: ${out.slice(0, 200)}`));
      }
      const status = parseInt(out.slice(idx + "\n__CURL_STATUS__".length).trim(), 10);
      const body = out.slice(0, idx);
      resolve({ status, body });
    });
  });
}

/**
 * 5xx from the Plane attachment endpoint — almost always means the storage
 * backend (S3/MinIO) isn't configured on this self-hosted instance, not a
 * transient network issue. The attachments migrator catches this specifically
 * to switch into placeholder-only mode rather than retrying indefinitely.
 */
/**
 * Raised when the cookie-gated `issue-relation` endpoint can't be reached —
 * missing cookie or an expired session / Cloudflare challenge. The links
 * migrator catches this to abort early instead of failing every remaining link.
 */
export class PlaneRelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaneRelationError";
  }
}

export class PlaneAttachmentStorageError extends Error {
  /** True when the failure indicates the backend itself is unreachable/down,
   *  vs a per-file issue like 413 (file too large) where the next attachment
   *  could still succeed. The migrator uses this to decide whether to trip
   *  into placeholder-only mode for the rest of the run. */
  readonly backendDown: boolean;
  constructor(message: string, opts: { backendDown: boolean } = { backendDown: true }) {
    super(message);
    this.name = "PlaneAttachmentStorageError";
    this.backendDown = opts.backendDown;
  }
}
