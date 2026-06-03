---
name: labs-new-micro-app
description: Adds a new Labs micro-app with Vite entry, SPA shell guardrails, and import boundary registration. Use when creating src/<app>/index.html, a new micro-app directory, or registering an app in vite.config.
---

# Labs new micro-app

## Checklist

1. Copy [`src/shared/templates/app-index.starter.html`](../../src/shared/templates/app-index.starter.html) → `src/<app>/index.html` (fill metadata, theme-color, cookie consent trio)
2. Add `main.tsx`, `App.tsx`, `README.md`; optional `AGENTS.md` if high-churn
3. Register in **`vite.config.ts`** multi-page inputs (if not auto-picked up)
4. Register in **`src/shared/importBoundaries.test.ts`** and **`scripts/check-import-boundaries.mjs`**
5. Add route to [`e2e/routeRegistry.ts`](../../e2e/routeRegistry.ts) with `smoke: true` when boot-stable
6. Run **`npm run presubmit`** — `spaGuardrails.test.ts` must pass

## Rules

- [`.cursor/rules/app-entry-html.mdc`](../../rules/app-entry-html.mdc) — shell invariants
- No cross-app imports; shared code only via `src/shared/**`
- User copy: [`docs/USER_COPY_STYLE.md`](../../../docs/USER_COPY_STYLE.md)

## References

- [`DEVELOPMENT.md`](../../../DEVELOPMENT.md) § SPA Shell Hardening
- [`docs/DEVELOPMENT_AGENT_INDEX.md`](../../../docs/DEVELOPMENT_AGENT_INDEX.md)
