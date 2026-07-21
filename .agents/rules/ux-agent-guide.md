---
description: UX gestalt, journey hierarchy, redundancy, and spec hygiene for Labs UI
globs:
  - src/**/components/**
  - src/**/App.tsx
  - src/**/*.css
  - src/**/phases/**
---

# UX agent guide (scoped)

**Hard gate (always-on):** [`.agents/rules/ux-journey-mandatory.md`](ux-journey-mandatory.md) — journey sketch in chat before UI code.

Canonical: [`docs/UX_AGENT_GUIDE.md`](../../docs/UX_AGENT_GUIDE.md). Skill: **`labs-ux-journey`**.

## Before new / major UI

1. Run journey sketch (primary action, ≤2 secondary, aggregate background status).
2. Read app `DESIGN.md` + `STYLE_GUIDE.md` § Parallel surfaces.
3. If priority unclear → **ask the user**; do not stack equal CTAs.

## Hard rules

| Don't                                     | Do                                      |
| ----------------------------------------- | --------------------------------------- |
| N identical progress bars in one viewport | One shell/tab aggregate status          |
| Same copy on every card                   | Card-specific title; shared status once |
| Card nested in card for same grouping     | One region + spacing                    |
| Ad-hoc hex / shadow stacks                | Theme tokens + design doc               |
| Flush text to container edges             | App spacing scale / panel padding       |
| 3+ loud contained buttons above fold      | One primary; rest text/icon/outline     |

## Gestalt

- **Proximity:** fields of one task in one labeled section.
- **Similarity:** same semantics → same component + same verb labels.
- **Common region:** one panel per concern.

## Done check

- [ ] Journey sketch satisfied
- [ ] UX guide § Spec hygiene
- [ ] USER_COPY_STYLE on touched strings
- [ ] Screenshot/snapshot when feasible

Root cause classes: `ux-gestalt`, `ux-redundancy`, `ux-visual-weight`, `ux-spec-violation`, `ux-journey-overload`.
