---
paths:
  - 'src/**/*.css'
  - 'public/styles/**/*.css'
---

<!-- AUTO-GENERATED from .agents/rules/spa-css-conventions.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Cross-app SPA CSS — viewport, focus, motion, touch

# SPA CSS conventions

Full prose: [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § HTML entry, Focus and motion, Icon-only controls.

## Overriding vendor CSS: measure, do not reason

MUI (emotion) and Google's Material Symbols inject their styles **unlayered**. An unlayered rule
beats a layered one no matter how specific the layered one is, so anything written inside
`@layer components` to override them **silently does nothing** — and the CSS still reads as if it
works, which is why this keeps recurring. Three cases in one week, all in `drums.css`:

- Material Symbols sizing (documented at the end of that file, in an unlayered block)
- the variation-note icon, which rendered a size and weight heavier than written
- the beat-grouping tooltip, authored white-on-purple in July and rendering as MUI's near-black
  every day since, because the rule sat inside the layer from the day it was added

**Do this:**

1. **Read the computed value in a browser before and after.** Specificity arithmetic will mislead
   you here; the cascade layer is invisible in the source. `getComputedStyle`, or walk
   `document.styleSheets` and print each matching rule with its layer.
2. Put overrides that must beat vendor CSS in the file's **unlayered** section, not in `@layer`.
3. Once unlayered, you tie with emotion on specificity and **emotion injects at runtime**, so repeat
   a class (`.x.x`) to win outright — and comment why, or someone will tidy it away.
4. Prefer `var(--token, fallback)` in shared primitives over assigning the token unlayered.

Root cause class: `cascade-layer-token-override`. Background:
[`THEMING_DECISIONS.md`](../../src/shared/components/music/THEMING_DECISIONS.md) § CSS `@layer`
Cascade Pitfall.

## Checklist (touched CSS)

- Fullscreen height: `100vh` **and** `100dvh` (or `min-height` pair).
- Never bare `outline: none` — add matching `:focus-visible` ring.
- Do not override global `prefers-reduced-motion` in `public/styles/shared.css`; re-enable only per essential animation inside `@media (prefers-reduced-motion: reduce)`.
- Touch: `@media (pointer: coarse)` → ≥44×44 px for icon controls.
- Muted text on light backgrounds: WCAG AA (avoid `#94a3b8` for text).
- Do not restyle `.skip-to-main` (lives in shared.css).
