# Lighthouse audit strategy (Labs)

How we use Lighthouse without treating it as the only performance signal.

**Related:** [`docs/PERFORMANCE.md`](PERFORMANCE.md) · [`docs/E2E_SMOKE_CONVENTIONS.md`](E2E_SMOKE_CONVENTIONS.md) · skill [`labs-new-micro-app`](../.cursor/skills/labs-new-micro-app/SKILL.md)

## Honest scope

| Question                                   | Answer                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Can we run Lighthouse on every app?        | **Yes** — `npm run audit:lighthouse -- --smoke-all --production`                         |
| Can we merge-block on “100 on everything”? | **No** — unrealistic for Dexie/MUI/WebGL micro-apps; dev-server perf is meaningless      |
| What do we merge-block on instead?         | Shell boot smokes, CUJ interaction latency, layout heuristics, scoped axe, bundle growth |

Labs SPAs fail in ways Lighthouse misses: radio lag, grid re-render cascades, Dexie live-query storms, revoked blob URLs. See [`PERFORMANCE.md`](PERFORMANCE.md) three-layer model.

## Three tiers

| Tier                  | Tool                                                                    | When                                               | CI                           |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------- |
| **1 — Interaction**   | `e2e/smoke/*interaction*.spec.ts`, CUJ budgets                          | Every presubmit push                               | Merge-blocking (scoped)      |
| **2 — Shell quality** | `app-shells`, layout heuristics, `layout-advisory` (axe/LCP/truncation) | Presubmit / scoped e2e                             | Merge-blocking where mapped  |
| **3 — Lighthouse**    | `npm run audit:lighthouse`                                              | On-demand, weekly advisory, before major perf work | **Advisory** (warnings only) |

## Running audits

```bash
# Single app (dev server must be running: npm run dev)
npm run audit:lighthouse -- --route /count/

# All smoke routes against production build (recommended)
npm run audit:lighthouse -- --smoke-all --production

# Strict exit code (local release gate — not presubmit default)
npm run audit:lighthouse -- --smoke-all --production --fail

# Record baseline for regression warnings
npm run audit:lighthouse -- --smoke-all --production --update-baseline
```

Reports write JSON to `.cache/lighthouse_*.json`. Baseline: [`docs/lighthouse-baseline.json`](lighthouse-baseline.json).

### Production budgets (advisory)

Relaxed for Labs micro-apps — tune after first full baseline pass:

| Category       | Min score | Notes                                                                     |
| -------------- | --------- | ------------------------------------------------------------------------- |
| Performance    | 65        | Heavy apps (Muscle, Gesture, Encore) may sit lower until optimized        |
| Accessibility  | 90        | Full-page MUI axe is noisy — prefer scoped `layout-advisory` for blocking |
| Best practices | 92        |                                                                           |
| SEO            | 80        | SPAs behind hash routes score lower — advisory only                       |

**Dev server:** ignore performance category; use only for quick a11y/best-practices spot checks.

## New-app guardrails (merge-blocking)

`npm run check:app-quality` (presubmit) enforces:

- Every `src/*/index.html` (and nested entries) ↔ row in [`e2e/routeRegistry.ts`](../e2e/routeRegistry.ts) with `smoke: true`
- Vite multi-page input registered in `vite.config.ts`
- `README.md`, `CUJs.md`, hardened `main.tsx` (StrictMode, `LabsErrorBoundary`, crash handlers, chrome CSS)

Also covered elsewhere:

- Shell HTML — `spaGuardrails.test.ts`
- Chrome contract — `check:chrome-ui`
- Import boundaries — `check:import-boundaries`

## When to act on Lighthouse feedback

| Audit finding                      | Action                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| Accessibility color-contrast       | Fix tokens/CSS; extend `layout-heuristics-*` if regressable |
| Render-blocking / unused JS        | Bundle pass; `npm run report:bundle-size`                   |
| LCP image/font                     | App-specific; add CUJ budget row                            |
| SEO meta                           | Update `index.html` metadata in same PR as new app          |
| Performance below 65 on production | Profile with Chrome trace; do not chase dev-server scores   |

## Agent workflow

1. New micro-app → follow [`labs-new-micro-app`](../.cursor/skills/labs-new-micro-app/SKILL.md); `check:app-quality` must pass.
2. New heavy UI → [`labs-ux-journey`](../.cursor/skills/labs-ux-journey/SKILL.md) + CUJ performance row.
3. User reports slow load → production Lighthouse on that route + [`labs-performance`](../.cursor/skills/labs-performance/SKILL.md).
4. Full portfolio audit → `--smoke-all --production --update-baseline`; triage warnings; do not block merge on first pass.

## Weekly advisory

Lighthouse runs on the **Nightly Portfolio Audit** schedule (`.github/workflows/nightly-portfolio-audit.yml`) — advisory only, does not fail the workflow. Refresh committed baselines manually:

```bash
npm run audit:lighthouse -- --smoke-all --production --update-baseline
```
