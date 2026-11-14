# Claude Code

Three ways to install, pick one.

**Plugin marketplace (recommended)** — inside Claude Code:

```
/plugin marketplace add ranjan-mohanty/wcag-audit-skill
/plugin install wcag-audit@wcag-audit-skill
```

**Skills CLI**

```bash
npx skills add https://github.com/ranjan-mohanty/wcag-audit-skill --skill wcag-audit
```

**Manual copy**

```bash
git clone https://github.com/ranjan-mohanty/wcag-audit-skill
mkdir -p ~/.claude/skills && cp -r wcag-audit-skill/skills/wcag-audit ~/.claude/skills/
# or per project:  cp -r wcag-audit-skill/skills/wcag-audit .claude/skills/
```

Then ask: *"Audit this app for accessibility and fix what you find."* Claude loads the
skill automatically when the request mentions accessibility, a11y, WCAG, screen readers,
contrast, alt text, labels, focus or keyboard navigation.
