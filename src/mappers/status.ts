import type { MappingsConfig } from "../lib/config";

export type PlaneStateGroup = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

/**
 * Resolve a Jira status name to a Plane state NAME for the given project.
 * Returns null if no explicit mapping exists; callers fall back to a default
 * state group on the target Plane project.
 */
export function mapJiraStatusToPlaneState(
  jiraStatus: string,
  mappings: MappingsConfig,
  jiraProject: string,
): string | null {
  return mappings.status[jiraProject]?.[jiraStatus] ?? null;
}
