import type { JiraIssue } from '../clients/jira';
import type { MappingsConfig, PropertySeedEntry } from '../lib/config';
import { adfToMarkdown } from '../lib/adf';

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
  propertySeed: PropertySeedEntry[] | undefined
): string {
  const prefix = renderPrefix(inputs);
  const body = adfToMarkdown(issue.fields.description);
  const footer = renderCustomFieldFooter(
    issue,
    mappings,
    jiraProject,
    propertySeed
  );

  return [prefix, body, footer].filter((s) => s.length > 0).join('\n\n');
}

function renderPrefix(inp: PrefixInputs): string {
  const creator = inp.creatorEmail
    ? `\`${inp.creatorEmail}\``
    : inp.creatorDisplayName
      ? `\`${inp.creatorDisplayName}\``
      : '`unknown`';

  const assigneePart = inp.assigneeEmail
    ? `, assigned to \`${inp.assigneeEmail}\``
    : '';

  return `> **Migrated from Jira ${inp.jiraKey}** · Originally created by ${creator}${assigneePart} on ${inp.createdDate}`;
}

export interface ParsedPrefix {
  jiraKey: string;
  /** Inner text of the "created by `...`" code span (email or display name or "unknown"). */
  creator: string;
  /** Email captured in the "assigned to `...`" clause, lowercased. Null if the clause is absent. */
  assigneeEmail: string | null;
}

/**
 * Reverse of {@link renderPrefix}. Parses the migration prefix out of a Plane
 * work item's stored description (markdown OR the rendered description_html —
 * the literal text "Migrated from Jira", backticks, and clause wording survive
 * both). Used by the reassign migrator to recover the original assignee email.
 *
 * Tolerates the html rendering, which wraps the code spans in <code> tags and
 * the bold key in <strong>; the regex keys off the stable literal phrases and
 * the backtick/anything-non-greedy between them, so it matches either form.
 * Returns null when no prefix is present.
 */
export function parseMigrationPrefix(description: string): ParsedPrefix | null {
  // `OPEN`/`CLOSE` accept either a markdown backtick or an html <code>…</code>
  // wrapper around the email spans; the captured text excludes backticks and
  // angle brackets so it stays clean in both renderings.
  const OPEN = '(?:`|<code>)?';
  const CLOSE = '(?:`|</code>)?';
  const re = new RegExp(
    'Migrated from Jira\\s+([A-Z][A-Z0-9]*-\\d+)\\b.*?' +
      'Originally created by\\s+' +
      OPEN +
      '([^`<]+?)' +
      CLOSE +
      '(?:,\\s*assigned to\\s+' +
      OPEN +
      '([^`<]+?)' +
      CLOSE +
      ')?\\s+on\\s+\\d{4}-\\d{2}-\\d{2}',
    's'
  );
  const m = description.match(re);
  if (!m) return null;
  const assignee = (m[3] ?? '').trim().toLowerCase();
  return {
    jiraKey: m[1]!,
    creator: (m[2] ?? '').trim(),
    assigneeEmail: assignee && assignee.includes('@') ? assignee : null
  };
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
  propertySeed: PropertySeedEntry[] | undefined
): string {
  const projectMap = mappings.custom_fields[jiraProject] ?? {};
  const propsByName = new Map((propertySeed ?? []).map((p) => [p.name, p]));
  const lines: string[] = [];

  for (const [fieldId, action] of Object.entries(projectMap)) {
    if (typeof action !== 'string' || !action.startsWith('property:')) continue;
    const raw = issue.fields[fieldId];
    if (raw == null || raw === '') continue;

    const propName = action.slice('property:'.length);
    const seed = propsByName.get(propName);
    const display = seed?.display_name ?? propName;
    lines.push(`- **${display}:** ${formatValue(raw)}`);
  }

  if (lines.length === 0) return '';
  // Mark this block so a future "real properties" migration can find and strip it.
  return ['<!-- migrated-custom-fields -->', ...lines].join('\n');
}

function formatValue(v: unknown): string {
  if (typeof v === 'string') {
    return /^https?:\/\//.test(v) ? `<${v}>` : v;
  }
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    if (obj.type === 'doc' && Array.isArray(obj.content)) {
      return adfToMarkdown(
        obj as unknown as Parameters<typeof adfToMarkdown>[0]
      );
    }
    return String(obj.value ?? obj.name ?? JSON.stringify(obj));
  }
  return String(v);
}
