/** WAI-ARIA 1.2 roles (including abstract-free, concrete roles and common DPUB/Graphics roles). */
export const ARIA_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "blockquote", "button", "caption", "cell",
  "checkbox", "code", "columnheader", "combobox", "complementary", "contentinfo", "definition", "deletion",
  "dialog", "directory", "document", "emphasis", "feed", "figure", "form", "generic", "grid", "gridcell",
  "group", "heading", "img", "image", "insertion", "link", "list", "listbox", "listitem", "log", "main", "mark",
  "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "meter",
  "navigation", "none", "note", "option", "paragraph", "presentation", "progressbar", "radio",
  "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar", "search", "searchbox",
  "separator", "slider", "spinbutton", "status", "strong", "subscript", "superscript", "switch", "tab",
  "table", "tablist", "tabpanel", "term", "textbox", "time", "timer", "toolbar", "tooltip", "tree",
  "treegrid", "treeitem",
  "graphics-document", "graphics-object", "graphics-symbol",
  "doc-abstract", "doc-acknowledgments", "doc-afterword", "doc-appendix", "doc-backlink",
  "doc-biblioentry", "doc-bibliography", "doc-biblioref", "doc-chapter", "doc-colophon",
  "doc-conclusion", "doc-cover", "doc-credit", "doc-credits", "doc-dedication", "doc-endnote",
  "doc-endnotes", "doc-epigraph", "doc-epilogue", "doc-errata", "doc-example", "doc-footnote",
  "doc-foreword", "doc-glossary", "doc-glossref", "doc-index", "doc-introduction", "doc-noteref",
  "doc-notice", "doc-pagebreak", "doc-pagelist", "doc-part", "doc-preface", "doc-prologue",
  "doc-pullquote", "doc-qna", "doc-subtitle", "doc-tip", "doc-toc",
]);

/** Roles that make an element an interactive widget users must be able to operate. */
export const INTERACTIVE_ROLES = new Set([
  "button", "checkbox", "combobox", "link", "menuitem", "menuitemcheckbox", "menuitemradio", "option",
  "radio", "searchbox", "slider", "spinbutton", "switch", "tab", "textbox", "treeitem", "gridcell",
]);

export const ARIA_ATTRIBUTES = new Set([
  "aria-activedescendant", "aria-atomic", "aria-autocomplete", "aria-braillelabel", "aria-brailleroledescription",
  "aria-busy", "aria-checked", "aria-colcount", "aria-colindex", "aria-colindextext", "aria-colspan",
  "aria-controls", "aria-current", "aria-describedby", "aria-description", "aria-details", "aria-disabled",
  "aria-dropeffect", "aria-errormessage", "aria-expanded", "aria-flowto", "aria-grabbed", "aria-haspopup",
  "aria-hidden", "aria-invalid", "aria-keyshortcuts", "aria-label", "aria-labelledby", "aria-level",
  "aria-live", "aria-modal", "aria-multiline", "aria-multiselectable", "aria-orientation", "aria-owns",
  "aria-placeholder", "aria-posinset", "aria-pressed", "aria-readonly", "aria-relevant", "aria-required",
  "aria-roledescription", "aria-rowcount", "aria-rowindex", "aria-rowindextext", "aria-rowspan",
  "aria-selected", "aria-setsize", "aria-sort", "aria-valuemax", "aria-valuemin", "aria-valuenow",
  "aria-valuetext",
]);

/** Elements that are interactive / focusable by default. */
export const NATIVE_INTERACTIVE = new Set(["a", "button", "input", "select", "textarea", "summary", "details", "option", "audio", "video", "iframe"]);

/** Elements that should never carry click handlers without a role. */
export const NON_INTERACTIVE_CONTAINERS = new Set([
  "div", "span", "li", "p", "section", "article", "aside", "header", "footer", "main", "nav", "td", "tr",
  "th", "ul", "ol", "img", "label", "strong", "em", "i", "b", "figure", "svg", "h1", "h2", "h3", "h4", "h5", "h6",
]);

/** Levenshtein distance, used to suggest corrections for typos like aria-lable. */
export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}

export function closest(word: string, candidates: Iterable<string>): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = distance(word, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD <= 3 ? best : undefined;
}
