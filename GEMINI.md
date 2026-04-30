# Labs Monorepo - AI Assistant Guide (Legacy)

> **New canonical entry point: see [`AGENTS.md`](./AGENTS.md).** This file is kept for backwards compatibility with Gemini-specific workflows; if `AGENTS.md` and this file disagree, `AGENTS.md` wins.

This monorepo contains multiple independent micro-apps sharing a unified build system. Each app is self-contained in `src/<app>/` with its own entry point, but all share dependencies and deployment.

## Project Structure

```
src/
  index.html          # Landing page
  shared/             # Shared utilities and test setup
  <app>/              # Each micro-app (beat, cats, chords, count, drums, piano,
                      # pitch, scales, story, words, zines, corp, ui, …)
    index.html        # App entry point
    main.tsx          # React entry
    App.tsx           # Main component
    README.md         # Human-readable overview (every app has one)
    ARCHITECTURE.md   # Architecture notes (where applicable, e.g. beat, count, piano)
    DEVELOPMENT.md    # Architecture Decision Records (where applicable, e.g. cats, drums, story)
```

## Technology Stack

- **React 19** with TypeScript (strict mode)
- **Vite** for build tooling (multi-page configuration)
- **Vitest + React Testing Library** for testing
- **Tailwind CSS v3** (not v4 - use stable v3.4.x)
- **GitHub Actions** for CI/CD

## Development Commands

```bash
npm run dev          # Start dev server (http://127.0.0.1:5173)
npm test             # Run all tests
npm run lint         # Check code quality
npm run build        # Production build
```

## Adding a New Micro-App

1. Create `src/<app>/` directory
2. Add `index.html`, `main.tsx`, `App.tsx`
3. Update `vite.config.ts` `rollupOptions.input` to include new app
4. Add link in `src/index.html` landing page

## Documentation Structure

- **AGENTS.md**: Canonical AI-assistant entry point (universal convention).
- **README.md**: Human-readable overview (root and per-app).
- **DEVELOPMENT.md**: Architecture Decision Records (root; per-app where present).
- **STYLE_GUIDE.md**: TypeScript + UI/a11y conventions.
- **docs/SOURCE_OF_TRUTH.md**: Documentation precedence and canonical ownership.
- **GEMINI.md**: Legacy Gemini-specific aliases; defers to `AGENTS.md`.

For detailed architecture, CI/CD, and development patterns, see:

- `DEVELOPMENT.md` — Major development patterns and ADRs.
- `src/<app>/DEVELOPMENT.md` — App-specific architecture decisions (where present).
- `src/<app>/ARCHITECTURE.md` — App-specific architecture notes (where present).
- `src/<app>/README.md` — App overview and features.

## Code Quality

- **Linting**: ESLint enforces code quality (run `npm run lint`)
- **Testing**: Comprehensive test coverage required (run `npm test`)
- **Type Safety**: TypeScript strict mode enabled
- **Style**: Follow Google TypeScript Style Guide (see `DEVELOPMENT.md`)

Use deterministic tools (linters, formatters) rather than asking AI to enforce style.

## Accessibility and UI Implementation Rules

- Use MUI first for complex widgets: `Dialog`, `Menu`, `Popover`, `Autocomplete`, `Select`.
- Preserve each app's style identity with app-level theme tokens; do not flatten everything into one global visual style.
- Avoid new ad hoc focus traps and click-away logic when an MUI primitive already solves the interaction model.
- For touched UI code, ensure keyboard operability and visible focus states.
- Resolve meaningful `jsx-a11y` warnings in changed areas before finishing a task.
- Prefer shared primitives in `src/shared/components` before creating app-local interaction components.

## Cache Busting

Labs pages do not use a service worker/PWA strategy. HTML should be fetched fresh from origin, while static assets use content-hash filenames and cache headers. See `DEVELOPMENT.md` for details.

## E2E Tests

E2E tests are co-located with each micro-app: `src/<app>/e2e/*.spec.ts`
