// One-off discovery aggregator for Jira project IHH (IT Hijra Helpdesk).
// Pages all issues via JiraClient in a single sweep, aggregating every fact the
// discovery doc needs -- including comment/attachment counts (returned inline by
// the search endpoint), issue links, and sub-task parent types -- to avoid
// thousands of per-issue calls.
import { loadConfig } from "../src/lib/config";
import { JiraClient } from "../src/clients/jira";

const PROJECT = "IHH";
const config = await loadConfig();
const jira = new JiraClient(config);

// 1. Field catalogue: id -> {name, type} for custom fields.
const fieldList = (await (jira as any).request("/rest/api/3/field")) as any[];
const customFields = fieldList.filter((f) => typeof f.id === "string" && f.id.startsWith("customfield_"));
const cfMeta: Record<string, { name: string; type: string }> = {};
for (const f of customFields) {
  cfMeta[f.id] = { name: f.name, type: f.schema?.type ?? "unknown" };
}
const cfIds = customFields.map((f) => f.id);

// 2. Page all issues with everything we need + every custom field.
const wanted = [
  "summary", "description", "status", "issuetype", "priority", "labels",
  "assignee", "creator", "reporter", "created", "updated", "parent",
  "issuelinks", "comment", "attachment", "subtasks",
  ...cfIds,
];
const issues: any[] = [];
let token: string | undefined;
let pages = 0;
do {
  const page = await jira.searchIssues({
    jql: `project = ${PROJECT} ORDER BY created ASC`,
    fields: wanted,
    nextPageToken: token,
    pageSize: 100,
  });
  issues.push(...page.issues);
  token = page.nextPageToken;
  pages++;
} while (token);

// 3. Aggregations.
const byType: Record<string, number> = {};
const byStatus: Record<string, number> = {};
const byStatusCategory: Record<string, number> = {};
const byPriority: Record<string, number> = {};
const byLabel: Record<string, number> = {};
const cfNonNull: Record<string, { count: number; samples: string[] }> = {};
const users: Record<string, { displayName: string; email?: string; created: number; assigned: number; reported: number }> = {};
const commentAuthors: Record<string, { displayName: string; email?: string; count: number }> = {};
const epics: { key: string; summary: string }[] = [];
const linkTypes: Record<string, number> = {};
const subtaskParentTypes: Record<string, number> = {};
const attachMime: Record<string, number> = {};
const attachExt: Record<string, number> = {};
let withParent = 0;
let withDescription = 0;
let commentsTotal = 0;
let issuesWithComments = 0;
let attachmentsTotal = 0;
let issuesWithAttachments = 0;
let issuesWithLinks = 0;
let linkEnds = 0;

const noteUser = (u: any, role: "created" | "assigned" | "reported") => {
  if (!u || !u.accountId) return;
  const e = (users[u.accountId] ??= { displayName: u.displayName, email: u.emailAddress, created: 0, assigned: 0, reported: 0 });
  if (u.emailAddress) e.email = u.emailAddress;
  e[role]++;
};

const sampleVal = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    if (Array.isArray(v)) return v.map(sampleVal).filter(Boolean).join("; ").slice(0, 80);
    return (v.value ?? v.name ?? v.displayName ?? v.key ?? JSON.stringify(v)).toString().slice(0, 80);
  }
  return String(v).slice(0, 80);
};

for (const it of issues) {
  const f = it.fields;
  const type = f.issuetype?.name ?? "(none)";
  byType[type] = (byType[type] ?? 0) + 1;
  byStatus[f.status?.name ?? "(none)"] = (byStatus[f.status?.name ?? "(none)"] ?? 0) + 1;
  byStatusCategory[f.status?.statusCategory?.name ?? "(none)"] = (byStatusCategory[f.status?.statusCategory?.name ?? "(none)"] ?? 0) + 1;
  byPriority[f.priority?.name ?? "(none)"] = (byPriority[f.priority?.name ?? "(none)"] ?? 0) + 1;
  for (const l of f.labels ?? []) byLabel[l] = (byLabel[l] ?? 0) + 1;
  if (type === "Epic") epics.push({ key: it.key, summary: f.summary });
  if (f.parent) {
    withParent++;
    if (f.issuetype?.subtask) {
      const pt = f.parent?.fields?.issuetype?.name ?? "(unknown)";
      subtaskParentTypes[pt] = (subtaskParentTypes[pt] ?? 0) + 1;
    }
  }
  if (f.description) withDescription++;
  noteUser(f.creator, "created");
  noteUser(f.assignee, "assigned");
  noteUser(f.reporter, "reported");

  // Comments (search returns {comments:[...capped], total}).
  const c = f.comment;
  if (c && typeof c.total === "number") {
    commentsTotal += c.total;
    if (c.total > 0) issuesWithComments++;
    for (const cm of c.comments ?? []) {
      const a = cm.author;
      if (a?.accountId) {
        const e = (commentAuthors[a.accountId] ??= { displayName: a.displayName, email: a.emailAddress, count: 0 });
        if (a.emailAddress) e.email = a.emailAddress;
        e.count++;
      }
    }
  }

  // Attachments (search returns the full array).
  const att = f.attachment;
  if (Array.isArray(att) && att.length) {
    attachmentsTotal += att.length;
    issuesWithAttachments++;
    for (const a of att) {
      const mime = a.mimeType ?? "(none)";
      attachMime[mime] = (attachMime[mime] ?? 0) + 1;
      const m = /\.([A-Za-z0-9]+)$/.exec(a.filename ?? "");
      const ext = m ? m[1].toLowerCase() : "(none)";
      attachExt[ext] = (attachExt[ext] ?? 0) + 1;
    }
  }

  // Issue links.
  const links = f.issuelinks;
  if (Array.isArray(links) && links.length) {
    issuesWithLinks++;
    for (const l of links) {
      linkEnds++;
      const name = l.type?.name ?? "(unknown)";
      linkTypes[name] = (linkTypes[name] ?? 0) + 1;
    }
  }

  // Custom fields with non-null values.
  for (const id of cfIds) {
    const v = f[id];
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    const e = (cfNonNull[id] ??= { count: 0, samples: [] });
    e.count++;
    const s = sampleVal(v);
    if (s && e.samples.length < 3 && !e.samples.includes(s)) e.samples.push(s);
  }
}

const sortDesc = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  total: issues.length,
  pages,
  keyRange: [issues[0]?.key, issues[issues.length - 1]?.key],
  createdRange: [issues[0]?.fields?.created, issues[issues.length - 1]?.fields?.created],
  byType: sortDesc(byType),
  byStatus: sortDesc(byStatus),
  byStatusCategory: sortDesc(byStatusCategory),
  byPriority: sortDesc(byPriority),
  byLabel: sortDesc(byLabel),
  withParent,
  withDescription,
  subtaskParentTypes: sortDesc(subtaskParentTypes),
  epicsCount: epics.length,
  epicsSample: epics.slice(-8).reverse(),
  comments: { total: commentsTotal, issuesWithComments },
  attachments: { total: attachmentsTotal, issuesWithAttachments, byMime: sortDesc(attachMime), byExt: sortDesc(attachExt) },
  links: { issuesWithLinks, linkEnds, byType: sortDesc(linkTypes) },
  customFields: Object.entries(cfNonNull)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, v]) => ({ id, name: cfMeta[id]?.name, type: cfMeta[id]?.type, count: v.count, samples: v.samples })),
  creators: Object.entries(users)
    .filter(([, v]) => v.created > 0)
    .map(([accountId, v]) => ({ accountId, displayName: v.displayName, email: v.email, created: v.created }))
    .sort((a, b) => b.created - a.created),
  assignees: Object.entries(users)
    .filter(([, v]) => v.assigned > 0)
    .map(([accountId, v]) => ({ accountId, displayName: v.displayName, email: v.email, assigned: v.assigned }))
    .sort((a, b) => b.assigned - a.assigned),
  commentAuthors: Object.entries(commentAuthors)
    .map(([accountId, v]) => ({ accountId, displayName: v.displayName, email: v.email, count: v.count }))
    .sort((a, b) => b.count - a.count),
}, null, 2));
