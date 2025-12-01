# Labs Monorepo - AI Assistant Guide

This monorepo contains multiple independent micro-apps sharing a unified build system. Each app is self-contained in `src/<app>/` with its own entry point, but all share dependencies and deployment.

## Project Structure

```
src/
  index.html          # Landing page
  shared/            # Shared utilities and test setup
  <app>/            # Each micro-app (cats, drums, zines, story, corp)
    index.html       # App entry point
    main.tsx         # React entry
    App.tsx          # Main component
    GEMINI.md        # App-specific AI guide
    DEVELOPMENT.md   # Architecture Decision Records
    README.md        # Human-readable overview
```

## Technology Stack

- **React 18** with TypeScript (strict mode)
- **Vite** for build tooling (multi-page configuration)
- **Vitest + React Testing Library** for testing
- **Tailwind CSS v3** (not v4 - use stable v3.4.x)
- **GitHub Actions** for CI/CD

## Development Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
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

- **README.md**: Human-readable overview (root and per-app)
- **GEMINI.md**: AI-focused guide (this file and per-app)
- **DEVELOPMENT.md**: Architecture Decision Records (root and per-app)

For detailed architecture, CI/CD, and development patterns, see:

- `DEVELOPMENT.md` - Major development patterns and ADRs
- `src/<app>/DEVELOPMENT.md` - App-specific architecture decisions
- `src/<app>/README.md` - App overview and features

## Code Quality

- **Linting**: ESLint enforces code quality (run `npm run lint`)
- **Testing**: Comprehensive test coverage required (run `npm test`)
- **Type Safety**: TypeScript strict mode enabled
- **Style**: Follow Google TypeScript Style Guide (see `DEVELOPMENT.md`)

Use deterministic tools (linters, formatters) rather than asking AI to enforce style.

## Cache Busting

HTML files use `NetworkFirst` strategy and cache-control headers to ensure fresh content. Static assets use content-based hashes. See `DEVELOPMENT.md` for details.

## E2E Tests

E2E tests are co-located with each micro-app: `src/<app>/e2e/*.spec.ts`
