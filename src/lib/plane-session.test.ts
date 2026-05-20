import { test, expect, afterEach } from "bun:test";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { currentSession } from "./plane-session";

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
