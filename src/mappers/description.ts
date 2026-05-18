import type { JiraIssue } from "../clients/jira";
import type { MappingsConfig, PropertySeedEntry } from "../lib/config";
import { adfToMarkdown } from "../lib/adf";

export interface PrefixInputs {
  jiraKey: string;
  creatorEmail: string | null;
  creatorDisplayName: string | null;
  assigneeEmail: string | null;
  /** Original Jira creation date. YYYY-MM-DD. */
  createdDate: string;
}

/**
 * Build the description body Plane will store:
 *   <migration prefix block>
 *
 *   <original ADF rendered to markdown>
 *
 *   <appended custom-field footer if any "property:*" fields can't be created as real Plane properties>
 *
 * The prefix is machine-parseable by /migrate-reassign — keep the format stable.
 */
export function buildDescription(
  issue: JiraIssue,
  inputs: PrefixInputs,
  mappings: MappingsConfig,
  jiraProject: string,
  propertySeed: PropertySeedEntry[] | undefined,
): string {
  const prefix = renderPrefix(inputs);
  const body = adfToMarkdown(issue.fields.description);
  const footer = renderCustomFieldFooter(issue, mappings, jiraProject, propertySeed);

  return [prefix, body, footer].filter((s) => s.length > 0).join("\n\n");
}

function renderPrefix(inp: PrefixInputs): string {
  const creator = inp.creatorEmail
    ? `\`${inp.creatorEmail}\``
    : inp.creatorDisplayName
    ? `\`${inp.creatorDisplayName}\``
    : "`unknown`";

  const assigneePart = inp.assigneeEmail ? `, assigned to \`${inp.assigneeEmail}\`` : "";

  return `> **Migrated from Jira ${inp.jiraKey}** · Originally created by ${creator}${assigneePart} on ${inp.createdDate}`;
}

/**
 * Custom fields configured as `property:*` should ideally become real Plane
 * work-item properties, but the property system requires the project to have
 * issue types enabled — not the case on this Plane instance. As a fallback we
 * append the value to the description so the data is preserved.
 *
 * `builtin:*` and `drop` entries are intentionally not surfaced here.
 */
function renderCustomFieldFooter(
  issue: JiraIssue,
  mappings: MappingsConfig,
  jiraProject: string,
  propertySeed: PropertySeedEntry[] | undefined,
): string {
  const projectMap = mappings.custom_fields[jiraProject] ?? {};
  const propsByName = new Map((propertySeed ?? []).map((p) => [p.name, p]));
  const lines: string[] = [];

  for (const [fieldId, action] of Object.entries(projectMap)) {
    if (typeof action !== "string" || !action.startsWith("property:")) continue;
    const raw = issue.fields[fieldId];
    if (raw == null || raw === "") continue;

    const propName = action.slice("property:".length);
    const seed = propsByName.get(propName);
    const display = seed?.display_name ?? propName;
    lines.push(`- **${display}:** ${formatValue(raw)}`);
  }

  if (lines.length === 0) return "";
  // Mark this block so a future "real properties" migration can find and strip it.
  return ["<!-- migrated-custom-fields -->", ...lines].join("\n");
}

function formatValue(v: unknown): string {
  if (typeof v === "string") {
    return /^https?:\/\//.test(v) ? `<${v}>` : v;
  }
  if (Array.isArray(v)) return v.map(formatValue).join(", ");
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      return adfToMarkdown(obj as Parameters<typeof adfToMarkdown>[0]);
    }
    return String(obj.value ?? obj.name ?? JSON.stringify(obj));
  }
  return String(v);
}
