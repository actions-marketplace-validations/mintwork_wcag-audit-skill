#!/usr/bin/env node
// Zero-dependency validator for .wcag-audit/findings.json (see ../assets/report-schema.json).
// Usage: node validate-findings.mjs <findings.json>
// Exit codes: 0 valid, 1 invalid, 2 usage / unreadable file.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const VERDICTS = ["confirmed", "needs_validation", "rejected"];
const SEVERITIES = ["critical", "serious", "moderate", "minor"];
const CONFIDENCE = ["high", "medium"];
const SOURCES = ["static", "runtime", "keyboard", "manual"];
const LEVELS = ["A", "AA", "AAA"];
const FIX_STATUS = ["applied", "proposed", "not_applicable", "blocked"];
const WCAG_RE = /^\d\.\d\.\d{1,2}$/;

export function validate(doc) {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  const str = (v) => typeof v === "string" && v.trim().length > 0;

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["$: must be an object"];
  if (doc.schemaVersion !== 1) err("$.schemaVersion", "must be 1");
  if (!str(doc.standard)) err("$.standard", 'required, e.g. "WCAG 2.2 AA"');
  if (!doc.scope || typeof doc.scope !== "object") err("$.scope", "required object with paths and/or urls");
  if (!Array.isArray(doc.findings)) {
    err("$.findings", "must be an array");
    return errors;
  }
  const ids = new Set();
  doc.findings.forEach((f, i) => {
    const p = `$.findings[${i}]`;
    if (!f || typeof f !== "object") return err(p, "must be an object");
    for (const k of ["id", "ruleId", "title", "evidence"]) if (!str(f[k])) err(`${p}.${k}`, "required non-empty string");
    if (str(f.id)) {
      if (ids.has(f.id)) err(`${p}.id`, `duplicate id "${f.id}"`);
      ids.add(f.id);
    }
    if (!VERDICTS.includes(f.verdict)) err(`${p}.verdict`, `must be one of ${VERDICTS.join(", ")}`);
    if (!Array.isArray(f.wcag)) err(`${p}.wcag`, 'required array like ["1.1.1"] (empty only for best-practice)');
    else f.wcag.forEach((w, j) => !WCAG_RE.test(w) && err(`${p}.wcag[${j}]`, `"${w}" is not a success criterion like 1.4.3`));
    if (f.level !== undefined && !LEVELS.includes(f.level)) err(`${p}.level`, `must be one of ${LEVELS.join(", ")}`);
    if (f.severity !== undefined && !SEVERITIES.includes(f.severity)) err(`${p}.severity`, `must be one of ${SEVERITIES.join(", ")}`);
    if (f.confidence !== undefined && !CONFIDENCE.includes(f.confidence))
      err(`${p}.confidence`, `must be high or medium (lower confidence means verdict needs_validation)`);
    if (!SOURCES.includes(f.source)) err(`${p}.source`, `must be one of ${SOURCES.join(", ")}`);
    if (!Array.isArray(f.locations) || f.locations.length === 0) err(`${p}.locations`, "required non-empty array");
    else
      f.locations.forEach((l, j) => {
        const lp = `${p}.locations[${j}]`;
        if (!l || (!str(l.file) && !str(l.url))) return err(lp, "needs file or url");
        if (l.line !== undefined && !(Number.isInteger(l.line) && l.line >= 1)) err(`${lp}.line`, "must be a positive integer");
      });
    if (f.fix !== undefined) {
      if (!f.fix || !FIX_STATUS.includes(f.fix.status)) err(`${p}.fix.status`, `must be one of ${FIX_STATUS.join(", ")}`);
    }
    if (f.verdict === "confirmed") {
      if (!f.severity) err(`${p}.severity`, "required for confirmed findings");
      if (!f.confidence) err(`${p}.confidence`, "required for confirmed findings");
      if (!str(f.verification)) err(`${p}.verification`, "confirmed findings must state how they were verified");
      if (!f.fix) err(`${p}.fix`, "confirmed findings need a fix object (status applied/proposed/blocked)");
    }
    if (f.verdict === "rejected" && !str(f.verification)) err(`${p}.verification`, "rejected findings must state why they were disproved");
    if (f.verdict === "needs_validation") {
      if (!str(f.question)) err(`${p}.question`, "needs_validation findings must ask the user an exact question");
      if (f.fix?.status === "applied") err(`${p}.fix.status`, "cannot apply a fix to an unverified finding");
    }
  });
  return errors;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: validate-findings.mjs <findings.json>");
    process.exit(2);
  }
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const errors = validate(doc);
  if (errors.length) {
    console.error(`${file}: ${errors.length} problem(s)`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  const c = (v) => doc.findings.filter((f) => f.verdict === v).length;
  console.log(`${file}: valid (${c("confirmed")} confirmed, ${c("needs_validation")} needs_validation, ${c("rejected")} rejected)`);
}
