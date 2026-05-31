# Development Guide - Architecture Decision Records

This document records major architectural decisions and development patterns for the Labs monorepo.

Formal **Architecture Decision Records** live under [`docs/adr/`](docs/adr/README.md) when a choice needs durable context and alternatives (not every PR). Policy, checklists, and enforced guardrails stay here; ADRs capture cross-cutting intent—see for example [ADR 0001: static hosting and hash routing](docs/adr/0001-static-hosting-hash-routing.md). [ADR 0002](docs/adr/0002-historical-decisions-in-development.md) describes how this file and ADRs relate for **historical** decisions.

For **where to put new docs**, avoiding duplication, and promoting app-local notes to repo-wide guides, see [`docs/DOCUMENTATION_STRATEGY.md`](docs/DOCUMENTATION_STRATEGY.md).

## Code Style

This project follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) for consistent code formatting and patterns.

User-visible product copy (dialogs, errors, landings) should follow [`docs/USER_COPY_STYLE.md`](docs/USER_COPY_STYLE.md); app-specific voice notes may live in `src/<app>/COPY_STYLE.md` where present.

## Monorepo Architecture

### Decision

Use Vite multi-page configuration to support multiple independent micro-apps sharing a unified build system.

### Rationale

- Single dependency management reduces maintenance overhead
- Shared build configuration ensures consistency
- Independent apps can evolve separately
- Unified deployment pipeline

### Implementation

- Each micro-app in `src/<app>/` with its own `index.html` entry point
- Vite `rollupOptions.input` configured for each app
- Shared dependencies in root `package.json`
- Shared test setup in `src/shared/test/`

### Benefits

- Easy to add new micro-apps
- Consistent build and deployment process
- Shared utilities and test infrastructure

## Cross-App Reuse Boundary

### Decision

Any logic used by more than one app must live in `src/shared/**`. App directories must never import from other app directories.

### Rationale

- App-to-app imports create hidden coupling and make refactors risky.
- Shared modules provide one canonical implementation and reduce drift.
- New apps should compose shared primitives rather than copy existing app logic.

### Rules

- Allowed:
  - `src/<app>/** -> src/shared/**`
  - `src/shared/** -> src/shared/**`
- Not allowed:
  - `src/<app-a>/** -> src/<app-b>/**`
  - `src/shared/** -> src/<app>/**`

### Implementation Pattern

- Promote reusable logic into `src/shared/**` as source-of-truth modules.
- If migration is needed, keep short-lived app-local adapter/re-export shims, then remove them once imports are updated.
- New feature work should target shared modules directly when cross-app reuse is expected.
- Guardrail: `src/shared/importBoundaries.test.ts` enforces a strict no app-to-app import rule.

## Labs debug mode (local development)

### Decision

Use a single URL contract for “extra diagnostics on”: either `?debug` or `?dev` (same semantics). Gate **info/debug** traffic to the Vite `POST /__debug_log` endpoint on that flag; keep **errors and warnings** streaming in dev without the flag so import-time failures still surface in the terminal.

### Implementation

- URL parsing: [`src/shared/debug/readLabsDebugParams.ts`](src/shared/debug/readLabsDebugParams.ts) (`isLabsDebugEnabled`, `isLabsOverlayEnabled` for cats-style overlays).
- Optional structured logs from app code: [`src/shared/debug/labsDebugLog.ts`](src/shared/debug/labsDebugLog.ts) (`labsDebug.info` / `labsDebug.debug` respect the same URL gate; `labsDebug.warn` always forwards in dev).
- Shared debug chrome: [`src/shared/components/LabsDebugDock.tsx`](src/shared/components/LabsDebugDock.tsx) (collapse, **Copy bundle** → [`copyLabsDebugBundleToClipboard`](src/shared/debug/copyLabsDebugBundle.ts) for LLM/bug-report paste).
- Vite middleware normalizes batched `{ logs: [...] }` and single-object bodies: [`src/shared/debug/debugLogPostBody.ts`](src/shared/debug/debugLogPostBody.ts).
- Cats dev snapshots: `POST /__debug_snapshot` writes under [`.debug-snapshots/`](.debug-snapshots/) (gitignored). Optional Cursor hook: watch that folder to attach artifacts to a chat.

### Agentic debugging (recommended)

Prefer **structured repro** (URL with flags, steps, expected vs actual), **automated tests** (Vitest) for logic, and **Playwright traces or screenshots** for UI over long console-only threads. Use **Copy bundle** or `.debug-snapshots/` output as a single pasteable artifact for assistants.

## Cache Busting Strategy

### Decision

Implement multi-layered cache busting to ensure users always get fresh content.

### Rationale

Users were experiencing stale UI updates requiring manual hard refresh.

### Implementation

**HTML Files**: Fresh on navigation from origin server + cache-control meta tags.

**Static Assets**: Content-based hashes - filename changes when content changes, `StaleWhileRevalidate` with 30-day cache

**Service Worker**: Not used for Labs surfaces (intentionally disabled so Labs is not installable as a PWA).

**Deployment Headers**: `public/_headers` file for platforms that support it

### Benefits

- Users always see latest updates
- Static assets cached efficiently
- No manual refresh required

## Accessibility and UI Primitive Strategy

### Decision

Adopt MUI as the default primitive library for complex interactive widgets and enforce accessibility guardrails through linting and tests.

### Rationale

- Custom dialog/menu implementations were producing repeat regressions in keyboard navigation and focus behavior.
- Shared primitives reduce maintenance burden and improve consistency across apps.
- A11y checks should be enforced by tooling, not just code review.

### Implementation

- Use MUI primitives (`Dialog`, `Menu`, `Popover`, `Autocomplete`, `Select`) for complex interaction surfaces.
- Keep per-app look-and-feel using app-scoped theme tokens and ThemeProviders.
- Enable `eslint-plugin-jsx-a11y` in the root ESLint flat config.
- Add shared accessibility test helpers in `src/shared/test/` for repeatable audits.

### Benefits

- Better baseline accessibility across all micro-apps.
- Fewer bespoke focus-trap/click-away bugs.
- Faster future development through reusable, tested patterns.

## Responsive-By-Default UI Policy

### Decision

All music apps must ship mobile-first layouts and shared controls that remain usable at phone widths without horizontal scrolling.

### Rationale

- Several music pages were desktop-first and became difficult to use on phones.
- Responsive behavior must be part of the default shared layer, not only app-specific fixes.
- Guardrails in docs + shared CSS reduce regressions when new apps/components are added.

### Implementation

- Use mobile-first breakpoints as defaults: `<=480px` (phone), `<=768px` (tablet), `>768px` (desktop).
- Keep minimum touch target size at `44px` for primary interactive controls.
- For app shells:
  - Avoid `100vw`/fixed-width layouts that force horizontal overflow.
  - Prefer `width: 100%`, `minmax(0, 1fr)`, and bounded `max-width` containers.
  - Ensure sticky headers/controls still allow content scrolling on narrow screens.
- For shared dropdowns/popovers (BPM, key, progression, style):
  - Clamp width to viewport (`calc(100vw - padding)`).
  - Collapse multi-column menus to fewer columns on smaller breakpoints.
- For JS-driven geometry:
  - Recompute viewport-dependent positions on resize.
  - Avoid hard-coded desktop offsets when placing floating UI.

### Benefits

- New music features are responsive by default.
- Existing apps share the same mobile interaction baseline.
- Less app-by-app rework after first mobile QA pass.

## Quality Assurance

### Pre-commit Checks

Tests and linting run automatically before commits. Tests only run if TypeScript/JavaScript files are staged.
Import boundaries are always validated via `npm run check:import-boundaries` so presubmit and CI enforce the same boundary guard.

### Continuous Integration

GitHub Actions runs lint, app typechecks, tests, e2e smoke checks, and builds on code changes. Docs/assets deploys also run lint and fast tests before build.
Production rollback is available through `.github/workflows/rollback.yml` (manual dispatch with a known-good commit SHA).

### Testing Strategy

- Co-located test files alongside source code
- Add tests when behavior is **non-obvious**, **regression-prone**, or encodes a **documented invariant**; do not test trivial getters or mirror implementation line-for-line
- Prefer **deterministic** fixtures over `Math.random()` in unit tests (flaky tests erode trust)
- Prefer **small fast smokes** in presubmit over huge matrices; put exhaustive audits behind `*audit*` / `*stress*` filename conventions so `test:fast` skips them
- Prefer patterns already in the directory you are editing
- E2E tests in `src/<app>/e2e/` per app; cross-app smokes in `e2e/`
- Regression tests in `src/<app>/regression/` for complex integration testing

### Test Modes

The test suite is optimized for different development scenarios:

| Mode       | Command                   | Duration | Use Case              |
| ---------- | ------------------------- | -------- | --------------------- |
| Standard   | `npm test`                | ~25s     | CI, full validation   |
| Fast       | `npm run test:fast`       | ~17s     | Development iteration |
| Full       | `npm run test:full`       | ~3min    | Includes benchmarks   |
| Watch      | `npm run test:watch`      | -        | TDD workflow          |
| Watch Fast | `npm run test:watch:fast` | -        | Fast TDD workflow     |

**Fast mode** (`FAST_TESTS=true`, used by presubmit) excludes files whose names contain:

- `regression`, `audit`, `stress`, or `benchmark` (e.g. `generationQualityAudit.test.ts`, `*.audio-regression.test.ts`)
- `HeartSpawningService.test.ts` — complex animation timing

**High-ROI fast smokes** (always in presubmit):

- `generationQualityInvariants.test.ts` — small generation matrix (~3 combos)
- Hook tests colocated with extracted modules (`useWordsPlaybackLifecycle.test.ts`, etc.)
- Guardrails (`spaGuardrails.test.ts`, `importBoundaries.test.ts`)

**Full mode** includes BPM detection benchmarks (~2.5 min). Run manually when touching beat analysis:

```bash
INCLUDE_BEAT_BENCHMARK=true npm test
```

Verbose generation audit logging (optional):

```bash
VITEST_VERBOSE_AUDIT=true npm run test:words:audit:verbose
```

Targeted audit commands:

```bash
npm run test:audits          # words + story exhaustive audits
npm run test:words:audit     # generation quality matrix only
npm run test:story:audit     # story generation + placeholder leak audits
```

### Pre-commit Hook Behavior

The pre-commit hook intelligently selects test mode:

- **Beat BPM benchmark files changed** → Full tests with benchmarks
- **Cat/regression files changed** → Standard tests
- **Other files** → Fast tests only
- Shared catalog is regenerated and staged automatically before these checks.

For canonical docs precedence when guidance conflicts, see `docs/SOURCE_OF_TRUTH.md`.
For rollback procedures, see `docs/ROLLBACK.md`.

### Pre-push Guardrail

- `pre-push` runs `npm run check:shared-catalog`.
- If drift is detected, it prints a non-blocking reminder. CI still regenerates catalog before lint/test/build.

### Regression Test Architecture

Complex regression tests are split into focused files for parallel execution:

- `src/cats/regression/sleep.regression.test.tsx` - Sleep state transitions
- `src/cats/regression/zzz-positioning.regression.test.tsx` - Z element positioning
- `src/cats/regression/state-sync.regression.test.tsx` - State synchronization

Shared test utilities: `src/cats/test/regressionTestUtils.tsx`

### Visual and Audio Regression Policy

Canonical workflow and commands: `docs/REGRESSION_WORKFLOW.md`.

- Visual regression snapshots are captured by Playwright via `e2e/visual/apps.visual.spec.ts`. Incremental updates: `npm run test:e2e:visual:update`; full wipe + regenerate all PNGs: `npm run test:e2e:visual:update:fresh`.
- Audio regression uses strict SHA-256 hashes for deterministic fixtures via `src/beat/utils/syntheticAudioGenerator.audio-regression.test.ts`.
- Baseline updates must be explicit (use dedicated `:update` scripts) and manually reviewed before merge.
- CI uploads visual and audio regression artifacts for browseable PR review.
- Agent default behavior: run regressions, review diffs directly, and escalate uncertain diffs to the user instead of silently accepting them.

### Micro-app UI stability (fonts, responsiveness, layout shift)

- **Fonts:** Import [`src/shared/ui/fonts/appFonts.ts`](src/shared/ui/fonts/appFonts.ts) as the **first** import in each micro-app `main.tsx` so Roboto, Inter, and Caveat load from `@fontsource/*` (aligned with MUI `getAppTheme()` and Playwright font stubs). Do **not** add separate `fonts.googleapis.com` links for those families in `index.html`—mixed `display=optional` vs `swap` caused inconsistent weight and hard-refresh jitter. Keep **only** exceptions that are not bundled (e.g. **Noto Color Emoji** on the Corp app).
- **Icons:** Call `initMaterialIconRuntime()` after logger setup; the `icons-pending` / `icons-ready` contract is documented in `src/shared/ui/icons/materialIconsBootstrap.ts`.
- **Responsiveness:** App shells should be usable at **~390px** width—the mobile viewport used in `e2e/visual/apps.visual.spec.ts`. Avoid fixed desktop-only side margins (`ml-80` without a mobile drawer/stack pattern), horizontal overflow, and unbreakable min-widths on primary chrome.
- **Layout shift:** Prefer reserved space for above-the-fold chrome (`min-height` on headers/toolbars, explicit `width`/`height` on decorative images where helpful). After intentional layout or font pipeline changes, update visual baselines per `docs/REGRESSION_WORKFLOW.md`.

## Development Commands

```bash
npm run dev          # Start dev server
npm test             # Run all tests (standard mode)
npm run test:fast    # Fast tests for development
npm run test:full    # Full tests including benchmarks
npm run lint         # Check code quality
npm run build        # Production build
```

## Shared Music and Catalog Guardrails

- Canonical shared music architecture: `src/shared/music/ARCHITECTURE.md`
- Shared catalog generation:
  - `npm run generate:shared-catalog`
  - `npm run check:shared-catalog` (optional guard command)
- Standard workflows (`lint`, `test`, `build`, and CI) regenerate the catalog automatically.
- Shared boundary enforcement runs in CI (`src/shared/**` must not import app directories).

For detailed CI/CD troubleshooting, see `.github/workflows/ci.yml` and GitHub Actions logs.

## CSS Layering for Multi-App Isolation

### Decision

Separate neutral global base CSS from decorative page chrome to prevent style bleed into new micro-apps.

### Implementation

- `public/styles/shared.css` is app-safe and intentionally minimal (box sizing + baseline document sizing only).
- `public/styles/labs-home.css` contains decorative "home-style" visuals (background gradients, bubbles, global heading treatment).
- New app pages should include `/styles/shared.css` by default and only include `/styles/labs-home.css` when intentionally building a landing-style page.
- Starter template for new app entry HTML: `src/shared/templates/app-index.starter.html`.

### Benefits

- New app UIs no longer need brittle overrides for inherited `body`/`h1` styles.
- Decorative site styling becomes opt-in and easier to evolve independently.

## SPA Shell Hardening

### Decision

Every app entry HTML must paint its resting background before any CSS loads, must not install a service worker or PWA manifest, and must short-circuit any browser install prompt.

### Rationale

- A flash of unstyled content (FOUC) was visible in production while `pulse.css`, `piano.css`, etc. streamed in — the browser painted the default white background before the app's theme took over.
- Labs is an experimentation surface, not an installable product. Chrome's PWA heuristics could still fire `beforeinstallprompt` on repeat visits even though we don't ship a manifest, and a stale `vite-plugin-pwa` service worker had been observed on older deploys.

### Implementation

- **Critical inline CSS.** Every `src/*/index.html` ships a single `<style>html{color-scheme:X;background:#...;color:#...}</style>` block in `<head>` that matches the app's resting body background. Keep it tiny (two declarations at most).
- **`color-scheme` meta.** Pair the inline CSS with `<meta name="color-scheme" content="light | dark" />` so native form controls, scrollbars, and the first frame of the page use the right palette.
- **Service-worker purge + install block.** `vite.config.ts` rewrites each built `index.html` to:
  1. Unregister any existing `ServiceWorker` registrations (legacy `vite-plugin-pwa` worker, etc.).
  2. Attach `addEventListener("beforeinstallprompt", e => e.preventDefault())` and `"appinstalled"` listeners so Chrome never surfaces the install banner.
- **No manifest, no SW.** Do not add `link rel="manifest"` or register a service worker in any app. The kill-switch worker in `public/sw.js` exists only to unregister old deployments and clear their caches.
- **Cache headers.** HTML entries only set `<meta http-equiv="Cache-Control" content="no-cache" />`. The triple `no-cache, no-store, must-revalidate` was retired because `build-version.txt` polling already forces a reload on new releases, and aggressive `no-store` defeated useful HTTP caching.
- **Canonical template.** `src/shared/templates/app-index.starter.html` encodes this contract. Start new apps by copying it verbatim.

### Benefits

- No FOUC on cold loads. The paint matches the final theme.
- PWA install prompts are impossible to reach, intentionally.
- Old service workers on returning devices self-destruct on first visit.

## Accessibility Baseline

### Decision

Every app mounts its primary content inside a single `<main id="main">` landmark, renders a `<SkipToMain />` link as the first focusable element, and inherits a global `prefers-reduced-motion` override from `public/styles/shared.css`.

### Rationale

- Keyboard and screen-reader users were forced to tab through repeated header chrome to reach app content.
- Some apps removed browser-default focus outlines without providing a replacement ring, failing WCAG 2.4.7.
- Animations played at full speed even when the OS requested reduced motion.

### Implementation

- **Landmarks.** Wrap the active content area in `<main id="main">`. If the surrounding element already controls layout (flex, grid), prefer applying `display: contents;` to `<main>` so existing layout isn't disturbed.
- **Skip link.** Import and render `src/shared/components/SkipToMain.tsx` as the first child of the app root. Styling lives in `public/styles/shared.css` (`.skip-to-main`) and every app must link that stylesheet.
- **Focus rings.** Never use bare `outline: none`. If you must suppress the default ring, replace it with a matching `:focus-visible` rule using the theme accent.
- **Icon-only buttons.** Provide `aria-label` on every icon-only button. `AppTooltip` uses `describeChild={true}` and therefore does _not_ become the button's accessible name.
- **Reduced motion.** The global override in `shared.css` clamps animation, transition, and scroll durations under `@media (prefers-reduced-motion: reduce)`. Apps only need to re-enable an animation inside their own `@media` block if it is essential to the UX.
- **Contrast.** Muted text tokens must meet WCAG AA (4.5:1 on the app's background). Piano's muted token was bumped from `#94a3b8` to `#64748b` as reference.

### Benefits

- Keyboard and AT users can bypass chrome and reach the app in one keystroke.
- Focus is always visible for keyboard users.
- Reduced-motion requests are honored automatically without per-app work.

## Cross-Platform Viewport

### Decision

Use `100dvh` with a `100vh` fallback for fullscreen app shells, never `100vh` alone.

### Rationale

iOS Safari's dynamic viewport (address bar hide/show) makes `100vh` overshoot the screen and hide bottom chrome behind the toolbar. `100dvh` tracks the visible area exactly.

### Implementation

```css
.app-shell {
  height: 100vh; /* fallback for old browsers */
  height: 100dvh; /* real answer for modern Safari/Chrome */
}
```

All existing app shells (pitch, words, cats, forms, chords, beat, drums, scales) have been migrated. New app CSS must follow the same pattern.

## App shell layout (column + workbench)

### Decision

Apps with a fixed content width and an optional footer (library, status) use a shared **column → workbench → scroll → content + footer** shell so horizontal alignment does not drift between CSS, `sx`, and TS constants.

### Implementation

- **Shared:** [`src/shared/layout/AppShellLayout.tsx`](src/shared/layout/AppShellLayout.tsx), [`app-shell-layout.css`](src/shared/layout/app-shell-layout.css), [`src/shared/layout/README.md`](src/shared/layout/README.md)
- **New app starters:** copy [`app-index.starter.html`](src/shared/templates/app-index.starter.html), [`app-main.starter.tsx`](src/shared/templates/app-main.starter.tsx), [`app-layout.starter.css`](src/shared/templates/app-layout.starter.css) into `src/<app>/`
- **Reference app:** Stanza — [`StanzaViewerLayout`](src/stanza/components/StanzaViewerLayout.tsx), [`stanza-viewer-layout.css`](src/stanza/stanza-viewer-layout.css), [`src/stanza/LAYOUT.md`](src/stanza/LAYOUT.md)
- **Layout in CSS only** — width, gutter, and grid template belong in the app layout CSS file, not scattered `sx` on the workspace component
- **Workbench width** — `width: var(--app-shell-content-width); max-width: 100%`, not `width: 100%` + `max-width` on siblings (prevents footer wider than the grid)

### E2E

- Stanza alignment smoke: [`e2e/stanza-viewer-layout.spec.ts`](e2e/stanza-viewer-layout.spec.ts)

## Iteration handoff (AI + humans)

When stopping **mid-refactor** or after a multi-attempt bugfix (hand off **state**, not process):

1. Update the relevant iteration doc (`src/<app>/LAYOUT.md`, `PRACTICE_RAIL.md`, `DEVELOPMENT.md`) with **current state**, **pitfalls**, and **next step** — not a play-by-play history.
2. If layout was touched, note whether browser verification and layout e2e were run.
3. Do not leave duplicate width constants in TS; point to CSS tokens.

Related: **process retrospective** → [`CONTINUOUS_PROCESS_IMPROVEMENT.md`](docs/CONTINUOUS_PROCESS_IMPROVEMENT.md). **Bug-fix handoff** → PR template § Bug-fix handoff. See [`AGENTS.md`](AGENTS.md) § Handoff types.

## Bundle Splitting

### Decision

Emit a deterministic vendor chunk map for `react`, `@mui`, `vexflow`, and `three` so that apps which don't use those deps don't pay for them.

### Implementation

`vite.config.ts` uses a function-form `manualChunks`:

```ts
manualChunks: (id) => {
  if (!id.includes('node_modules')) return undefined;
  if (
    id.includes('react-dom') ||
    id.includes('/react/') ||
    id.endsWith('/react')
  )
    return 'vendor';
  if (id.includes('@mui/') || id.includes('@emotion/')) return 'mui';
  if (id.includes('vexflow')) return 'vexflow';
  if (id.includes('three') || id.includes('@react-three')) return 'three';
  return undefined;
};
```

Combined with path imports from `@mui/material/<Component>` (not barrel imports from `@mui/material`), each app only ships the MUI/vexflow/three code it actually references.

### Related rules

- **No `@mui/material` barrel imports.** Import each component from its path: `import Button from '@mui/material/Button'`.
- **Lazy-load heavy modals and optional surfaces** with `React.lazy` + `<Suspense>`. Reference implementations: `src/piano/App.tsx` (ImportModal, Analytics, VideoPlayer, DebugPanel) and `src/beat/App.tsx` (YouTubePlayer).

## Playback UI patterns

Cross-app playback hooks, notation render order, portaled picker skins, and loading empty states share one set of regressions. Before editing chart playback, `DrumNotationMini`, `PlaybackSoundSelect`, or VexFlow chord renderers:

- [`src/shared/hooks/PLAYBACK_HOOK_PATTERN.md`](src/shared/hooks/PLAYBACK_HOOK_PATTERN.md) — generation token, synchronous derived display state, real `stopAll`, required tests.
- [`src/shared/music/PLAYBACK_RENDERING_AUDIT.md`](src/shared/music/PLAYBACK_RENDERING_AUDIT.md) — VexFlow step order, highlight persistence, shared boundaries.
- [`src/shared/SHARED_UI_CONVENTIONS.md`](src/shared/SHARED_UI_CONVENTIONS.md) § Playback field selects — portaled appearance checklist.
- [`.cursor/rules/playback-ui-regressions.mdc`](.cursor/rules/playback-ui-regressions.mdc) — agent rule for hot-path files.
- Playwright smokes: [`e2e/playback-ui-regressions.spec.ts`](e2e/playback-ui-regressions.spec.ts) (see [`docs/REGRESSION_WORKFLOW.md`](docs/REGRESSION_WORKFLOW.md)).

## Continuous process improvement

After meaningful work, review the session for durable process fixes—not only product fixes. Agents should **offer** a brief retrospective at session end; humans should do the same when closing a branch or PR.

Full workflow: [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](docs/CONTINUOUS_PROCESS_IMPROVEMENT.md). Agent checklist: [`AGENTS.md`](AGENTS.md) § Continuous process improvement.
