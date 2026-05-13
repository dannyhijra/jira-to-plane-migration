import type { UsersConfig } from "../lib/config";
import type { PlaneProjectMember } from "../clients/plane";

/**
 * Build a Plane email→user_id lookup from a list of project members.
 * All keys are lowercased for case-insensitive resolution.
 */
export function buildPlaneMemberLookup(members: PlaneProjectMember[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const member of members) {
    if (!member.email) continue;
    m.set(member.email.trim().toLowerCase(), member.id);
  }
  return m;
}

/**
 * Resolve a Jira accountId → Plane user_id by:
 *   accountId → email (from users.yaml) → Plane user_id (from member lookup)
 *
 * Returns { planeUserId, email } where `planeUserId` is null when the user
 * has not joined Plane yet — callers leave `assignees: []` and capture the
 * email in the description prefix per the three-stage user strategy.
 */
export function resolveJiraAssignee(
  jiraAccountId: string | null | undefined,
  users: UsersConfig,
  planeMembers: Map<string, string>,
): { planeUserId: string | null; email: string | null; deactivated: boolean } {
  if (!jiraAccountId) return { planeUserId: null, email: null, deactivated: false };

  const entry = users.users[jiraAccountId];
  const email = entry?.email ?? null;
  const deactivated = entry?.role === "deactivated";

  if (!email || deactivated) return { planeUserId: null, email, deactivated };
  const planeUserId = planeMembers.get(email.toLowerCase()) ?? null;
  return { planeUserId, email, deactivated: false };
}
