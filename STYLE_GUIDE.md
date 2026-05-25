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
- Copy `app-main.starter.tsx` and `app-layout.starter.css` from the same folder when the app uses a column/workbench shell (see `src/shared/layout/README.md`).
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

### Information density (modern surfaces)

- Prefer a **quiet default UI**: primary labels stay short; long explanations belong in **tooltips**, not stacked paragraph copy above every control group.
- **Section context:** pair a concise heading with an **`InfoOutlined` icon** (`IconButton` + MUI `Tooltip`) for definitions, constraints, and “how this relates to the rest of the form.” Match the pattern in `SongMilestoneChecklist` and Encore song media sections.
- **Actions:** bias toward **icon buttons with tooltips** for secondary actions and external links (open in Spotify/YouTube, refresh, compact pickups). Keep text `Button`s for strong primary CTAs (Save, Add when it commits a form row) when the label disambiguates better than an icon.
- **Empty states:** one short line is enough; fold setup steps into the section info tooltip when they would clutter the layout.

### Parallel surfaces for parallel concepts (Material/Gestalt)

Whenever two or more screens, cards, or rows describe **the same kind of thing** (two third-party connections, two saved searches, two media-link rows), render them through **the same component shell** with the same affordance order. Visual parallelism leverages the gestalt principle of similarity so users can scan once and apply the same mental model to every row.

Concrete rules:

- **Same shape, same verbs.** If two integration cards both have "sign in again" semantics, both buttons should say the exact same thing (`Sign in again`, not `Refresh Spotify login` next to `Sign in again`). Pick one verb per concept and reuse it across surfaces.
- **One UX language per status.** If one card uses a static status pill (`EncoreStatusPill`), the parallel card should not bolt a chevron menu onto its pill: pick one pattern. Hidden actions in a chevron menu next to a visible action elsewhere create asymmetry that reads as "these are different".
- **Surface destructive and primary actions at the same level.** If `Disconnect` is an inline text button in card A, do not bury it inside a dropdown in card B. Reach for icon buttons + tooltips for utilities (Open external, Refresh, Reorganize), and reserve text buttons for primary + tertiary actions (`Sign in again`, `Disconnect`).
- **Build a small layout primitive when there are ≥2 parallel cards in one surface.** A few keys (status, identity, description, utility actions, primary, disconnect, alert) almost always cover the contract; a thin internal helper or shared component beats hand-rolling each card. See `EncoreAccountMenu`'s `IntegrationCard` for the canonical Encore example.
- **Sync surfaces are a family.** When more than one screen lets the user trigger the same kind of remote sync (Practice page learning playlist, saved-search Spotify playlist binding), they should read as siblings: same icon order (brand mark · uppercase section label · `InfoOutlinedIcon` tooltip · brand text field · Sync · Open in Spotify), same brand text-field component (`EncoreBrandTextField`), and the same green-free brand palette. The Practice page's `EncoreSynchronizableSpotifyPlaylistPanel` is the reference; reuse it when commit semantics line up, and otherwise mirror its rhythm in a custom layout. **Never** color the sync action `success`/green just because it's a Spotify integration — the brand color belongs to the chip/badge, not to the active verb. Save the loud color for _destructive_ (`color="error"`) or _celebrating_ (`color="success"`) states, never neutral commits.

### Action color tones (`color="error"` / `color="success"` / `color="warning"`)

Use MUI semantic colors for **state**, not for **branding**:

- `color="error"` — destructive intent (delete, disconnect, leave). Outlined or text variants are usually loud enough; reserve contained for confirmation dialogs.
- `color="warning"` — recoverable problem requiring user action (session expired, sync conflict). Pair with an explicit verb (`Sign in again`, `Resolve conflict`).
- `color="success"` — confirmation of a finished positive event (saved, uploaded, completed). Avoid on plain commit buttons; "save" is a neutral verb and should use `primary`.
- `color="info"` — neutral informational state (`syncing…`, "fetching"). Rare on buttons; usually on chips/banners.

If a third-party brand happens to be green/red/orange, render the brand mark in its native color (icon, chip background) but keep button color/state semantic. The user reads color before label; loud-but-neutral buttons (e.g. green Sync) misdirect attention away from the page's actual primary commit.

### Filter / search operators (include vs exclude)

Filters that let users pick categorical values should support both **include (OR)** and **exclude (NOT IN)** when the natural use case includes negation (e.g. "songs I haven't performed at this venue"). Conventions:

- **Per-field operator toggle**, not per-value, unless the data warrants per-value (rare). A small `Match` / `Exclude` segmented control inside the field's selector menu is the established pattern (Linear, Notion, Airtable). See `EncoreFilterChipBar` `supportsExclude` opt-in.
- **Visual signal for excluded chips:** error-tinted chip with a `not ` prefix on the value summary and a `BlockIcon`. Do not silently invert the same chip color: users will not notice.
- **Only opt in for non-exclusive multi-select fields.** Exclusive single-value fields (e.g. "Performed: With / None") already model is/is-not via their own option list; adding a second exclude toggle is redundant and confusing.
- **Persist the exclude flag separately** from the value array (`excludedFieldIds: string[]`), and **strip ids that no longer support exclude** when loading saved state, so future schema changes don't silently change saved-search semantics.

### Layout

- Fullscreen app shells: `height: 100vh; height: 100dvh;` (or `min-height` variants). Never `100vh` alone.
- Avoid hard-coded `100vw` desktop widths without a mobile plan.
- **Multi-panel apps** (header + scroll + footer): use [`AppShellLayout`](../src/shared/layout/AppShellLayout.tsx) and an app `*-layout.css` for tokens. See [`src/shared/layout/README.md`](../src/shared/layout/README.md) and Stanza [`LAYOUT.md`](../src/stanza/LAYOUT.md). Do not put horizontal width or grid template in component `sx`.

### Structural panels vs MUI

- **MUI** for interactive widgets: `Dialog`, `Menu`, `TextField`, `Select`, `IconButton`, `Slider`.
- **Plain `Box` / `section` + app CSS classes** for always-visible structural panels (library footer, playback stack, practice rail). Do not use MUI `Accordion` for layout chrome unless collapse is an explicit product requirement.
- Prefer `.stanza-panel` / app panel classes over fighting MUI Paper defaults with `!important`.

### Bundle hygiene

- Import MUI components from their path: `import Button from '@mui/material/Button'`. Do not import from the `@mui/material` barrel.
- Lazy-load heavy modals, analytics surfaces, and video players with `React.lazy` + `<Suspense fallback={…}>`.
- If you add a new heavy dependency (>50 KB minified), also add it to the `manualChunks` map in `vite.config.ts`.

## Unit tests: `navigator.mediaDevices` in JSDOM

JSDOM does not implement `navigator.mediaDevices` (or related live-media APIs). Any unit test that mounts an app or hook which enumerates mics/cameras on mount **must mock** those calls or the suite will throw.

- Prefer mocking at the **smallest boundary** you own (e.g. `MicrophonePitchInput.listDevices`, `getUserMedia`), not the entire browser.
- Document one-line expectations in the app `README.md` **only** if the constraint is non-obvious; keep the long explanation here and link out from app docs.
- E2E / Playwright runs in a real browser — this section applies to **Vitest + JSDOM** only.

## Async tests with `React.lazy`

When a unit test asserts on content rendered behind `React.lazy` + `<Suspense>` (or behind a chain of dynamic `import()` calls), dynamic import resolution on a cold CI runner can take several seconds in jsdom. A 5 s `findBy*` timeout is not enough on shared runners.

- Wrap the triggering interaction in `await act(async () => { ... })` so React flushes Suspense boundaries before the assertion.
- Pass a ≥10 s `timeout` to `findBy*`. A named constant (e.g. `LAZY_FIND_TIMEOUT_MS = 15_000`) documents intent.
- Prefer mocking the dynamic import with a synchronous module when the test is not specifically exercising the lazy-load path.

See `src/story/App.test.tsx` for the canonical pattern.

## References

- `DEVELOPMENT.md`
- `AGENTS.md` (AI workflow; `GEMINI.md` defers here)
- `src/shared/SHARED_UI_CONVENTIONS.md`
- `docs/DOCUMENTATION_STRATEGY.md` (where to put new docs; avoid duplication)
