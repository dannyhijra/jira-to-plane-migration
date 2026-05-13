import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export interface Config {
  jira: { baseUrl: string; email: string; apiToken: string };
  plane: { baseUrl: string; apiKey: string; workspaceSlug: string };
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
  status: Record<string, string>;
  priority: Record<string, string>;
  labels: Record<string, string>;
  custom_fields: Record<string, string>;
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
  const mappingsFile = await loadYaml<MappingsConfig>("config/mappings.yaml", {
    status: {},
    priority: {},
    labels: {},
    custom_fields: {},
  });

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
    },
    projects: projectsFile.projects,
    users: usersFile,
    mappings: mappingsFile,
    dryRun: process.env.DRY_RUN === "true",
  };
}
