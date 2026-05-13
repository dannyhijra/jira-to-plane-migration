import type { Config } from "../lib/config";
import { withRetry } from "../lib/retry";

/** Subset of Jira fields we depend on. Extra unknown fields pass through. */
export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active?: boolean;
}

export interface AdfDoc {
  type: "doc";
  version: number;
  content: AdfNode[];
}

export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: AdfDoc | null;
    issuetype: { name: string };
    status: { name: string };
    priority: { name: string } | null;
    labels: string[];
    assignee: JiraUser | null;
    creator: JiraUser | null;
    reporter: JiraUser | null;
    created: string;
    updated: string;
    [customField: string]: unknown;
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  nextPageToken?: string;
}

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

  /**
   * JQL search via /rest/api/3/search/jql (the new endpoint; /search is deprecated).
   * Returns the page plus a token to fetch the next page. The token is undefined on the last page.
   */
  async searchIssues(args: {
    jql: string;
    fields: string[];
    nextPageToken?: string;
    pageSize?: number;
  }): Promise<JiraSearchResponse> {
    const body = {
      jql: args.jql,
      fields: args.fields,
      maxResults: args.pageSize ?? 50,
      ...(args.nextPageToken ? { nextPageToken: args.nextPageToken } : {}),
    };
    return this.request<JiraSearchResponse>("/rest/api/3/search/jql", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getIssue(key: string, fields?: string[]): Promise<JiraIssue> {
    const qs = fields && fields.length ? `?fields=${encodeURIComponent(fields.join(","))}` : "";
    return this.request<JiraIssue>(`/rest/api/3/issue/${encodeURIComponent(key)}${qs}`);
  }

  // Implemented when /migrate-implement comments runs.
  async listComments(_issueIdOrKey: string): Promise<unknown[]> {
    throw new Error("JiraClient.listComments: not implemented");
  }

  async listAttachments(_issueIdOrKey: string): Promise<unknown[]> {
    throw new Error("JiraClient.listAttachments: not implemented");
  }

  async listSprints(_boardId: number): Promise<unknown[]> {
    throw new Error("JiraClient.listSprints: not implemented");
  }

  async listProjects(): Promise<unknown[]> {
    throw new Error("JiraClient.listProjects: not implemented");
  }
}
