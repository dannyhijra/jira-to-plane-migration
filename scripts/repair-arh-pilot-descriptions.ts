import { loadConfig } from "../src/lib/config";
import { JiraClient } from "../src/clients/jira";
import { buildDescription } from "../src/mappers/description";

const env = await Bun.file(".env").text();
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const cfg = await loadConfig();
const jira = new JiraClient(cfg);
const projId = "ef603ac8-09d4-413f-ab6e-b9aea65af65a";
const ws = process.env.PLANE_WORKSPACE_SLUG || "hijra";
const planeKey = process.env.PLANE_API_KEY!;
const planeBase = process.env.PLANE_BASE_URL!;

const items: [string, string][] = [
  ["ARH-8",  "2550a164-7345-465b-8e78-4bca5e6a7499"],
  ["ARH-9",  "aab365dc-6e0a-4691-b1b2-3a10fb7ad8ff"],
  ["ARH-10", "cbc9f41d-2869-4668-aab2-eea7fa895a1b"],
  ["ARH-11", "a3234b66-d68c-40d5-9ddb-51da5c973f89"],
  ["ARH-12", "821f0537-4ace-4319-8662-f5a1e06b6b68"],
];

for (const [jk, pid] of items) {
  const issue = await jira.getIssue(jk);
  const md = buildDescription(issue, {
    jiraKey: issue.key,
    creatorEmail: issue.fields.creator?.emailAddress ?? null,
    creatorDisplayName: issue.fields.creator?.displayName ?? null,
    assigneeEmail: issue.fields.assignee?.emailAddress ?? null,
    createdDate: (issue.fields.created ?? "").slice(0, 10),
  }, cfg.mappings, "ARH", cfg.projects.ARH.properties);
  // Mirror src/migrators/issues.ts wrapAsHtml: neutralise raw HTML tags only,
  // keep markdown chars literal so /migrate-reassign can still parse the prefix.
  const safe = md.replace(/<(\/?[a-zA-Z][^>]*)>/g, "&lt;$1&gt;");
  const html = `<p>${safe}</p>`;
  const r = await fetch(`${planeBase}/api/v1/workspaces/${ws}/projects/${projId}/issues/${pid}/`, {
    method: "PATCH",
    headers: { "X-API-Key": planeKey, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ description_html: html }),
  });
  console.log(jk, r.status, r.ok ? "OK" : await r.text());
}
