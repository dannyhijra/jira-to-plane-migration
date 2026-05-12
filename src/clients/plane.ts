import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";

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
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Plane ${res.status} ${path}: ${body.slice(0, 500)}`);
      }
      // Some endpoints return 204
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    });
  }

  private workspacePath(suffix: string): string {
    return `/api/v1/workspaces/${this.workspaceSlug}${suffix}`;
  }

  // TODO: implement
  async listProjects(): Promise<unknown[]> {
    throw new Error("PlaneClient.listProjects: not implemented");
  }

  // TODO: implement
  async createProject(_payload: { name: string; identifier: string }): Promise<unknown> {
    throw new Error("PlaneClient.createProject: not implemented");
  }

  // TODO: implement
  async createWorkItem(_projectId: string, _payload: Record<string, unknown>): Promise<unknown> {
    throw new Error("PlaneClient.createWorkItem: not implemented");
  }

  // TODO: implement
  async addComment(
    _projectId: string,
    _workItemId: string,
    _payload: { comment_html: string; actor: string },
  ): Promise<unknown> {
    throw new Error("PlaneClient.addComment: not implemented");
  }

  // TODO: implement
  async createCycle(
    _projectId: string,
    _payload: { name: string; start_date: string; end_date: string },
  ): Promise<unknown> {
    throw new Error("PlaneClient.createCycle: not implemented");
  }

  // TODO: implement
  async createModule(_projectId: string, _payload: { name: string }): Promise<unknown> {
    throw new Error("PlaneClient.createModule: not implemented");
  }
}
