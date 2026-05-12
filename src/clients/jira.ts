import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";

export class JiraClient {
  private readonly baseUrl: string;
  private readonly auth: string;

  constructor(config: Config) {
    this.baseUrl = config.jira.baseUrl.replace(/\/$/, "");
    const creds = `${config.jira.email}:${config.jira.apiToken}`;
    this.auth = "Basic " + Buffer.from(creds).toString("base64");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    return withRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: this.auth,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Jira ${res.status} ${path}: ${body.slice(0, 500)}`);
      }
      return res.json() as Promise<T>;
    });
  }

  // TODO: implement when wiring up `projects` migrator
  async listProjects(): Promise<unknown[]> {
    throw new Error("JiraClient.listProjects: not implemented");
  }

  // TODO: implement — use /rest/api/3/search/jql with nextPageToken pagination
  async searchIssues(_jql: string, _nextPageToken?: string): Promise<unknown> {
    throw new Error("JiraClient.searchIssues: not implemented");
  }

  // TODO: implement
  async getIssue(_key: string): Promise<unknown> {
    throw new Error("JiraClient.getIssue: not implemented");
  }

  // TODO: implement
  async listComments(_issueIdOrKey: string): Promise<unknown[]> {
    throw new Error("JiraClient.listComments: not implemented");
  }

  // TODO: implement
  async listAttachments(_issueIdOrKey: string): Promise<unknown[]> {
    throw new Error("JiraClient.listAttachments: not implemented");
  }

  // TODO: implement — sprints come from the Agile API: /rest/agile/1.0/board/{boardId}/sprint
  async listSprints(_boardId: number): Promise<unknown[]> {
    throw new Error("JiraClient.listSprints: not implemented");
  }
}
