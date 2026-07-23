---
description: Subtraction-first UX — remove any element the design works without; no redundant help text, duplicate controls, or over-carding
globs:
  - src/**/components/**
  - src/**/*.tsx
  - src/**/*.css
---

# UX restraint (subtraction first)

Orwell's rules of writing, for interfaces. Agent-authored UI over-builds; default to
removing, not adding. A design is done when there is nothing left to **remove**.
Canonical: [`docs/UX_AGENT_GUIDE.md`](../../docs/UX_AGENT_GUIDE.md) § The UX restraint rules.

1. **If an element can be removed and the design still works, remove it.**
2. **Never explain in text what the UI already shows** — no help text for the obvious, no label repeating its icon, no tooltip restating a heading.
3. **Show each action once** — no duplicate button or near-duplicate control in one view.
4. **One primary action per screen; everything else is quieter.**
5. **No card, border, shadow, or divider that isn't doing work** — group with space first; never card-in-card.
6. **One control that does the whole job beats three that each do part of it.**
7. **Show state, don't narrate it** — one aggregate status, not a sentence per row.
8. **Fewest steps, fewest choices, fewest words.**
9. **Break a rule only when removing the element genuinely costs the user clarity or a task** — and say why.

Root cause classes: `ux-redundancy` (rules 2, 3, 7) · `ux-visual-weight` (rule 5) · `ux-journey-overload` (rules 4, 8).
