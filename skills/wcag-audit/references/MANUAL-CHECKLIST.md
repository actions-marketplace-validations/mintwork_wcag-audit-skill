# What automation cannot check

List these under "Not tested" in the report unless you actually checked them. When you
have a browser tool, you can check several yourself.

| WCAG | Criterion | How to check |
| --- | --- | --- |
| 1.1.1 | Alt text *quality* | Does each alt convey the same information as the image in context? |
| 1.2.x | Captions / audio description accuracy | Watch with captions on |
| 1.3.2 | Meaningful sequence | Read with CSS disabled; does the order still make sense? |
| 1.3.3 | Sensory characteristics | Instructions don't rely on shape/position/color only ("click the round button") |
| 1.4.1 | Use of color | Grayscale screenshot: is state/error still distinguishable? |
| 1.4.10 | Reflow | 320 CSS px wide: no horizontal scrolling for text content |
| 1.4.11 | Non-text contrast | Control borders, focus rings, icons ≥ 3:1 |
| 1.4.12 | Text spacing | Apply the text-spacing bookmarklet; nothing clipped |
| 1.4.13 | Content on hover/focus | Tooltips dismissible (Escape), hoverable, persistent |
| 2.1.1 | Keyboard | Every action works with keyboard only |
| 2.2.1 | Timing adjustable | Timeouts can be extended |
| 2.4.3 | Focus order | Tab order matches visual and logical order |
| 2.4.5 | Multiple ways | Search, sitemap or nav to reach pages |
| 2.4.6 | Headings and labels | Headings/labels describe their content |
| 2.4.11 | Focus not obscured | Sticky headers/footers never fully cover the focused element |
| 2.5.1 | Pointer gestures | Multi-touch/path gestures have single-pointer alternatives |
| 2.5.3 | Label in name | Accessible name contains the visible label text |
| 2.5.7 | Dragging movements | Drag has a click/tap alternative |
| 3.2.x | Predictable | No context change on focus/input without warning |
| 3.3.1 | Error identification | Errors described in text, tied to the field |
| 3.3.7 | Redundant entry | Previously entered info is auto-filled or selectable |
| 3.3.8 | Accessible authentication | No cognitive tests; paste and password managers allowed |
| 4.1.3 | Status messages | Async results announced via live regions |

Also recommend a real screen-reader pass (VoiceOver + Safari, NVDA + Firefox/Chrome) for
the primary flows — nothing replaces it.
