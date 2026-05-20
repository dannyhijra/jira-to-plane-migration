import { test, expect, afterEach } from "bun:test";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentSession, refreshSession, withSessionRetry } from "./plane-session";

const origCookie = process.env.PLANE_COOKIE_HEADER;
const origCsrf = process.env.PLANE_CSRF_TOKEN;
let tmpDirs: string[] = [];

function tmpFile(name: string, contents: string): string {
  const dir = mkdtempSync(join(tmpdir(), "psess-"));
  tmpDirs.push(dir);
  const file = join(dir, name);
  writeFileSync(file, contents);
  return file;
}

afterEach(() => {
  process.env.PLANE_COOKIE_HEADER = origCookie;
  process.env.PLANE_CSRF_TOKEN = origCsrf;
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
  tmpDirs = [];
});

test("currentSession prefers the session file over env", () => {
  const file = tmpFile("plane-session.json", JSON.stringify({ cookieHeader: "session=FILE", csrfToken: "CSRF_FILE" }));
  process.env.PLANE_COOKIE_HEADER = "session=ENV";
  process.env.PLANE_CSRF_TOKEN = "CSRF_ENV";
  const s = currentSession(file);
  expect(s.cookieHeader).toBe("session=FILE");
  expect(s.csrfToken).toBe("CSRF_FILE");
});

test("currentSession falls back to env when the file is absent", () => {
  process.env.PLANE_COOKIE_HEADER = "session=ENV";
  process.env.PLANE_CSRF_TOKEN = "CSRF_ENV";
  const s = currentSession(join(tmpdir(), "psess-missing-1.json"));
  expect(s.cookieHeader).toBe("session=ENV");
  expect(s.csrfToken).toBe("CSRF_ENV");
});

test("currentSession returns undefined when neither file nor env present", () => {
  delete process.env.PLANE_COOKIE_HEADER;
  delete process.env.PLANE_CSRF_TOKEN;
  const s = currentSession(join(tmpdir(), "psess-missing-2.json"));
  expect(s.cookieHeader).toBeUndefined();
  expect(s.csrfToken).toBeUndefined();
});

test("currentSession falls back to env when the file is present but malformed", () => {
  const file = tmpFile("plane-session.json", "{ this is not valid json");
  process.env.PLANE_COOKIE_HEADER = "session=ENV";
  process.env.PLANE_CSRF_TOKEN = "CSRF_ENV";
  const s = currentSession(file);
  expect(s.cookieHeader).toBe("session=ENV");
  expect(s.csrfToken).toBe("CSRF_ENV");
});

test("refreshSession runs the refresher once for concurrent callers", async () => {
  let calls = 0;
  const runner = () => {
    calls++;
    return new Promise<void>((r) => setTimeout(r, 20));
  };
  // Real file so the assertion proves both callers received the reloaded
  // session from the single run — not just two equal `undefined`s.
  const file = tmpFile(
    "plane-session.json",
    JSON.stringify({ cookieHeader: "session=SINGLE", csrfToken: "CSRF_SINGLE" }),
  );
  const [a, b] = await Promise.all([
    refreshSession(runner, file),
    refreshSession(runner, file),
  ]);
  expect(calls).toBe(1);
  expect(a.cookieHeader).toBe("session=SINGLE");
  expect(b.cookieHeader).toBe("session=SINGLE");
});

test("refreshSession can run again after the previous run settles", async () => {
  let calls = 0;
  const runner = () => {
    calls++;
    return Promise.resolve();
  };
  const dir = mkdtempSync(join(tmpdir(), "psess-"));
  tmpDirs.push(dir);
  const file = join(dir, "missing.json"); // nonexistent within an isolated dir
  await refreshSession(runner, file);
  await refreshSession(runner, file);
  expect(calls).toBe(2);
});

const isAuth = (e: unknown) => e instanceof Error && e.message === "AUTH";

test("withSessionRetry returns first result without refreshing on success", async () => {
  let attempts = 0;
  let refreshes = 0;
  const out = await withSessionRetry(
    async () => {
      attempts++;
      return "ok";
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  expect(out).toBe("ok");
  expect(attempts).toBe(1);
  expect(refreshes).toBe(0);
});

test("withSessionRetry refreshes once and retries on auth failure", async () => {
  let attempts = 0;
  let refreshes = 0;
  const out = await withSessionRetry(
    async () => {
      attempts++;
      if (attempts === 1) throw new Error("AUTH");
      return "ok";
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  expect(out).toBe("ok");
  expect(attempts).toBe(2);
  expect(refreshes).toBe(1);
});

test("withSessionRetry propagates a second auth failure after one retry", async () => {
  let attempts = 0;
  let refreshes = 0;
  const run = withSessionRetry(
    async () => {
      attempts++;
      throw new Error("AUTH");
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  await expect(run).rejects.toThrow("AUTH");
  expect(attempts).toBe(2);
  expect(refreshes).toBe(1);
});

test("withSessionRetry does not refresh on non-auth errors", async () => {
  let attempts = 0;
  let refreshes = 0;
  const run = withSessionRetry(
    async () => {
      attempts++;
      throw new Error("OTHER");
    },
    isAuth,
    async () => {
      refreshes++;
    },
  );
  await expect(run).rejects.toThrow("OTHER");
  expect(attempts).toBe(1);
  expect(refreshes).toBe(0);
});
