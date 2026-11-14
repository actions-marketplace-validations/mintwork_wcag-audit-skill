import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatJson, formatSarif, formatText } from "../src/report/index.js";
import { scanStatic } from "../src/static/analyze.js";

const BAD = path.join(__dirname, "fixtures/static/bad");

describe("reporters", async () => {
  const result = await scanStatic(BAD, { cwd: path.join(__dirname, "..") });

  it("JSON report has a summary and findings", () => {
    const json = JSON.parse(formatJson([result]));
    expect(json.version).toBe(1);
    expect(json.summary.total).toBe(result.findings.length);
    expect(json.summary.critical).toBeGreaterThan(0);
    expect(json.scans[0].findings[0]).toHaveProperty("wcag");
  });

  it("SARIF 2.1.0 is well-formed for GitHub code scanning", () => {
    const sarif = JSON.parse(formatSarif([result]));
    expect(sarif.version).toBe("2.1.0");
    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe("wcag-audit-skill");
    expect(run.results.length).toBe(result.findings.length);
    for (const r of run.results) {
      expect(run.tool.driver.rules[r.ruleIndex].id).toBe(r.ruleId);
      expect(["error", "warning", "note"]).toContain(r.level);
      const loc = r.locations[0].physicalLocation;
      expect(loc.artifactLocation.uri).toMatch(/^test\/fixtures\/static\/bad\//);
      expect(loc.region.startLine).toBeGreaterThan(0);
      expect(r.partialFingerprints["wcagAuditFinding/v1"]).toBeTruthy();
    }
    expect(run.tool.driver.rules.every((r: { properties: { tags: string[] } }) => r.properties.tags.includes("accessibility"))).toBe(true);
  });

  it("text report lists location, WCAG and fix", () => {
    const text = formatText([result]);
    expect(text).toContain("test/fixtures/static/bad/page.html:10:3");
    expect(text).toContain("WCAG 1.1.1 Non-text Content");
    expect(text).toContain("fix:");
  });
});
