# TypeScript Style Guide

This repo follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) with repo-specific defaults below.

## Project Defaults

- Prefer named exports for new modules.
- Use `import type` for type-only imports.
- Prefer relative imports inside a feature/app.
- Keep files simple: imports first, then implementation.
- Add JSDoc only when it clarifies behavior, trade-offs, or constraints.

## Migration Policy

- Do not mass-convert untouched files.
- When refactoring a file, prefer converting default exports to named exports.
- Keep import style consistent inside the edited module group.

## UI and Accessibility Rules

- Reuse shared primitives from `src/shared/components` before creating app-local variants.
- Use MUI primitives for complex interaction surfaces (`Dialog`, `Menu`, `Popover`, `Autocomplete`, `Select`).
- Preserve app-specific identity through theme tokens, not custom focus/interaction mechanics.
- Keyboard access, visible focus states, and semantic labeling are required in touched UI code.

### HTML entry points

- Start new apps from `src/shared/templates/app-index.starter.html`.
- Every `src/*/index.html` must ship:
  - A `<meta name="color-scheme">` declaring light or dark.
  - An inline `<style>html{color-scheme:…;background:#…;color:#…}</style>` block that matches the app's resting body background, to prevent FOUC.
  - A `<link rel="stylesheet" href="/styles/shared.css" />` for the a11y baseline (skip link, reduced-motion, box-sizing).
  - A per-app SVG favicon in `/icons/` plus `apple-touch-icon`.
  - The localhost-guarded analytics injection (never a bare `<script src="/scripts/analytics.js">`).
- Do not add `<link rel="manifest">`, do not register a service worker, and do not link Google Fonts directly — use `@fontsource/*` self-hosted fonts (`src/shared/ui/fonts/appFonts.ts`).
- Keep `Cache-Control` to a single `no-cache` meta. Cache-busting is handled by `build-version.txt` polling.

### Landmarks and skip links

- Render exactly one `<main id="main">` per app containing the primary interactive content.
- Render `<SkipToMain />` (`src/shared/components/SkipToMain.tsx`) as the first focusable element of the app root.
- If wrapping the existing layout container would disrupt grid/flex positioning, apply `display: contents` to the new `<main>` element.

### Focus and motion

- Never ship bare `outline: none`. Replace suppressed outlines with matching `:focus-visible` rules.
- Do not override browser animation/transition durations globally — the shared `prefers-reduced-motion` baseline in `public/styles/shared.css` already clamps them. Only re-enable a specific animation inside a per-app `@media (prefers-reduced-motion: reduce)` block when the animation is essential to the UX.

### Icon-only controls

- Every icon-only `<button>` or `<IconButton>` needs an `aria-label`. `AppTooltip` uses `describeChild` and does _not_ supply the accessible name.
- Coarse-pointer (touch) interactions need ≥44×44 px hit areas. Use `@media (pointer: coarse)` overrides on dense icon clusters.

### Layout

- Fullscreen app shells: `height: 100vh; height: 100dvh;` (or `min-height` variants). Never `100vh` alone.
- Avoid hard-coded `100vw` desktop widths without a mobile plan.

### Bundle hygiene

- Import MUI components from their path: `import Button from '@mui/material/Button'`. Do not import from the `@mui/material` barrel.
- Lazy-load heavy modals, analytics surfaces, and video players with `React.lazy` + `<Suspense fallback={…}>`.
- If you add a new heavy dependency (>50 KB minified), also add it to the `manualChunks` map in `vite.config.ts`.

## Async tests with `React.lazy`

When a unit test asserts on content rendered behind `React.lazy` + `<Suspense>` (or behind a chain of dynamic `import()` calls), dynamic import resolution on a cold CI runner can take several seconds in jsdom. A 5 s `findBy*` timeout is not enough on shared runners.

- Wrap the triggering interaction in `await act(async () => { ... })` so React flushes Suspense boundaries before the assertion.
- Pass a ≥10 s `timeout` to `findBy*`. A named constant (e.g. `LAZY_FIND_TIMEOUT_MS = 15_000`) documents intent.
- Prefer mocking the dynamic import with a synchronous module when the test is not specifically exercising the lazy-load path.

See `src/story/App.test.tsx` for the canonical pattern.

## References

- `DEVELOPMENT.md`
- `GEMINI.md`
- `src/shared/SHARED_UI_CONVENTIONS.md`
