import type { Page } from "playwright-core";
import { fingerprint } from "../static/analyze.js";
import { truncate } from "../static/ast.js";
import type { Finding } from "../types.js";
import { levelFor, understandingUrl } from "../wcag.js";

interface Stop {
  selector: string;
  html: string;
  style: string;
  inModal: boolean;
}

/** Installed in the page: describe the active element and snapshot its focus-relevant styles. */
const PAGE_HELPERS = `
window.__wcagAudit = {
  selectorFor(el) {
    if (!(el instanceof Element)) return "";
    if (el.id && document.querySelectorAll("#" + CSS.escape(el.id)).length === 1) return "#" + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();
      if (cur.id && document.querySelectorAll("#" + CSS.escape(cur.id)).length === 1) { parts.unshift("#" + CSS.escape(cur.id)); break; }
      const parent = cur.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (same.length > 1) part += ":nth-of-type(" + (same.indexOf(cur) + 1) + ")";
      }
      parts.unshift(part);
      cur = parent;
    }
    return parts.join(" > ");
  },
  styleOf(el) {
    const s = getComputedStyle(el);
    const outline = s.outlineStyle === "none" || parseFloat(s.outlineWidth) === 0 ? "none" : s.outlineStyle + " " + s.outlineWidth + " " + s.outlineColor;
    return [outline, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderTopWidth, s.borderBottomWidth, s.backgroundColor, s.color, s.textDecorationLine, s.transform, s.opacity].join("|");
  },
  focusables() {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary, iframe, [contenteditable="true"]';
    return Array.from(document.querySelectorAll(sel)).filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.closest("[inert]");
    }).length;
  },
  stop() {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    return {
      selector: this.selectorFor(el),
      html: el.outerHTML.slice(0, 300),
      style: this.styleOf(el),
      inModal: !!el.closest('[aria-modal="true"], dialog[open]'),
    };
  },
};
`;

export interface KeyboardOptions {
  maxTabs?: number;
}

/**
 * Tab through the page like a keyboard user and detect:
 *  - keyboard traps (WCAG 2.1.2): focus cycles inside a subset of controls and never escapes
 *  - invisible focus (WCAG 2.4.7): focusing an element changes none of its focus-related styles
 */
export async function keyboardAudit(page: Page, url: string, opts: KeyboardOptions = {}): Promise<Finding[]> {
  await page.evaluate(PAGE_HELPERS);
  const total = (await page.evaluate("window.__wcagAudit.focusables()")) as number;
  if (total === 0) return [];
  const maxTabs = opts.maxTabs ?? Math.min(250, total * 2 + 6);

  await page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()");
  await page.mouse.click(1, 1).catch(() => {});
  await page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()");

  const seq: Array<Stop | null> = [];
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    seq.push((await page.evaluate("window.__wcagAudit.stop()")) as Stop | null);
  }

  const findings: Finding[] = [];

  // --- Keyboard trap: the tail of the sequence repeats a short cycle without ever reaching <body>.
  const tail = seq.slice(Math.floor(seq.length / 2));
  const escaped = tail.some((s) => s === null);
  const distinctAll = new Set(seq.filter(Boolean).map((s) => s!.selector));
  const distinctTail = new Set(tail.filter(Boolean).map((s) => s!.selector));
  // The tail is longer than one full Tab cycle. On a healthy page it either passes through <body>
  // or revisits every element seen so far; a trap keeps cycling through a strict subset.
  const stuck = distinctTail.size < distinctAll.size || (distinctTail.size === 1 && total > 1);
  if (!escaped && stuck) {
    const trapped = tail.filter(Boolean) as Stop[];
    if (!trapped.every((s) => s.inModal)) {
      // Verification: try the usual escape hatches and see whether focus is still stuck.
      await page.keyboard.press("Escape");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const after = (await page.evaluate("window.__wcagAudit.stop()")) as Stop | null;
      const stillTrapped = after !== null && distinctTail.has(after.selector);
      if (stillTrapped) {
        const first = trapped[0]!;
        findings.push(
          make("keyboard-trap", url, first, {
            title: "Keyboard focus must not be trapped",
            wcag: ["2.1.2"],
            severity: "critical",
            message: `Tab focus cycles between ${distinctTail.size} element(s) (${[...distinctTail].slice(0, 3).join(", ")}) and never reaches the rest of the page.`,
            fix: "Remove the keydown/blur handler that re-focuses this element, or (for intentional modal dialogs) mark the container role=\"dialog\" aria-modal=\"true\" and close it on Escape.",
          }),
        );
      }
    }
  }

  // --- Focus visible: compare each focused element's style with its unfocused style.
  const unique = new Map<string, Stop>();
  for (const s of seq) if (s && !unique.has(s.selector)) unique.set(s.selector, s);
  await page.evaluate("document.activeElement && document.activeElement.blur && document.activeElement.blur()");
  for (const stop of unique.values()) {
    const blurred = (await page.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(stop.selector)}); return el ? window.__wcagAudit.styleOf(el) : null; })()`,
    )) as string | null;
    if (blurred === null || blurred !== stop.style) continue;
    // Verification: focus it again via keyboard-like focus and re-measure once.
    const refocused = (await page.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(stop.selector)}); if (!el) return null; el.focus({ focusVisible: true }); const s = window.__wcagAudit.styleOf(el); el.blur(); return s; })()`,
    )) as string | null;
    if (refocused !== null && refocused !== blurred) continue;
    findings.push(
      make("focus-visible", url, stop, {
        title: "Keyboard focus must be visible",
        wcag: ["2.4.7"],
        severity: "serious",
        message: "Focusing this element changes no outline, shadow, border, color or background, so keyboard users cannot see where they are.",
        fix: "Do not remove outlines without a replacement. Add e.g. `:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }`.",
        confidence: "medium",
      }),
    );
  }
  return findings;
}

function make(
  ruleId: string,
  url: string,
  stop: Stop,
  f: { title: string; wcag: string[]; severity: Finding["severity"]; message: string; fix: string; confidence?: Finding["confidence"] },
): Finding {
  return {
    id: fingerprint(ruleId, url, stop.selector),
    ruleId,
    source: "keyboard",
    title: f.title,
    wcag: f.wcag,
    level: levelFor(f.wcag),
    severity: f.severity,
    confidence: f.confidence ?? "high",
    location: { url, selector: stop.selector },
    evidence: truncate(stop.html),
    message: f.message,
    fix: f.fix,
    helpUrl: understandingUrl(f.wcag[0]!),
    verified: true,
  };
}
