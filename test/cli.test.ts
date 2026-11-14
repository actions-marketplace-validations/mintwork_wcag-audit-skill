import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "dist/cli.js");

const PLAIN_ENV = { ...process.env, FORCE_COLOR: undefined, NO_COLOR: undefined };

async function cli(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return cliEnv(PLAIN_ENV, ...args);
}

async function cliEnv(env: NodeJS.ProcessEnv, ...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run("node", [CLI, ...args], { cwd: ROOT, env });
    return { code: 0, stdout, stderr };
  } catch (e) {
    const err = e as { code: number; stdout: string; stderr: string };
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

describe.skipIf(!existsSync(CLI))("CLI (requires `npm run build`)", () => {
  it("exits 1 with findings and 0 when clean", async () => {
    expect((await cli("scan", "test/fixtures/static/bad")).code).toBe(1);
    expect((await cli("scan", "test/fixtures/static/good")).code).toBe(0);
  });

  it("colors only for a TTY or FORCE_COLOR, never with NO_COLOR", async () => {
    const target = "test/fixtures/static/good";
    expect((await cli("scan", target)).stdout).not.toContain("\x1b[");
    expect((await cliEnv({ ...PLAIN_ENV, FORCE_COLOR: "1" }, "scan", target)).stdout).toContain("\x1b[32m");
    expect((await cliEnv({ ...PLAIN_ENV, FORCE_COLOR: "0" }, "scan", target)).stdout).not.toContain("\x1b[");
    expect((await cliEnv({ ...PLAIN_ENV, FORCE_COLOR: "1", NO_COLOR: "1" }, "scan", target)).stdout).not.toContain("\x1b[");
  });

  it("--fail-on controls the exit threshold", async () => {
    expect((await cli("scan", "test/fixtures/static/bad", "--fail-on", "none")).code).toBe(0);
    expect((await cli("scan", "test/fixtures/static/bad/page.html", "--rules", "heading-order", "--fail-on", "serious")).code).toBe(0);
  });

  it("--json and --sarif emit parseable output", async () => {
    const j = JSON.parse((await cli("scan", "test/fixtures/static/bad", "--json")).stdout);
    expect(j.summary.total).toBeGreaterThan(20);
    const s = JSON.parse((await cli("scan", "test/fixtures/static/bad", "--sarif")).stdout);
    expect(s.version).toBe("2.1.0");
  });

  it("rules command lists every rule", async () => {
    const r = await cli("rules", "--json");
    expect(JSON.parse(r.stdout).length).toBeGreaterThan(20);
  });

  it("reports usage errors with exit code 2", async () => {
    expect((await cli("scan")).code).toBe(2);
    expect((await cli("scan", "does/not/exist")).code).toBe(2);
    expect((await cli("frobnicate")).code).toBe(2);
  });
});
