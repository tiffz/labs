---
description: Cross-app SPA CSS — viewport, focus, motion, touch
globs:
  - src/**/*.css
  - public/styles/**/*.css
---

# SPA CSS conventions

Full prose: [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § HTML entry, Focus and motion, Icon-only controls.

## Checklist (touched CSS)

- Fullscreen height: `100vh` **and** `100dvh` (or `min-height` pair).
- Never bare `outline: none` — add matching `:focus-visible` ring.
- Do not override global `prefers-reduced-motion` in `public/styles/shared.css`; re-enable only per essential animation inside `@media (prefers-reduced-motion: reduce)`.
- Touch: `@media (pointer: coarse)` → ≥44×44 px for icon controls.
- Muted text on light backgrounds: WCAG AA (avoid `#94a3b8` for text).
- Do not restyle `.skip-to-main` (lives in shared.css).
