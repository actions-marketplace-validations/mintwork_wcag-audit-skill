import type { Attr, ElementNode } from "./ast.js";

export type Tri = "yes" | "no" | "unknown";

export function attr(el: ElementNode, name: string): Attr | undefined {
  return el.attrs.get(name);
}

export function has(el: ElementNode, name: string): boolean {
  return el.attrs.has(name);
}

/** Static attribute value, or undefined if missing or dynamic. */
export function sv(el: ElementNode, name: string): string | undefined {
  const a = el.attrs.get(name);
  return a && !a.dynamic && a.value !== null ? a.value : undefined;
}

export function isDynamic(el: ElementNode, name: string): boolean {
  return el.attrs.get(name)?.dynamic === true;
}

/** Missing for sure: not present, and no spread that could supply it. */
export function definitelyMissing(el: ElementNode, name: string): boolean {
  return !el.attrs.has(name) && !el.hasSpread;
}

export function roleOf(el: ElementNode): string | undefined {
  return sv(el, "role")?.trim().split(/\s+/)[0]?.toLowerCase();
}

export function isAriaHidden(el: ElementNode): boolean {
  return sv(el, "aria-hidden") === "true" || has(el, "hidden");
}

/** True if a non-empty name attribute exists (aria-label, aria-labelledby, title) or is dynamic. */
export function nameFromAttrs(el: ElementNode): Tri {
  for (const n of ["aria-label", "aria-labelledby", "title"]) {
    const a = el.attrs.get(n);
    if (!a) continue;
    if (a.dynamic) return "unknown";
    if (a.value && a.value.trim()) return "yes";
  }
  return el.hasSpread ? "unknown" : "no";
}

/** Approximates whether the element's subtree contributes an accessible name. */
export function nameFromContent(el: ElementNode): Tri {
  let result: Tri = "no";
  for (const c of el.children) {
    if (c.type === "text") {
      if (c.dynamic) result = "unknown";
      else if (c.text.trim()) return "yes";
      continue;
    }
    if (isAriaHidden(c)) continue;
    if (c.isComponent) {
      result = "unknown";
      continue;
    }
    if (c.tag === "img" || (c.tag === "input" && sv(c, "type") === "image")) {
      const alt = c.attrs.get("alt");
      if (alt?.dynamic) result = "unknown";
      else if (alt?.value?.trim()) return "yes";
      const viaAttrs = nameFromAttrs(c);
      if (viaAttrs === "yes") return "yes";
      if (viaAttrs === "unknown") result = "unknown";
      continue;
    }
    if (c.tag === "svg") {
      const viaAttrs = nameFromAttrs(c);
      if (viaAttrs === "yes") return "yes";
      if (viaAttrs === "unknown") result = "unknown";
      const title = c.children.find((x) => x.type === "element" && x.tag === "title");
      if (title && title.type === "element") {
        const t = nameFromContent(title);
        if (t === "yes") return "yes";
        if (t === "unknown") result = "unknown";
      }
      continue;
    }
    if (c.tag === "slot") {
      result = "unknown";
      continue;
    }
    const viaAttrs = nameFromAttrs(c);
    if (viaAttrs === "yes") return "yes";
    if (viaAttrs === "unknown") result = "unknown";
    const inner = nameFromContent(c);
    if (inner === "yes") return "yes";
    if (inner === "unknown") result = "unknown";
  }
  return result;
}

/** Accessible name from attributes OR content. */
export function accessibleName(el: ElementNode): Tri {
  const a = nameFromAttrs(el);
  if (a === "yes") return "yes";
  const c = nameFromContent(el);
  if (c === "yes") return "yes";
  if (a === "unknown" || c === "unknown") return "unknown";
  return "no";
}

export function ancestor(el: ElementNode, pred: (e: ElementNode) => boolean): ElementNode | undefined {
  let p = el.parent;
  while (p) {
    if (pred(p)) return p;
    p = p.parent;
  }
  return undefined;
}

export function* walk(el: ElementNode): Generator<ElementNode> {
  for (const c of el.children) {
    if (c.type === "element") {
      yield c;
      yield* walk(c);
    }
  }
}

export function hasClickHandler(el: ElementNode): boolean {
  return ["onclick", "onmousedown", "onmouseup", "onpointerdown", "onpointerup", "ontap"].some((n) => el.attrs.has(n));
}

export function hasKeyHandler(el: ElementNode): boolean {
  return ["onkeydown", "onkeyup", "onkeypress"].some((n) => [...el.attrs.keys()].some((k) => k === n || k.startsWith(n + ".")));
}

export function tabIndexValue(el: ElementNode): number | undefined {
  const v = sv(el, "tabindex");
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function isNativelyFocusable(el: ElementNode): boolean {
  if (el.tag === "a" || el.tag === "area") return has(el, "href");
  if (["button", "select", "textarea", "summary", "iframe"].includes(el.tag)) return !has(el, "disabled");
  if (el.tag === "input") return sv(el, "type") !== "hidden" && !has(el, "disabled");
  if ((el.tag === "audio" || el.tag === "video") && has(el, "controls")) return true;
  return false;
}
