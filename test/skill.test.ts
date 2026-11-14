import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import { validate } from "../skills/wcag-audit/scripts/validate-findings.mjs";

const SKILL = path.join(__dirname, "../skills/wcag-audit");
const run = promisify(execFile);

const valid = {
  schemaVersion: 1,
  standard: "WCAG 2.2 AA",
  scope: { paths: ["src"] },
  findings: [
    {
      id: "a1",
      ruleId: "no-div-button",
      verdict: "confirmed",
      title: "Clickable div",
      wcag: ["2.1.1", "4.1.2"],
      severity: "critical",
      confidence: "high",
      source: "static",
      locations: [{ file: "src/A.tsx", line: 3 }],
      evidence: "<div onClick={x}>",
      verification: "Only purchase control; no role or key handler.",
      fix: { status: "applied", summary: "div -> button" },
    },
    {
      id: "a2",
      ruleId: "img-alt-meaningful",
      verdict: "needs_validation",
      title: "Vague alt",
      wcag: ["1.1.1"],
      source: "static",
      locations: [{ file: "src/B.tsx", line: 9 }],
      evidence: '<img alt="photo">',
      question: "What does the hero photo communicate?",
    },
    {
      id: "a3",
      ruleId: "axe/color-contrast",
      verdict: "rejected",
      title: "Contrast",
      wcag: ["1.4.3"],
      source: "runtime",
      locations: [{ url: "http://localhost:3000", selector: ".logo" }],
      evidence: "<span class=logo>",
      verification: "Logotype text is exempt from 1.4.3.",
    },
  ],
};

describe("skill package", () => {
  it("SKILL.md frontmatter follows the Agent Skills spec", async () => {
    const md = await readFile(path.join(SKILL, "SKILL.md"), "utf8");
    const fm = /^---\n([\s\S]*?)\n---\n/.exec(md)?.[1];
    expect(fm).toBeTruthy();
    const name = /^name: (.+)$/m.exec(fm!)?.[1];
    const description = /^description: (.+)$/m.exec(fm!)?.[1];
    const compatibility = /^compatibility: (.+)$/m.exec(fm!)?.[1];
    expect(name).toBe(path.basename(SKILL)); // must match directory name
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(description!.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThanOrEqual(1024);
    expect(compatibility!.length).toBeLessThanOrEqual(500);
    expect(md.split("\n").length).toBeLessThan(500);
  });

  it("every file linked from SKILL.md exists", async () => {
    const md = await readFile(path.join(SKILL, "SKILL.md"), "utf8");
    const links = [...md.matchAll(/\]\(((?:references|assets)\/[^)]+)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(5);
    const refs = await readdir(path.join(SKILL, "references"));
    for (const l of links) {
      if (l.startsWith("references/")) expect(refs).toContain(path.basename(l));
      else await readFile(path.join(SKILL, l), "utf8");
    }
  });

  it("report schema is valid JSON", async () => {
    const schema = JSON.parse(await readFile(path.join(SKILL, "assets/report-schema.json"), "utf8"));
    expect(schema.$defs.finding.required).toContain("verdict");
  });
});

describe("validate-findings.mjs", () => {
  it("accepts a valid report", () => {
    expect(validate(valid)).toEqual([]);
  });

  it("rejects unverified confirmations and applied fixes on needs_validation", () => {
    const bad = structuredClone(valid);
    delete (bad.findings[0] as Record<string, unknown>).verification;
    (bad.findings[1] as Record<string, unknown>).fix = { status: "applied" };
    bad.findings[2]!.wcag = ["1.4"];
    const errors = validate(bad);
    expect(errors.join("\n")).toMatch(/verification/);
    expect(errors.join("\n")).toMatch(/cannot apply a fix/);
    expect(errors.join("\n")).toMatch(/not a success criterion/);
  });

  it("works as a CLI", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "wcag-findings-"));
    const file = path.join(dir, "findings.json");
    await writeFile(file, JSON.stringify(valid));
    const { stdout } = await run("node", [path.join(SKILL, "scripts/validate-findings.mjs"), file]);
    expect(stdout).toContain("valid (1 confirmed, 1 needs_validation, 1 rejected)");
    await writeFile(file, JSON.stringify({ ...valid, schemaVersion: 2 }));
    await expect(run("node", [path.join(SKILL, "scripts/validate-findings.mjs"), file])).rejects.toMatchObject({ code: 1 });
  });
});
