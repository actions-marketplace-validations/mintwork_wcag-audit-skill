import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scan, verifyReport } from "../src/scan.js";

describe("verify (fix-phase re-check)", () => {
  it("marks fixed findings resolved and catches regressions", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "wcag-audit-"));
    await cp(path.join(__dirname, "fixtures/static/bad/Signup.vue"), path.join(dir, "Signup.vue"));
    const before = await scan("Signup.vue", { cwd: dir });
    expect(before.findings.some((f) => f.ruleId === "img-alt")).toBe(true);

    const file = path.join(dir, "Signup.vue");
    let src = await readFile(file, "utf8");
    src = src.replace('<img :src="logo" />', '<img :src="logo" alt="Acme" />');
    src = src.replace("<h1>Sign up</h1>", '<h1>Sign up</h1>\n    <iframe src="/tos"></iframe>');
    await writeFile(file, src);

    const res = await verifyReport({ scans: [before] }, { cwd: dir });
    expect(res.resolved.map((f) => f.ruleId)).toEqual(["img-alt"]);
    expect(res.remaining.length).toBe(before.findings.length - 1);
    expect(res.introduced.map((f) => f.ruleId)).toEqual(["iframe-title"]);
  });
});
