import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export interface Config {
  jira: { baseUrl: string; email: string; apiToken: string };
  /** Confluence lives on the same Atlassian site under `/wiki`. Page enumeration
   * uses the Jira API token (Basic auth). The native PDF export endpoint
   * (`flyingpdf`) is session-gated, so it needs a browser cookie header —
   * same operational pattern as `plane.cookieHeader`. */
  confluence: { baseUrl: string; cookieHeader?: string };
  /** Google Drive upload target for the Confluence→Drive PDF pipeline. All
   * fields optional so unrelated commands load without these env vars set.
   * Obtain the refresh token once via scripts/google-auth.ts. */
  google: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    driveFolderId?: string;
    /** Set only when the destination folder lives on a Shared Drive. */
    sharedDriveId?: string;
  };
  plane: {
    baseUrl: string;
    apiKey: string;
    workspaceSlug: string;
    /** Optional: full `Cookie:` header from a browser session. Required only
     * for attachment uploads via the cookie-gated `/api/assets/v2/` endpoint. */
    cookieHeader?: string;
    csrfToken?: string;
  };
  projects: Record<string, ProjectConfig>;
  users: UsersConfig;
  mappings: MappingsConfig;
  dryRun: boolean;
  sync: {
    overlapMinutes: number;
    jiraTimezone: string;
    notifyWebhookUrl: string | null;
  };
}

export interface ProjectConfig {
  plane_project_name: string;
  plane_project_identifier: string;
  create_if_missing: boolean;
  migrate_entities: string[];
  /** States to ensure exist on the target project. Order matters for sequencing. */
  state_seed?: StateSeedEntry[];
  /** Labels to ensure exist on the target project. */
  label_seed?: string[];
  /** Custom work-item properties to ensure exist (best effort — requires Plane issue types). */
  properties?: PropertySeedEntry[];
  /** Modules to ensure exist on the target project. Per-issue assignment lives in the modules migrator. */
  module_seed?: string[];
  /**
   * If set, the modules migrator routes each work item to the module whose
   * name matches the value of this Jira field (e.g. `customfield_10421` →
   * `PKS` / `NDA` / `MOU PAYUNG` on LRP). Issues with a null/unknown value
   * are left unassigned.
   */
  modules_from_field?: string;
  /**
   * If true, Jira epics are ALSO migrated as work items (tagged via
   * `issue_type_labels`) instead of being excluded when the `epics` entity turns
   * them into modules. The epic then survives as a work item (description +
   * comments) AND seeds a module for its children.
   */
  epics_as_work_items?: boolean;
  /**
   * If true, sub-tasks (Jira `issuetype.subtask`) get their Plane `parent` set to
   * the migrated parent work item in a post-pass after all issues migrate.
   */
  link_subtasks?: boolean;
}

export interface StateSeedEntry {
  name: string;
  group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
  default?: boolean;
}

export interface PropertySeedEntry {
  name: string;
  display_name: string;
  type: 'url' | 'text' | 'number' | 'date' | 'select' | 'multi-select';
  /** Only used when type is "select" / "multi-select". */
  options?: string[];
}

export interface UserEntry {
  email: string | null;
  displayName?: string;
  role?: 'member' | 'admin' | 'guest' | 'deactivated';
  plane_user_id?: string;
}

export interface UsersConfig {
  fallback_user_id: string | null;
  users: Record<string, UserEntry>;
}

export interface MappingsConfig {
  /** Per-project: jira status name → plane state name. */
  status: Record<string, Record<string, string>>;
  priority: Record<string, string>;
  labels: Record<string, string>;
  /** Per-project: jira field id → action ("drop" | "description" | "property:<name>" | "builtin:<field>" | "label:<prefix>"). */
  custom_fields: Record<string, Record<string, string>>;
  /** Per-project: jira issue type name → plane label to apply (work-item type preservation). */
  issue_type_labels: Record<string, Record<string, string>>;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function loadYaml<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, 'utf8');
    return parseYaml(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function loadConfig(): Promise<Config> {
  const projectsFile = await loadYaml<{
    projects: Record<string, ProjectConfig>;
  }>('config/projects.yaml', { projects: {} });
  const usersFile = await loadYaml<UsersConfig>('config/users.yaml', {
    fallback_user_id: null,
    users: {}
  });
  const mappingsRaw = await loadYaml<Partial<MappingsConfig> | null>(
    'config/mappings.yaml',
    {}
  );
  const mappingsFile: MappingsConfig = {
    status: (mappingsRaw?.status ?? {}) as Record<
      string,
      Record<string, string>
    >,
    priority: (mappingsRaw?.priority ?? {}) as Record<string, string>,
    labels: (mappingsRaw?.labels ?? {}) as Record<string, string>,
    custom_fields: (mappingsRaw?.custom_fields ?? {}) as Record<
      string,
      Record<string, string>
    >,
    issue_type_labels: (mappingsRaw?.issue_type_labels ?? {}) as Record<
      string,
      Record<string, string>
    >
  };

  const jiraBaseUrl = requireEnv('JIRA_BASE_URL');
  return {
    jira: {
      baseUrl: jiraBaseUrl,
      email: requireEnv('JIRA_EMAIL'),
      apiToken: requireEnv('JIRA_API_TOKEN')
    },
    confluence: {
      // Same site as Jira; Confluence is served under /wiki. Override-able.
      baseUrl: (process.env.CONFLUENCE_BASE_URL || `${jiraBaseUrl.replace(/\/$/, '')}/wiki`),
      cookieHeader: process.env.CONFLUENCE_COOKIE_HEADER || undefined
    },
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || undefined,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || undefined,
      refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN || undefined,
      driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || undefined,
      sharedDriveId: process.env.GOOGLE_DRIVE_ID || undefined
    },
    plane: {
      baseUrl: requireEnv('PLANE_BASE_URL'),
      apiKey: requireEnv('PLANE_API_KEY'),
      workspaceSlug: requireEnv('PLANE_WORKSPACE_SLUG'),
      cookieHeader: process.env.PLANE_COOKIE_HEADER || undefined,
      csrfToken: process.env.PLANE_CSRF_TOKEN || undefined
    },
    projects: projectsFile.projects,
    users: usersFile,
    mappings: mappingsFile,
    dryRun: process.env.DRY_RUN === 'true',
    sync: {
      overlapMinutes: parseInt(process.env.SYNC_OVERLAP_MINUTES ?? '5', 10),
      jiraTimezone: process.env.JIRA_TIMEZONE ?? 'Asia/Jakarta',
      notifyWebhookUrl: process.env.NOTIFY_WEBHOOK_URL || null
    }
  };
}
