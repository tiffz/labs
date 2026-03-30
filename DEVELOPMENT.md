# Development Guide - Architecture Decision Records

This document records major architectural decisions and development patterns for the Labs monorepo.

## Code Style

This project follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) for consistent code formatting and patterns.

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

GitHub Actions runs lint, tests, e2e smoke checks, and builds on code changes. Docs/assets deploys also run lint and fast tests before build.

### Testing Strategy

- Co-located test files alongside source code
- Comprehensive coverage required
- E2E tests in `src/<app>/e2e/` per app
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

**Fast mode** excludes:

- `*.regression.test.{ts,tsx}` - Slow integration tests
- `HeartSpawningService.test.ts` - Complex animation tests

**Full mode** includes:

- All standard tests
- BPM detection benchmarks (~2.5 min)

### Pre-commit Hook Behavior

The pre-commit hook intelligently selects test mode:

- **Beat BPM benchmark files changed** → Full tests with benchmarks
- **Cat/regression files changed** → Standard tests
- **Other files** → Fast tests only
- Shared catalog is regenerated and staged automatically before these checks.

For canonical docs precedence when guidance conflicts, see `docs/SOURCE_OF_TRUTH.md`.

### Pre-push Guardrail

- `pre-push` runs `npm run check:shared-catalog`.
- If drift is detected, it prints a non-blocking reminder. CI still regenerates catalog before lint/test/build.

### Regression Test Architecture

Complex regression tests are split into focused files for parallel execution:

- `src/cats/regression/sleep.regression.test.tsx` - Sleep state transitions
- `src/cats/regression/zzz-positioning.regression.test.tsx` - Z element positioning
- `src/cats/regression/state-sync.regression.test.tsx` - State synchronization

Shared test utilities: `src/cats/test/regressionTestUtils.tsx`

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
