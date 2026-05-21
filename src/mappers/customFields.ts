import type { MappingsConfig } from "../lib/config";
import type { JiraIssue } from "../clients/jira";

export type BuiltinField = "start_date" | "target_date";

export type CustomFieldAction =
  | { kind: "drop" }
  | { kind: "description" }
  | { kind: "property"; name: string }
  | { kind: "builtin"; field: BuiltinField }
  | { kind: "label"; prefix: string };

const BUILTIN_FIELDS: ReadonlySet<BuiltinField> = new Set<BuiltinField>(["start_date", "target_date"]);

/**
 * Decide what to do with a Jira custom field for a given project.
 * Action format in YAML:
 *   "drop"
 *   "description"
 *   "property:<name>"
 *   "builtin:<start_date|target_date>"
 *   "label:<prefix>"   (multi-select → one label per option, named "<prefix><value>")
 */
export function customFieldAction(
  jiraFieldId: string,
  mappings: MappingsConfig,
  jiraProject: string,
): CustomFieldAction {
  const raw = mappings.custom_fields[jiraProject]?.[jiraFieldId];
  if (!raw || raw === "drop") return { kind: "drop" };
  if (raw === "description") return { kind: "description" };
  if (raw.startsWith("property:")) return { kind: "property", name: raw.slice("property:".length) };
  if (raw.startsWith("label:")) return { kind: "label", prefix: raw.slice("label:".length) };
  if (raw.startsWith("builtin:")) {
    const field = raw.slice("builtin:".length) as BuiltinField;
    if (BUILTIN_FIELDS.has(field)) return { kind: "builtin", field };
  }
  return { kind: "drop" };
}

/**
 * Expand custom fields configured as `label:<prefix>` into Plane label names.
 * Reads the raw Jira field (single-/multi-select → array of `{ value }`, or a
 * bare value) and emits "<prefix><value>" per option. Empty/null fields yield
 * nothing. The migrator resolves these names to label ids and skips any that
 * aren't pre-seeded on the project.
 */
export function collectFieldLabels(
  issue: JiraIssue,
  mappings: MappingsConfig,
  jiraProject: string,
): string[] {
  const out: string[] = [];
  const projectMap = mappings.custom_fields[jiraProject] ?? {};
  for (const fieldId of Object.keys(projectMap)) {
    const action = customFieldAction(fieldId, mappings, jiraProject);
    if (action.kind !== "label") continue;
    for (const value of selectValues(issue.fields[fieldId])) {
      out.push(`${action.prefix}${value}`);
    }
  }
  return out;
}

/** Normalise a Jira select / multi-select field to its string option value(s). */
function selectValues(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  const one = (el: unknown): string => {
    if (el && typeof el === "object") return String((el as { value?: unknown }).value ?? "");
    return String(el ?? "");
  };
  const vals = Array.isArray(raw) ? raw.map(one) : [one(raw)];
  return vals.filter((v) => v.length > 0);
}

/**
 * All field ids referenced in a project's custom_fields mapping, regardless of
 * action. The issues migrator uses this to ask Jira for exactly the fields it
 * will read — keeping the search payload tight as more projects come online.
 */
export function customFieldIds(mappings: MappingsConfig, jiraProject: string): string[] {
  return Object.keys(mappings.custom_fields[jiraProject] ?? {});
}
