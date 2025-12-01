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

## Cache Busting Strategy

### Decision

Implement multi-layered cache busting to ensure users always get fresh content.

### Rationale

Users were experiencing stale UI updates requiring manual hard refresh.

### Implementation

**HTML Files**: Never cached - `NetworkFirst` service worker strategy with `maxAgeSeconds: 0`, cache-control meta tags

**Static Assets**: Content-based hashes - filename changes when content changes, `StaleWhileRevalidate` with 30-day cache

**Service Worker**: Auto-updates via `registerType: 'autoUpdate'`, HTML excluded from precaching

**Deployment Headers**: `public/_headers` file for platforms that support it

### Benefits

- Users always see latest updates
- Static assets cached efficiently
- No manual refresh required

## Quality Assurance

### Pre-commit Checks

Tests and linting run automatically before commits. Tests only run if TypeScript/JavaScript files are staged.

### Continuous Integration

GitHub Actions runs full test suite and builds on code changes. Documentation/asset changes deploy without tests for speed.

### Testing Strategy

- Co-located test files alongside source code
- Comprehensive coverage required
- E2E tests in `src/<app>/e2e/` per app

## Development Commands

```bash
npm run dev          # Start dev server
npm test             # Run all tests
npm run lint         # Check code quality
npm run build        # Production build
```

For detailed CI/CD troubleshooting, see `.github/workflows/ci.yml` and GitHub Actions logs.
