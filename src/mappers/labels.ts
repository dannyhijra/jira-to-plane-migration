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
