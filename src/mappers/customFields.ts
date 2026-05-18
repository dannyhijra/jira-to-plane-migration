import type { MappingsConfig } from "../lib/config";

export type BuiltinField = "start_date" | "target_date";

export type CustomFieldAction =
  | { kind: "drop" }
  | { kind: "description" }
  | { kind: "property"; name: string }
  | { kind: "builtin"; field: BuiltinField };

const BUILTIN_FIELDS: ReadonlySet<BuiltinField> = new Set<BuiltinField>(["start_date", "target_date"]);

/**
 * Decide what to do with a Jira custom field for a given project.
 * Action format in YAML:
 *   "drop"
 *   "description"
 *   "property:<name>"
 *   "builtin:<start_date|target_date>"
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
  if (raw.startsWith("builtin:")) {
    const field = raw.slice("builtin:".length) as BuiltinField;
    if (BUILTIN_FIELDS.has(field)) return { kind: "builtin", field };
  }
  return { kind: "drop" };
}

/**
 * All field ids referenced in a project's custom_fields mapping, regardless of
 * action. The issues migrator uses this to ask Jira for exactly the fields it
 * will read — keeping the search payload tight as more projects come online.
 */
export function customFieldIds(mappings: MappingsConfig, jiraProject: string): string[] {
  return Object.keys(mappings.custom_fields[jiraProject] ?? {});
}
