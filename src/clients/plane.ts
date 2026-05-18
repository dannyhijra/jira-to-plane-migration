import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";

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

  constructor(config: Config) {
    this.baseUrl = config.plane.baseUrl.replace(/\/$/, "");
    this.workspaceSlug = config.plane.workspaceSlug;
    this.apiKey = config.plane.apiKey;
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

  async addComment(
    _projectId: string,
    _workItemId: string,
    _payload: { comment_html: string; actor: string },
  ): Promise<unknown> {
    throw new Error("PlaneClient.addComment: not implemented");
  }

  async createCycle(
    _projectId: string,
    _payload: { name: string; start_date: string; end_date: string },
  ): Promise<unknown> {
    throw new Error("PlaneClient.createCycle: not implemented");
  }

  async createModule(_projectId: string, _payload: { name: string }): Promise<unknown> {
    throw new Error("PlaneClient.createModule: not implemented");
  }
}
