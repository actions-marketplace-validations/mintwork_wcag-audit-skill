# Contributing

Thanks for helping make the web usable for everyone. Bug reports with a minimal snippet are
the most valuable contribution: **false positives** (we flagged correct code) and **false
negatives** (we missed a real failure) both make the tool better.

## Setup

```bash
npm install
npm test            # builds (tsc) then runs vitest
```

Runtime tests need a Chromium browser. They use Playwright's Chromium if installed
(`npx playwright-core install chromium`), otherwise local Chrome/Edge, and are skipped with
a warning if none is found.

## Project layout

```
src/
  static/            source analysis
    parse-html.ts    tolerant parser for HTML, Vue, Svelte, Astro
    parse-jsx.ts     JSX/TSX via @babel/parser
    ast.ts           framework-neutral element tree + attribute normalization
    helpers.ts       accessible-name approximation, focusability, etc.
    rules.ts         all static rules
    analyze.ts       file discovery, suppression comments, fingerprints
  runtime/           Playwright + axe-core scan, keyboard traversal
  report/            text / JSON / SARIF
  cli.ts             argument parsing
skills/wcag-audit/   the Agent Skill (SKILL.md, references, schema, validator)
integrations/        Codex (AGENTS.md), Cursor, Claude Code docs
test/fixtures/       known-bad and clean files for every parser
```

## Adding a static rule

1. Add an entry to `rules` in `src/static/rules.ts`: `id` (kebab-case), `title`, `wcag`
   criteria, default `severity`, one-line `description`, and a `create(ctx)` that calls
   `ctx.report({ el, message, fix })`.
2. **Be conservative.** If an attribute is dynamic (`attr.dynamic`), the element has a spread
   (`el.hasSpread`), or a child is a component (`isComponent`), assume the author handled it.
   Use `confidence: "medium"` for heuristics.
3. Messages say what is wrong *for the user*; fixes are concrete and copy-pasteable.
4. Add the violation to the relevant `test/fixtures/static/bad/*` file and a correct version
   to `test/fixtures/static/good/*` (the good fixtures must stay at zero findings), plus a
   false-positive guard in `test/static.test.ts`.
5. Document it in `skills/wcag-audit/references/RULES.md` and the README rule table, and add
   a fix pattern / verification note to the skill references if useful.
6. If the criterion is new, add it to `src/wcag.ts`.

## Changing the skill

`skills/wcag-audit/SKILL.md` must follow the [Agent Skills spec](https://agentskills.io/specification):
`name` matches the directory, `description` ≤ 1024 chars, body < 500 lines. Put detail in
`references/`. `test/skill.test.ts` checks this and that every linked file exists.

## Commits and PRs

- Small, focused PRs with tests. `npm test` must pass.
- Conventional-ish commit messages (`feat:`, `fix:`, `docs:`, `test:`).
- By contributing you agree your work is released under the MIT license.

## Accessibility of this project

Docs and examples should model good practice: descriptive link text, alt text on images,
tables with headers. If you spot something in this repo that is itself inaccessible, that's
a bug — please report it.
