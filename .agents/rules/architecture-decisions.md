---
description: Record material cross-cutting architecture decisions under docs/adr when changing routing, hosting, or contracts
globs:
  - docs/adr/**/*
  - vite.config.ts
  - playwright.config.ts
  - scripts/check-import-boundaries.mjs
  - src/**/routes/**/*
  - src/shared/importBoundaries.test.ts
---

# Architecture Decision Records

When you introduce or change a **material** cross-cutting behavior—**client routing vs static hosting**, **OAuth / storage / sync contracts**, **new micro-app or import-layer rules**—add **`docs/adr/NNNN-short-title.md`** in the same PR when practical, following [`docs/adr/README.md`](../../docs/adr/README.md). Update [`DEVELOPMENT.md`](../../DEVELOPMENT.md) if repo-wide policy text should point at the ADR.

Do not use ADRs for routine features or small refactors unless they establish a new pattern others must follow.
