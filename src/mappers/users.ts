import type { UsersConfig } from "../lib/config";

/**
 * Resolve a Jira accountId to a Plane user_id via the users.yaml mapping.
 * Returns null when there is no Plane user yet (caller falls back to the
 * description-prefix audit per the three-stage user strategy).
 */
export function mapJiraUserToPlaneUser(
  jiraAccountId: string | null | undefined,
  users: UsersConfig,
): { planeUserId: string | null; isFallback: boolean } {
  if (!jiraAccountId) return { planeUserId: users.fallback_user_id, isFallback: true };
  const mapped = users.users[jiraAccountId];
  if (mapped?.plane_user_id) return { planeUserId: mapped.plane_user_id, isFallback: false };
  return { planeUserId: users.fallback_user_id, isFallback: true };
}
