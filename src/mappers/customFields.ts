import type { MappingsConfig } from "../lib/config";

export type CustomFieldAction =
  | { kind: "drop" }
  | { kind: "description" }
  | { kind: "property"; name: string };

/**
 * Decide what to do with a Jira custom field based on mapping config.
 * Action format in YAML: "drop" | "description" | "property:Story Points"
 */
export function customFieldAction(
  jiraFieldId: string,
  mappings: MappingsConfig,
): CustomFieldAction {
  const raw = mappings.custom_fields[jiraFieldId];
  if (!raw || raw === "drop") return { kind: "drop" };
  if (raw === "description") return { kind: "description" };
  if (raw.startsWith("property:")) return { kind: "property", name: raw.slice("property:".length) };
  return { kind: "drop" };
}
