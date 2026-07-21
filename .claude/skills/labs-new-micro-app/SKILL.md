---
name: labs-new-micro-app
description: Adds a new Labs micro-app with Vite entry, SPA shell guardrails, and import boundary registration. Use when creating src/<app>/index.html, a new micro-app directory, or registering an app in vite.config.
---

<!-- AUTO-GENERATED from .agents/skills/labs-new-micro-app/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs new micro-app

## Checklist

1. Copy [`src/shared/templates/app-index.starter.html`](../../../src/shared/templates/app-index.starter.html) → `src/<app>/index.html` (fill metadata, theme-color, cookie consent trio)
2. Copy [`src/shared/templates/app-main.starter.tsx`](../../../src/shared/templates/app-main.starter.tsx) → `src/<app>/main.tsx` (it already passes `check:app-quality`); add `App.tsx`, `README.md`; optional `AGENTS.md` if high-churn; **`DESIGN.md`** when the app has a distinct visual identity
3. Register in **`vite.config.ts`** multi-page inputs (if not auto-picked up)
4. Register in **`src/shared/importBoundaries.test.ts`** and **`scripts/check-import-boundaries.mjs`**
5. Add theme slice in **`src/shared/ui/theme/appTheme.ts`** + wire in `main.tsx` (`applyAppTheme('<app>')`)
6. **`LabsBlockingJobProvider`** in `main.tsx` when the app uses Drive backup, blocking imports, or `useLabsBlockingJobs` (see Zine Box / Lyrefly)
7. Add route to [`e2e/routeRegistry.ts`](../../../e2e/routeRegistry.ts) with `smoke: true` when boot-stable — this auto-enrolls the app in the 390px responsive floor (`e2e/smoke/responsive-all-apps.spec.ts`); build mobile-first per [`docs/RESPONSIVE_DESIGN.md`](../../../docs/RESPONSIVE_DESIGN.md) § Mobile interaction parity (primary CUJs completable at 390px)
8. **Labs Home catalog** — add entry to [`src/labsHome/labsCatalog.manifest.json`](../../../src/labsHome/labsCatalog.manifest.json) (`stage`: `development` | `stable` | `unlisted`), run **`npm run generate:labs-catalog`**, add **`.app-icon.<app>`** CSS in [`public/styles/index.css`](../../../public/styles/index.css)
9. **Knip** — register app paths in [`knip.config.ts`](../../../knip.config.ts) when the app adds non-standard entry files
10. **Drive / Google** — when backup applies: `labsDrivePortfolioLayout.ts`, `labsGoogleSessionConsumers.ts`, portfolio backup hook
11. **Public runtime assets** — if the app imports from `public/<app>/`, commit those files in the **same PR** as `src/<app>/` (manifest, media, favicon). Add `npm run <app>:validate-assets` + guardrail test when assets are required for typecheck/boot.
12. **E2e smokes** — dedicated specs in `e2e/smoke/<app>-*.spec.ts`; register in `APP_SMOKE_SPECS` ([`scripts/run-scoped-e2e.mjs`](../../../scripts/run-scoped-e2e.mjs)) for scoped CI.
13. **Shell hardening** — `LabsErrorBoundary` + `installLabsCrashHandlers('appId')` in `main.tsx`; `CUJs.md` skeleton.
14. **Undo (Tier A)** — durable Dexie CRUD requires `LabsUndoProvider` + commit-returning mutation wrappers ([`src/shared/undo/README.md`](../../../src/shared/undo/README.md); enforced by `labsUndoTierACoverage.test.ts`)
15. **Keyboard shortcuts help** — mount `LabsKeyboardShortcutsHost` with a `*KeyboardShortcutSections()` helper (`Ctrl/Cmd + ?`); the starter template includes the help-only host
16. **URL state** — shareable view state syncs via shared urlHistory utilities ([`docs/URL_STATE_PATTERN.md`](../../../docs/URL_STATE_PATTERN.md), skill `labs-url-state`)
17. **Visual routes** — mark the route `visual: true` in `routeRegistry.ts` once the shell is stable; baselines import from Linux CI artifacts only (skill `labs-visual-regression`)
18. **Bundle baseline row** — run `npm run report:bundle-size -- --update-baseline` so the new app gets a row in `docs/bundle-size-baseline.json` (the two-tier gate fails on apps missing a baseline once they exceed the absolute cap; see [`docs/PERFORMANCE_BUDGETS.md`](../../../docs/PERFORMANCE_BUDGETS.md))
19. Run **`npm run check:app-quality`** — registry ↔ filesystem, CUJs, hardened `main.tsx`, vite entry
20. Run **`npm run presubmit`** — `spaGuardrails.test.ts` must pass

## Keep practices current

After landing a new app, if the checklist missed a step that CI caught, update **this skill** and optionally [`docs/DEVELOPMENT_AGENT_INDEX.md`](../../../docs/DEVELOPMENT_AGENT_INDEX.md) — same root-cause class as [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md) (`doc-drift`).

Reference implementations: **Lyrefly** (unlisted catalog, `DESIGN.md`, workflow stepper, Drive), **Zine Box** (blocking jobs provider), **Muscle Memory** (public assets guardrails).

## Rules

- [`.agents/rules/app-entry-html.md`](../../rules/app-entry-html.md) — shell invariants
- No cross-app imports; shared code only via `src/shared/**`
- User copy: [`docs/USER_COPY_STYLE.md`](../../../docs/USER_COPY_STYLE.md)
- Non-trivial UX: [`labs-ux-journey`](../../skills/labs-ux-journey/SKILL.md) — journey sketch before UI code

## References

- [`DEVELOPMENT.md`](../../../DEVELOPMENT.md) § SPA Shell Hardening
- [`docs/DEVELOPMENT_AGENT_INDEX.md`](../../../docs/DEVELOPMENT_AGENT_INDEX.md)
- [`docs/DOCUMENTATION_STRATEGY.md`](../../../docs/DOCUMENTATION_STRATEGY.md) — where to put `DESIGN.md`, `CUJs.md`
