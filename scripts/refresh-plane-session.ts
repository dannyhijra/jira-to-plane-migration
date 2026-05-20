/**
 * Mints/refreshes Plane upload credentials into state/plane-session.json using
 * a persistent Playwright Chromium profile that holds the Google SSO login.
 *
 *   bun scripts/refresh-plane-session.ts --login   # one-time: do Google SSO in a window
 *   bun scripts/refresh-plane-session.ts           # headless: harvest fresh cookies
 *
 * Reads PLANE_BASE_URL and PLANE_WORKSPACE_SLUG from the environment (Bun loads
 * .env automatically). This is the ONLY file that imports Playwright.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PROFILE_DIR = join("state", ".plane-browser");
const SESSION_FILE = join("state", "plane-session.json");

const baseUrl = (process.env.PLANE_BASE_URL ?? "").replace(/\/$/, "");
const slug = process.env.PLANE_WORKSPACE_SLUG ?? "";
if (!baseUrl || !slug) {
  console.error("PLANE_BASE_URL and PLANE_WORKSPACE_SLUG must be set");
  process.exit(1);
}

const loginMode = process.argv.includes("--login");
const homeUrl = `${baseUrl}/${slug}`;

mkdirSync(PROFILE_DIR, { recursive: true });

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: !loginMode,
});
try {
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(homeUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (loginMode) {
    console.error("Complete Google sign-in in the browser window — waiting up to 5 min…");
    await page.waitForURL(`${homeUrl}**`, { timeout: 300_000 });
  } else {
    // Headless: if navigation left the Plane host (e.g. bounced to Google) or
    // landed on a sign-in / auth path, the saved Google session expired and we
    // cannot recover without a human. (Cookie check below is the final backstop.)
    const url = page.url();
    if (!url.startsWith(baseUrl) || /sign-in|accounts\.google\.com|\/login|\/auth/.test(url)) {
      console.error(
        `not logged in (landed on ${url}) — run: bun scripts/refresh-plane-session.ts --login`,
      );
      await ctx.close();
      process.exit(1);
    }
  }

  const cookies = await ctx.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const csrfToken = cookies.find((c) => c.name === "csrftoken")?.value;
  if (!csrfToken && !/session/i.test(cookieHeader)) {
    console.error("no Plane session cookies found after navigation — try --login");
    await ctx.close();
    process.exit(1);
  }

  writeFileSync(
    SESSION_FILE,
    JSON.stringify({ cookieHeader, csrfToken, capturedAt: new Date().toISOString() }, null, 2),
  );
  console.error(`wrote ${SESSION_FILE} (${cookies.length} cookies)`);
} finally {
  await ctx.close();
}
