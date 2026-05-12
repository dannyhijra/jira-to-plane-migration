import type { UsersConfig } from "../lib/config";

/**
 * Resolve a Jira accountId to a Plane user_id.
 * Returns the fallback user_id if no mapping exists.
 */
export function mapJiraUserToPlaneUser(
  jiraAccountId: string | null | undefined,
  users: UsersConfig,
): { planeUserId: string; isFallback: boolean } {
  if (!jiraAccountId) return { planeUserId: users.fallback_user_id, isFallback: true };
  const mapped = users.users[jiraAccountId];
  if (mapped) return { planeUserId: mapped.plane_user_id, isFallback: false };
  return { planeUserId: users.fallback_user_id, isFallback: true };
}
