import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const ROOT = path.join(__dirname, "..");
const CLI = path.join(ROOT, "dist/cli.js");

async function cli(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run("node", [CLI, ...args], { cwd: ROOT });
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
