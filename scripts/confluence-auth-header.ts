// Print the Confluence/Jira HTTP Basic auth header value, for pasting into the
// n8n workflow's Config node `confAuth` field (base64 of email:api_token).
// Same Atlassian API token as JIRA_API_TOKEN — one token covers Jira + Confluence.
// Run: bun run scripts/confluence-auth-header.ts
import { loadConfig } from "../src/lib/config";

const c = await loadConfig();
console.log("Basic " + Buffer.from(`${c.jira.email}:${c.jira.apiToken}`).toString("base64"));
