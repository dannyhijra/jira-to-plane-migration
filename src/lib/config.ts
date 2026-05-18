import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export interface Config {
  jira: { baseUrl: string; email: string; apiToken: string };
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
}

export interface StateSeedEntry {
  name: string;
  group: "backlog" | "unstarted" | "started" | "completed" | "cancelled";
  default?: boolean;
}

export interface PropertySeedEntry {
  name: string;
  display_name: string;
  type: "url" | "text" | "number" | "date" | "select" | "multi-select";
  /** Only used when type is "select" / "multi-select". */
  options?: string[];
}

export interface UserEntry {
  email: string | null;
  displayName?: string;
  role?: "member" | "admin" | "guest" | "deactivated";
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
  /** Per-project: jira field id → action ("drop" | "description" | "property:<name>" | "builtin:<field>"). */
  custom_fields: Record<string, Record<string, string>>;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function loadYaml<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return parseYaml(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

export async function loadConfig(): Promise<Config> {
  const projectsFile = await loadYaml<{ projects: Record<string, ProjectConfig> }>(
    "config/projects.yaml",
    { projects: {} },
  );
  const usersFile = await loadYaml<UsersConfig>("config/users.yaml", {
    fallback_user_id: null,
    users: {},
  });
  const mappingsRaw = await loadYaml<Partial<MappingsConfig> | null>("config/mappings.yaml", {});
  const mappingsFile: MappingsConfig = {
    status: (mappingsRaw?.status ?? {}) as Record<string, Record<string, string>>,
    priority: (mappingsRaw?.priority ?? {}) as Record<string, string>,
    labels: (mappingsRaw?.labels ?? {}) as Record<string, string>,
    custom_fields: (mappingsRaw?.custom_fields ?? {}) as Record<string, Record<string, string>>,
  };

  return {
    jira: {
      baseUrl: requireEnv("JIRA_BASE_URL"),
      email: requireEnv("JIRA_EMAIL"),
      apiToken: requireEnv("JIRA_API_TOKEN"),
    },
    plane: {
      baseUrl: requireEnv("PLANE_BASE_URL"),
      apiKey: requireEnv("PLANE_API_KEY"),
      workspaceSlug: requireEnv("PLANE_WORKSPACE_SLUG"),
      cookieHeader: process.env.PLANE_COOKIE_HEADER || undefined,
      csrfToken: process.env.PLANE_CSRF_TOKEN || undefined,
    },
    projects: projectsFile.projects,
    users: usersFile,
    mappings: mappingsFile,
    dryRun: process.env.DRY_RUN === "true",
  };
}
