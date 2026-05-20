// One-off discovery aggregator for Jira project INFRA.
// Pages all issues via JiraClient, aggregates the facts the discovery doc needs.
import { loadConfig } from "../src/lib/config";
import { JiraClient } from "../src/clients/jira";

const PROJECT = "INFRA";
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

// 2. Page all issues with the fields we need + every custom field.
const wanted = [
  "summary", "status", "issuetype", "priority", "labels",
  "assignee", "creator", "reporter", "created", "updated", "parent",
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
const byPriority: Record<string, number> = {};
const byLabel: Record<string, number> = {};
const cfNonNull: Record<string, { count: number; samples: string[] }> = {};
const users: Record<string, { displayName: string; email?: string; created: number; assigned: number; reported: number }> = {};
const epics: { key: string; summary: string }[] = [];
let withParent = 0;
let withDescription = 0;

const note = (u: any, role: "created" | "assigned" | "reported") => {
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
  byPriority[f.priority?.name ?? "(none)"] = (byPriority[f.priority?.name ?? "(none)"] ?? 0) + 1;
  for (const l of f.labels ?? []) byLabel[l] = (byLabel[l] ?? 0) + 1;
  if (type === "Epic") epics.push({ key: it.key, summary: f.summary });
  if (f.parent) withParent++;
  if (f.description) withDescription++;
  note(f.creator, "created");
  note(f.assignee, "assigned");
  note(f.reporter, "reported");
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
  byType: sortDesc(byType),
  byStatus: sortDesc(byStatus),
  byPriority: sortDesc(byPriority),
  byLabel: sortDesc(byLabel),
  withParent,
  withDescription,
  epicsCount: epics.length,
  epicsSample: epics.slice(0, 8),
  customFields: Object.entries(cfNonNull)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, v]) => ({ id, name: cfMeta[id]?.name, type: cfMeta[id]?.type, count: v.count, samples: v.samples })),
  users: Object.entries(users)
    .map(([accountId, v]) => ({ accountId, ...v, total: v.created + v.assigned + v.reported }))
    .sort((a, b) => b.total - a.total),
}, null, 2));
