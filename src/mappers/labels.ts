import type { MappingsConfig } from "../lib/config";

/**
 * Map a Jira label to a Plane label name. Unmapped labels pass through unchanged.
 */
export function mapJiraLabel(jiraLabel: string, mappings: MappingsConfig): string {
  return mappings.labels[jiraLabel] ?? jiraLabel;
}

export function mapJiraLabels(jiraLabels: string[], mappings: MappingsConfig): string[] {
  return jiraLabels.map((l) => mapJiraLabel(l, mappings));
}

/**
 * Map a Jira issue type name to a Plane label (work-item type preservation),
 * per the project's `issue_type_labels` config. Returns undefined when the type
 * has no mapping (then no type label is applied).
 */
export function mapIssueTypeToLabel(
  issueTypeName: string,
  mappings: MappingsConfig,
  jiraProject: string,
): string | undefined {
  return mappings.issue_type_labels?.[jiraProject]?.[issueTypeName];
}
