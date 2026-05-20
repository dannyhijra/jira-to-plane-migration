/**
 * Map a Jira issue-link type to a Plane relation type.
 *
 * Plane relation types (from the internal `issue-relation` API):
 *   blocking | blocked_by | duplicate | relates_to |
 *   start_after | start_before | finish_after | finish_before
 *
 * Direction matters only for asymmetric types. `direction` is "outward" when the
 * linked issue sits in Jira's `outwardIssue` slot (this issue → other), "inward"
 * when it sits in `inwardIssue` (other → this issue).
 *
 * Anything we don't explicitly recognise (notably Jira "Cloners", which has no
 * Plane equivalent) maps to the symmetric `relates_to` — the safe, honest choice.
 */
export type PlaneRelationType =
  | "blocking"
  | "blocked_by"
  | "duplicate"
  | "relates_to"
  | "start_after"
  | "start_before"
  | "finish_after"
  | "finish_before";

export function mapJiraLinkToPlaneRelation(
  typeName: string,
  direction: "inward" | "outward",
): PlaneRelationType {
  const t = typeName.trim().toLowerCase();

  // "Blocks" / "Dependency": outward = this blocks other; inward = this is blocked by other.
  if (t === "blocks" || t === "blocker" || t === "blocking" || t === "dependency" || t === "depends") {
    return direction === "outward" ? "blocking" : "blocked_by";
  }

  // "Duplicate" is symmetric in Plane (single `duplicate` bucket).
  if (t === "duplicate" || t === "duplicates" || t === "duplicid") {
    return "duplicate";
  }

  // "Cloners", "Relates", "Relate", and anything unrecognised → relates_to.
  return "relates_to";
}
