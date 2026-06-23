#!/usr/bin/env bun
// One-time Google OAuth helper: runs the installed-app loopback flow to obtain a
// long-lived refresh token, saves it to .env (GOOGLE_OAUTH_REFRESH_TOKEN), then
// confirms a trivial Drive files.list works.
//
// Prereq: create an OAuth client of type "Desktop app" in Google Cloud Console
// and put its id/secret in .env (GOOGLE_OAUTH_CLIENT_ID / _SECRET). Desktop-app
// clients permit http://localhost loopback redirects on any port.
//
// Scope: defaults to drive.file (the app can only touch files it creates — fine
// when the destination folder is created by this app). If uploading into a
// pre-existing folder 404s/403s, re-run with `--scope drive` for full access.
//
// Usage:
//   bun run scripts/google-auth.ts                 # drive.file scope, port 53682
//   bun run scripts/google-auth.ts --scope drive   # full Drive scope
//   bun run scripts/google-auth.ts --port 8975
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadConfig } from "../src/lib/config";
import { GoogleDriveClient } from "../src/clients/googleDrive";
import { logger } from "../src/lib/logger";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ENV_FILE = ".env";

function parseArgs(argv: string[]): { scope: string; port: number } {
  let scope = "https://www.googleapis.com/auth/drive.file";
  let port = 53682;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--scope") {
      const v = argv[++i];
      scope = v === "drive" ? "https://www.googleapis.com/auth/drive" : v === "drive.file" ? scope : v;
    } else if (argv[i] === "--port") {
      port = parseInt(argv[++i] ?? "53682", 10);
    } else {
      throw new Error(`Unknown flag: ${argv[i]}`);
    }
  }
  return { scope, port };
}

/** Replace or append a KEY=value line in .env (creating the file if needed). */
async function upsertEnv(key: string, value: string): Promise<void> {
  let raw = "";
  try {
    raw = await readFile(ENV_FILE, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(raw)) raw = raw.replace(re, line);
  else raw = raw.replace(/\n?$/, "\n") + line + "\n";
  await writeFile(ENV_FILE, raw);
}

/** Wait for the single OAuth redirect, return the authorization code. */
function awaitCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = Bun.serve({
      port,
      fetch(req) {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) {
          reject(new Error(`OAuth consent denied: ${error}`));
          queueMicrotask(() => server.stop());
          return new Response(`Authorization failed: ${error}. You can close this tab.`, { status: 400 });
        }
        if (code) {
          resolve(code);
          queueMicrotask(() => server.stop());
          return new Response("Authorization complete. You can close this tab and return to the terminal.");
        }
        return new Response("Waiting for OAuth redirect…");
      },
    });
    logger.info(`listening for OAuth redirect on http://localhost:${port}`);
  });
}

async function main() {
  const { scope, port } = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const { clientId, clientSecret } = config.google;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not set in .env — " +
        "create a Desktop-app OAuth client in Google Cloud Console first.",
    );
  }

  const redirectUri = `http://localhost:${port}`;
  const consent =
    `${AUTH_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      access_type: "offline", // ask for a refresh token
      prompt: "consent", // force a fresh refresh token even on re-auth
    });

  logger.info(`scope: ${scope}`);
  logger.info("Opening the consent page in your browser. If it doesn't open, paste this URL:");
  // eslint-disable-next-line no-console
  console.log("\n" + consent + "\n");
  // Best-effort open on macOS; harmless if it fails.
  try {
    spawn("open", [consent], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* user can paste the URL manually */
  }

  const code = await awaitCode(port);
  logger.info("received authorization code; exchanging for tokens…");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Token exchange ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { refresh_token?: string; access_token: string };
  if (!json.refresh_token) {
    throw new Error(
      "No refresh_token returned. Revoke the app's access at " +
        "https://myaccount.google.com/permissions and re-run (prompt=consent forces a fresh one).",
    );
  }

  await upsertEnv("GOOGLE_OAUTH_REFRESH_TOKEN", json.refresh_token);
  logger.info(`saved GOOGLE_OAUTH_REFRESH_TOKEN to ${ENV_FILE}`);

  // Confirm the token actually works against Drive.
  const drive = new GoogleDriveClient({ clientId, clientSecret, refreshToken: json.refresh_token });
  await drive.whoamiCheck();
  logger.info("✓ Drive files.list succeeded — auth is working. You can now run confluence-pdf-to-drive.ts.");
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
