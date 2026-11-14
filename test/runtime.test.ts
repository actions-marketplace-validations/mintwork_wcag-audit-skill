import { readFile } from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchBrowser } from "../src/runtime/browser.js";
import { scanUrl } from "../src/runtime/scan-url.js";

const FIX = path.join(__dirname, "fixtures/runtime");
let server: http.Server;
let base = "";
let browserOk = true;

beforeAll(async () => {
  try {
    const b = await launchBrowser();
    await b.close();
  } catch (e) {
    browserOk = false;
    console.warn(`[runtime tests skipped] ${(e as Error).message.split("\n")[0]}`);
  }
  server = http.createServer(async (req, res) => {
    try {
      const body = await readFile(path.join(FIX, path.basename(req.url ?? "")));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("runtime scan (Playwright + axe-core)", () => {
  it("finds known violations on a served page, including keyboard issues", async (ctx) => {
    if (!browserOk) ctx.skip();
    const r = await scanUrl(`${base}/bad.html`);
    const ids = new Set(r.findings.map((f) => f.ruleId));
    for (const id of ["axe/image-alt", "axe/label", "axe/color-contrast", "axe/html-has-lang", "axe/document-title", "keyboard-trap", "focus-visible"]) {
      expect(ids, id).toContain(id);
    }
    const contrast = r.findings.find((f) => f.ruleId === "axe/color-contrast")!;
    expect(contrast.wcag).toEqual(["1.4.3"]);
    expect(contrast.location.selector).toBeTruthy();
    expect(contrast.verified).toBe(true);
    expect(r.findings.find((f) => f.ruleId === "keyboard-trap")!.location.selector).toBe("#trap");
  });

  it("reports nothing on the clean page", async (ctx) => {
    if (!browserOk) ctx.skip();
    const r = await scanUrl(`${base}/good.html`);
    expect(r.findings).toEqual([]);
  });
});
