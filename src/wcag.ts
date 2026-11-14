/** WCAG 2.2 success criteria referenced by this tool. */
export const WCAG: Record<string, { title: string; level: "A" | "AA" | "AAA" }> = {
  "1.1.1": { title: "Non-text Content", level: "A" },
  "1.2.2": { title: "Captions (Prerecorded)", level: "A" },
  "1.3.1": { title: "Info and Relationships", level: "A" },
  "1.3.5": { title: "Identify Input Purpose", level: "AA" },
  "1.4.1": { title: "Use of Color", level: "A" },
  "1.4.3": { title: "Contrast (Minimum)", level: "AA" },
  "1.4.4": { title: "Resize Text", level: "AA" },
  "1.4.6": { title: "Contrast (Enhanced)", level: "AAA" },
  "1.4.12": { title: "Text Spacing", level: "AA" },
  "2.1.1": { title: "Keyboard", level: "A" },
  "2.1.2": { title: "No Keyboard Trap", level: "A" },
  "2.2.1": { title: "Timing Adjustable", level: "A" },
  "2.2.2": { title: "Pause, Stop, Hide", level: "A" },
  "2.4.1": { title: "Bypass Blocks", level: "A" },
  "2.4.2": { title: "Page Titled", level: "A" },
  "2.4.3": { title: "Focus Order", level: "A" },
  "2.4.4": { title: "Link Purpose (In Context)", level: "A" },
  "2.4.6": { title: "Headings and Labels", level: "AA" },
  "2.4.7": { title: "Focus Visible", level: "AA" },
  "2.5.3": { title: "Label in Name", level: "A" },
  "2.5.8": { title: "Target Size (Minimum)", level: "AA" },
  "3.1.1": { title: "Language of Page", level: "A" },
  "3.1.2": { title: "Language of Parts", level: "AA" },
  "3.2.1": { title: "On Focus", level: "A" },
  "3.3.2": { title: "Labels or Instructions", level: "A" },
  "4.1.2": { title: "Name, Role, Value", level: "A" },
};

const LEVEL_RANK = { A: 1, AA: 2, AAA: 3 } as const;

/** Returns the least strict (lowest) level among criteria, i.e. the level at which the issue first fails. */
export function levelFor(criteria: string[]): "A" | "AA" | "AAA" {
  let best: "A" | "AA" | "AAA" | undefined;
  for (const c of criteria) {
    const l = WCAG[c]?.level;
    if (l && (!best || LEVEL_RANK[l] < LEVEL_RANK[best])) best = l;
  }
  return best ?? "A";
}

export function understandingUrl(criterion: string): string {
  return `https://www.w3.org/WAI/WCAG22/quickref/#${slug(criterion)}`;
}

function slug(criterion: string): string {
  const t = WCAG[criterion]?.title;
  return t ? t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : criterion;
}

/** Convert axe-core tags like "wcag111" / "wcag2411" into "1.1.1" / "2.4.11". */
export function criteriaFromAxeTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
    if (m) out.push(`${m[1]}.${m[2]}.${m[3]}`);
  }
  return [...new Set(out)];
}
