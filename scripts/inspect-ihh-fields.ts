// Deeper inspection of IHH custom fields to settle discovery decisions:
//  - For the 5 ADF-blob fields: how many issues hold REAL text vs empty-ADF, + samples.
//  - For the option/string metadata fields: full value distribution.
import { loadConfig } from "../src/lib/config";
import { JiraClient } from "../src/clients/jira";
import { adfToMarkdown } from "../src/lib/adf";

const PROJECT = "IHH";
const config = await loadConfig();
const jira = new JiraClient(config);

const ADF_FIELDS: Record<string, string> = {
  customfield_10094: "Steps to Reproduce",
  customfield_10095: "Expected vs Actual Results",
  customfield_10146: "Requirement",
  customfield_10103: "Reason",
  customfield_10164: "Impact Reason",
};
const OPTION_FIELDS: Record<string, string> = {
  customfield_10131: "Hijra App User Type",
  customfield_10132: "SLA Information",
  customfield_10139: "ticket_source",
  customfield_10191: "Tribe/Stream",
  customfield_10192: "Type Of Request",
};

const wanted = ["summary", ...Object.keys(ADF_FIELDS), ...Object.keys(OPTION_FIELDS)];

const issues: any[] = [];
let token: string | undefined;
do {
  const page = await jira.searchIssues({ jql: `project = ${PROJECT} ORDER BY created ASC`, fields: wanted, nextPageToken: token, pageSize: 100 });
  issues.push(...page.issues);
  token = page.nextPageToken;
} while (token);

// ADF fields: real-text vs empty + normalized-text frequency (to expose boilerplate).
const adfStats: Record<string, { nonNull: number; realText: number; samples: string[]; freq: Record<string, number> }> = {};
for (const id of Object.keys(ADF_FIELDS)) adfStats[id] = { nonNull: 0, realText: 0, samples: [], freq: {} };

const optionDist: Record<string, Record<string, number>> = {};
for (const id of Object.keys(OPTION_FIELDS)) optionDist[id] = {};

const optVal = (v: any): string => {
  if (v == null) return "(null)";
  if (typeof v === "object") return String(v.value ?? v.name ?? JSON.stringify(v));
  return String(v);
};

for (const it of issues) {
  const f = it.fields;
  for (const id of Object.keys(ADF_FIELDS)) {
    const v = f[id];
    if (v == null) continue;
    adfStats[id].nonNull++;
    const md = adfToMarkdown(v).trim();
    if (md.length > 0) {
      adfStats[id].realText++;
      const norm = md.replace(/\s+/g, " ").slice(0, 100);
      adfStats[id].freq[norm] = (adfStats[id].freq[norm] ?? 0) + 1;
    }
  }
  for (const id of Object.keys(OPTION_FIELDS)) {
    const v = f[id];
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    const key = Array.isArray(v) ? v.map(optVal).join("|") : optVal(v);
    optionDist[id][key] = (optionDist[id][key] ?? 0) + 1;
  }
}

console.log("=== ADF fields: real-text vs empty (of total " + issues.length + ") ===");
for (const [id, name] of Object.entries(ADF_FIELDS)) {
  const s = adfStats[id];
  const freq = Object.entries(s.freq).sort((a, b) => b[1] - a[1]);
  const topN = freq[0]?.[1] ?? 0;
  console.log(`\n${name} (${id}): nonNull=${s.nonNull}, distinct-texts=${freq.length}, most-common appears ${topN}× (= boilerplate if high)`);
  for (const [txt, n] of freq.slice(0, 4)) console.log(`   ${n.toString().padStart(5)}×  ${txt}`);
  if (freq.length > 4) console.log(`   … +${freq.length - 4} other distinct texts (the real-content tail)`);
}

console.log("\n=== Option/string fields: value distribution ===");
for (const [id, name] of Object.entries(OPTION_FIELDS)) {
  const dist = Object.entries(optionDist[id]).sort((a, b) => b[1] - a[1]);
  const distinct = dist.length;
  console.log(`\n${name} (${id}): ${distinct} distinct values`);
  for (const [val, n] of dist.slice(0, 12)) console.log(`   ${n.toString().padStart(5)}  ${val}`);
  if (distinct > 12) console.log(`   … +${distinct - 12} more`);
}
