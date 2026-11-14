import { parse } from "@babel/parser";
import { type Attr, type ElementNode, type Node, type ParsedDocument, createRoot, normalizeAttrName } from "./ast.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyNode = any;

/** Components that behave like intrinsic elements for a11y purposes. */
const COMPONENT_ALIASES: Record<string, string> = {
  Image: "img", // next/image, astro:assets
  Img: "img",
  Link: "a", // next/link, react-router, remix
  NavLink: "a",
};

/** Parses .jsx/.tsx/.js files with Babel and extracts every JSX tree. */
export function parseJsx(file: string, source: string): ParsedDocument {
  const root = createRoot();
  const errors: string[] = [];
  const isTs = /\.(tsx|ts|mts|cts)$/.test(file);
  let ast: AnyNode;
  try {
    ast = parse(source, {
      sourceType: "module",
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      plugins: isTs ? ["jsx", "typescript", "decorators-legacy"] : ["jsx", "decorators-legacy"],
    });
  } catch (err) {
    errors.push((err as Error).message);
    return { file, framework: "jsx", source, root, parseErrors: errors };
  }
  for (const e of ast.errors ?? []) errors.push(String(e.message ?? e));

  const visit = (node: AnyNode, parent: ElementNode) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const c of node) visit(c, parent);
      return;
    }
    if (node.type === "JSXElement") {
      parent.children.push(convertElement(node, parent));
      return;
    }
    if (node.type === "JSXFragment") {
      for (const c of convertChildren(node.children, parent)) parent.children.push(c);
      return;
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "leadingComments" || key === "trailingComments" || key === "extra") continue;
      const v = node[key];
      if (v && typeof v === "object") visit(v, parent);
    }
  };

  const convertElement = (node: AnyNode, parent: ElementNode): ElementNode => {
    const opening = node.openingElement;
    const rawTag = jsxName(opening.name);
    const intrinsic = /^[a-z]/.test(rawTag) && !rawTag.includes(".") && !rawTag.includes("-");
    const alias = COMPONENT_ALIASES[rawTag];
    const attrs = new Map<string, Attr>();
    let hasSpread = false;
    for (const a of opening.attributes) {
      if (a.type === "JSXSpreadAttribute") {
        hasSpread = true;
        continue;
      }
      const rawName = jsxName(a.name);
      const norm = normalizeAttrName(rawName, "jsx");
      if (!norm) continue;
      const { value, dynamic } = attrValue(a.value);
      let name = norm.name;
      if (alias === "a" && name === "to") name = "href";
      attrs.set(name, { name, rawName, value, dynamic });
    }
    const el: ElementNode = {
      type: "element",
      tag: intrinsic ? rawTag.toLowerCase() : alias ?? rawTag,
      isComponent: !intrinsic && !alias,
      attrs,
      hasSpread,
      children: [],
      parent,
      line: opening.loc.start.line,
      column: opening.loc.start.column + 1,
      openTag: source.slice(opening.start, opening.end),
    };
    el.children = convertChildren(node.children, el);
    return el;
  };

  const convertChildren = (children: AnyNode[], parent: ElementNode): Node[] => {
    const out: Node[] = [];
    for (const c of children) {
      switch (c.type) {
        case "JSXText":
          if (c.value.trim()) out.push({ type: "text", text: c.value, dynamic: false });
          break;
        case "JSXElement":
          out.push(convertElement(c, parent));
          break;
        case "JSXFragment":
          out.push(...convertChildren(c.children, parent));
          break;
        case "JSXExpressionContainer": {
          const e = c.expression;
          if (e.type === "JSXEmptyExpression") break;
          if (e.type === "StringLiteral" || (e.type === "TemplateLiteral" && e.expressions.length === 0)) {
            const text = e.type === "StringLiteral" ? e.value : e.quasis[0].value.cooked;
            if (text.trim()) out.push({ type: "text", text, dynamic: false });
            break;
          }
          if (e.type === "JSXElement") {
            out.push(convertElement(e, parent));
            break;
          }
          // Arbitrary expression: may render text. Collect nested JSX as children.
          out.push({ type: "text", text: "", dynamic: true });
          const holder = { ...parent, children: [] as Node[] };
          visit(e, holder);
          for (const child of holder.children) {
            if (child.type === "element") child.parent = parent;
            out.push(child);
          }
          break;
        }
        case "JSXSpreadChild":
          out.push({ type: "text", text: "", dynamic: true });
          break;
      }
    }
    return out;
  };

  visit(ast.program, root);
  return { file, framework: "jsx", source, root, parseErrors: errors };
}

function jsxName(n: AnyNode): string {
  switch (n.type) {
    case "JSXIdentifier":
      return n.name;
    case "JSXNamespacedName":
      return `${n.namespace.name}:${n.name.name}`;
    case "JSXMemberExpression":
      return `${jsxName(n.object)}.${n.property.name}`;
    default:
      return "";
  }
}

function attrValue(v: AnyNode): { value: string | null; dynamic: boolean } {
  if (v == null) return { value: "", dynamic: false }; // <input disabled />
  if (v.type === "StringLiteral") return { value: v.value, dynamic: false };
  if (v.type === "JSXExpressionContainer") {
    const e = v.expression;
    switch (e.type) {
      case "StringLiteral":
        return { value: e.value, dynamic: false };
      case "NumericLiteral":
        return { value: String(e.value), dynamic: false };
      case "BooleanLiteral":
        return { value: String(e.value), dynamic: false };
      case "UnaryExpression":
        if (e.operator === "-" && e.argument.type === "NumericLiteral") return { value: String(-e.argument.value), dynamic: false };
        break;
      case "TemplateLiteral":
        if (e.expressions.length === 0) return { value: e.quasis[0].value.cooked, dynamic: false };
        break;
    }
  }
  return { value: null, dynamic: true };
}
