import type { Config } from '../lib/config';

export type Entity =
  | 'project'
  | 'work_item'
  | 'comment'
  | 'cycle'
  | 'module'
  | 'attachment'
  | 'link'
  | 'reassign';

export type ManifestStatus = 'ok' | 'failed' | 'skipped';

export interface ManifestEntry {
  /** Unique key from Jira side, e.g. "ENG-123" for issues, "ENG" for projects */
  jira_key: string;
  /** Resulting Plane resource ID, if successful */
  plane_id?: string;
  entity: Entity;
  status: ManifestStatus;
  /** Project this entry belongs to (Jira project key) */
  project: string;
  /** When this entry was written */
  at: string;
  /** Error message if status is "failed" */
  error?: string;
  /** Optional notes (e.g. "user mapping missing, used fallback") */
  notes?: string;
}

export interface MigrationContext {
  config: Config;
  jiraProject: string;
  dryRun: boolean;
  /** Limit migration to a single entity type (matches CLI --only flag) */
  only?: string;
  batch: number;
  limit?: number;
  resume: boolean;
  /**
   * Backfill mode: re-render existing items only. MUST NOT create work items —
   * a missing or non-ok manifest entry is skipped, never created. Prevents the
   * duplicate-creation failure mode when re-running after partial failures.
   */
  backfill?: boolean;
}

export interface MigrationResult {
  ok: boolean;
  migrated: number;
  skipped: number;
  failed: number;
  notes?: string;
}
