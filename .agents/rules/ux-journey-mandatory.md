---
description: Non-trivial UX tasks require labs-ux-journey journey sketch in chat before any UI code
alwaysApply: true
---

# UX journey sketch (hard gate)

**Before creating or editing UI files** for a **non-trivial UX task**, you MUST:

1. Read skill **[`labs-ux-journey`](../skills/labs-ux-journey/SKILL.md)** and [`docs/UX_AGENT_GUIDE.md`](../../docs/UX_AGENT_GUIDE.md).
2. **Post the journey sketch in chat** (table: user + context, primary goal, ≤2 secondary, background work, what we hide).
3. If primary action priority is unclear → **`AskQuestion`** — do not guess.

Do **not** write component/CSS/layout code until the sketch is in chat (or the user explicitly waived it).

## Non-trivial UX (sketch required)

- New screen, tab, panel, dialog, or multi-step flow
- Layout restructure, upload/sync/progress UI, dock/toolbar changes
- User gave gestalt, redundancy, visual-weight, or journey feedback
- Adding a second instance of a control type already on the page

## Trivial (sketch optional)

- Copy-only or single-label tweak with no layout change
- Bug fix restoring documented prior behavior
- Question-only / review-only with no implementation

## After sketch

Follow skill steps 2–5 (layout plan, visual weight, copy, verify). See [`.agents/rules/ux-agent-guide.md`](ux-agent-guide.md) when editing components.
