import { parseArgs } from "node:util";
import { logger } from "./lib/logger";
import { loadConfig } from "./lib/config";

const HELP = `
jira-to-plane-migration

Usage:
  bun run migrate <command> [options]

Commands:
  inspect          Discover Jira-side info for a project and seed config
  run              Run the migration for a project
  verify           Compare migrated entities across Jira and Plane

Common options:
  --jira-project <KEY>    Jira project key (required for all commands)
  --dry-run               Read but do not write to Plane
  --only <entity>         Limit to one entity type (issues|comments|sprints|epics|attachments|links|projects)
  --batch <N>             Batch size for paginated operations (default 50)
  --limit <N>             Hard cap on items processed
  --resume                Skip items already in state/manifest.jsonl
  --sample <N>            (verify) Random sample size to diff
  --help                  Show this message
`;

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "jira-project": { type: "string" },
      "dry-run": { type: "boolean", default: false },
      only: { type: "string" },
      batch: { type: "string", default: "50" },
      limit: { type: "string" },
      resume: { type: "boolean", default: false },
      sample: { type: "string", default: "20" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  const command = positionals[0];
  const jiraProject = values["jira-project"];

  if (!jiraProject) {
    logger.error("--jira-project is required");
    process.exit(1);
  }

  const config = await loadConfig();
  logger.info(`command=${command} project=${jiraProject} dryRun=${values["dry-run"]}`);

  switch (command) {
    case "inspect":
      logger.info("inspect: not implemented — use the Atlassian MCP in Claude Code for discovery");
      logger.info("Then write findings into config/projects.yaml and config/mappings.yaml.");
      break;

    case "run": {
      const { runMigration } = await import("./migrators/projects");
      await runMigration({
        config,
        jiraProject,
        dryRun: values["dry-run"] ?? false,
        only: values.only,
        batch: parseInt(values.batch ?? "50", 10),
        limit: values.limit ? parseInt(values.limit, 10) : undefined,
        resume: values.resume ?? false,
      });
      break;
    }

    case "verify":
      logger.info("verify: not implemented yet");
      logger.info(`Would sample ${values.sample} items from project ${jiraProject} and diff.`);
      break;

    default:
      logger.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  logger.error("Fatal:", err);
  process.exit(1);
});
