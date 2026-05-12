import type { MappingsConfig } from "../lib/config";

export type PlaneStateGroup = "backlog" | "unstarted" | "started" | "completed" | "cancelled";

const VALID: Set<PlaneStateGroup> = new Set(["backlog", "unstarted", "started", "completed", "cancelled"]);

/**
 * Map a Jira status name to a Plane state group.
 * Falls back to "unstarted" if no explicit mapping is found.
 */
export function mapJiraStatusToPlaneState(
  jiraStatus: string,
  mappings: MappingsConfig,
): PlaneStateGroup {
  const mapped = mappings.status[jiraStatus];
  if (mapped && VALID.has(mapped as PlaneStateGroup)) return mapped as PlaneStateGroup;
  return "unstarted";
}
