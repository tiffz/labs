---
description: The Gesture Room Linen design system — tokens, flat sage aesthetic, account menu
globs:
  - src/gesture/**/*
---

# Gesture Room — Linen design

Read [`src/gesture/DESIGN.md`](../../src/gesture/DESIGN.md) before changing UI in The Gesture Room.

## Non-negotiables

- **Linen only** — sage accent `#5f8566`, canvas `#e8e4dc`, no multi-theme picker in production.
- **Flat** — no drop shadows, no zine offset borders, no gradient headlines.
- **Tokens** — use `--gesture-*` from [`design/linenTheme.ts`](../../src/gesture/design/linenTheme.ts); sync MUI via `getAppTheme('gesture')`.
- **Typography** — Inter, sentence case, title weight 500.

## Shared chrome

- Account menu: [`GestureAccountMenu.tsx`](../../src/gesture/components/GestureAccountMenu.tsx) + `.gesture-account-menu` / `#gesture-account-menu-button` in `gesture.css` — do not restyle with heavy borders or shadows in TSX.
- Practice / Collections tabs: segmented pill in `gesture.css` — hover wash on unselected tabs; no underline indicator.

## New surfaces

- Collection cards: borderless; preview strip carries visual weight.
- Buttons: 0.5rem radius, sage fill for primary.
- Extend [`gesture.css`](../../src/gesture/gesture.css) under `.gesture-app` rather than ad-hoc hex in components.
