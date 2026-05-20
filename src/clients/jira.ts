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

export interface JiraAttachment {
  id: string;
  filename: string;
  author?: JiraUser;
  /** ISO timestamp. */
  created: string;
  /** Bytes. */
  size: number;
  mimeType: string;
  /** Authenticated download URL (Jira REST). May 302 to a presigned S3 URL. */
  content: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser | null;
  body: AdfDoc | null;
  created: string;
  updated: string;
}

/**
 * One entry in an issue's `issuelinks` field. Exactly one of `inwardIssue` /
 * `outwardIssue` is populated per entry. The same link `id` appears on both
 * linked issues — use it as the dedup key.
 */
export interface JiraIssueLink {
  id: string;
  type: { id: string; name: string; inward: string; outward: string };
  inwardIssue?: { id: string; key: string };
  outwardIssue?: { id: string; key: string };
}

interface JiraCommentsResponse {
  startAt: number;
  maxResults: number;
  total: number;
  comments: JiraComment[];
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

  /**
   * Paginated GET /rest/api/3/issue/{key}/comment.
   * Orders ASC by created date — preserves the conversation order on Plane.
   */
  async listComments(issueIdOrKey: string, batch = 100): Promise<JiraComment[]> {
    const out: JiraComment[] = [];
    let startAt = 0;
    while (true) {
      const qs = `?startAt=${startAt}&maxResults=${batch}&orderBy=created`;
      const page = await this.request<JiraCommentsResponse>(
        `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/comment${qs}`,
      );
      out.push(...page.comments);
      if (out.length >= page.total || page.comments.length === 0) break;
      startAt += page.comments.length;
    }
    return out;
  }

  /**
   * Jira does not expose a standalone /attachment list endpoint — attachments
   * are returned as a field on the issue itself. We read it back via getIssue.
   */
  async listAttachments(issueIdOrKey: string): Promise<JiraAttachment[]> {
    const issue = await this.getIssue(issueIdOrKey, ["attachment"]);
    return ((issue.fields as { attachment?: JiraAttachment[] }).attachment ?? []) as JiraAttachment[];
  }

  /**
   * Stream the binary contents of a Jira attachment. The `content` URL on the
   * attachment metadata is auth-required and Jira may 302-redirect to a signed
   * S3 URL; we follow redirects with credentials stripped on the second hop
   * (standard fetch behaviour).
   */
  async downloadAttachment(contentUrl: string): Promise<{ blob: Blob; mimeType: string }> {
    return withRetry(async () => {
      const res = await fetch(contentUrl, {
        headers: { Authorization: this.auth, Accept: "*/*" },
        redirect: "follow",
      });
      if (!res.ok) {
        throw new Error(`Jira attachment ${res.status} ${contentUrl}: ${(await res.text()).slice(0, 200)}`);
      }
      const blob = await res.blob();
      const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
      return { blob, mimeType };
    });
  }

  async listSprints(_boardId: number): Promise<unknown[]> {
    throw new Error("JiraClient.listSprints: not implemented");
  }

  async listProjects(): Promise<unknown[]> {
    throw new Error("JiraClient.listProjects: not implemented");
  }
}
