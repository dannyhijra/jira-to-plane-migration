import type { MappingsConfig } from "../lib/config";

export type PlanePriority = "urgent" | "high" | "medium" | "low" | "none";

const VALID: Set<PlanePriority> = new Set(["urgent", "high", "medium", "low", "none"]);

export function mapJiraPriorityToPlanePriority(
  jiraPriority: string | null | undefined,
  mappings: MappingsConfig,
): PlanePriority {
  if (!jiraPriority) return "none";
  const mapped = mappings.priority[jiraPriority];
  if (mapped && VALID.has(mapped as PlanePriority)) return mapped as PlanePriority;
  return "none";
}
