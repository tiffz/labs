---
description: React a11y baseline — landmarks, labels, MUI imports, menus
globs:
  - src/**/*.tsx
---

# React accessibility

Enforced by **`eslint-plugin-jsx-a11y`**, **`src/shared/spaGuardrails.test.ts`**, and **`npm run check:menu-a11y`**. Full prose: [`STYLE_GUIDE.md`](../../STYLE_GUIDE.md) § UI and Accessibility · [`docs/A11Y_MENU_PATTERNS.md`](../../docs/A11Y_MENU_PATTERNS.md).

## Checklist (touched UI)

- One `<main id="main">` + `<SkipToMain />` first in app root (`display: contents` on main if layout requires).
- Every icon-only button / `IconButton` has **`aria-label`** (`AppTooltip` does not supply the name).
- **Menu triggers:** `aria-haspopup`, `aria-expanded`, `aria-controls` — use [`useLabsDisclosureMenu`](../../src/shared/a11y/useLabsDisclosureMenu.ts).
- **Menus / popovers:** focus first item on open (`useFocusMenuOnOpen` or MUI default); arrow keys for option lists (`handleMenuListKeyDown`); Escape closes and returns focus.
- **Do not** set `disableEnforceFocus` / `disableRestoreFocus` on `AnchoredPopover` / MUI pickers unless documented in [`A11Y_MENU_PATTERNS.md`](../../docs/A11Y_MENU_PATTERNS.md).
- **Focus rings:** no `overflow: hidden` on split buttons / toolbars that clip `:focus-visible` outlines.
- MUI: path imports only — `import Button from '@mui/material/Button'` (never `@mui/material` barrel).
- No bare `outline: none` without `:focus-visible` replacement.
- Lazy-load heavy modals/surfaces with `React.lazy` + `Suspense` (see `beat/App.tsx`, `words/App.tsx`).

Run **`npx eslint <changed-tsx>`** on edited files.
