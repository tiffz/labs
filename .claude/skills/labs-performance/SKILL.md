---
name: labs-performance
description: Profiles and fixes Labs interaction and sustained performance using CUJ budgets, Playwright interaction smokes, React render isolation, and Chrome trace when needed. Use when users report laggy UI, radio/checkbox delay, grid jank, or when adding performance benchmarks for critical user journeys.
---

<!-- AUTO-GENERATED from .agents/skills/labs-performance/SKILL.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

# Labs performance

**Read first:** [`docs/PERFORMANCE.md`](../../../docs/PERFORMANCE.md).  
**Budgets (canonical thresholds + enforcement points):** [`docs/PERFORMANCE_BUDGETS.md`](../../../docs/PERFORMANCE_BUDGETS.md).  
**Journeys:** [`docs/CRITICAL_USER_JOURNEYS.md`](../../../docs/CRITICAL_USER_JOURNEYS.md) → app `src/<app>/CUJs.md`.

Optional deep trace audit: user-global skill **`web-perf`** (Chrome DevTools MCP) when configured.

## When to activate

- User reports sluggish clicks, typing lag, or grid flicker
- Adding/changing state on a screen with **grids, media, or Dexie live queries**
- After a perf fix — add regression guard (interaction smoke or invariant)
- User asks to benchmark or instrument a **critical user journey**

## Workflow

### 1. Pick the CUJ step

Open `src/<app>/CUJs.md`. Identify the **step number** and existing budget/verification row. If missing, add a CUJ stub before optimizing.

### 2. Reproduce (hard refresh)

```bash
npm run dev
# Hard refresh affected route — HMR hides render-cascade bugs
```

Use **`cursor-ide-browser`** or DevTools:

- React **Profiler** — record while repeating the laggy click; look for unexpected grid/card re-renders
- **Performance** panel — long tasks > 50 ms on click
- **Console** — blob errors, refetch loops (Gesture)

Ignore browser extension noise (`background-redux`, LastPass, etc.) unless reproduced in a clean profile.

### 3. Diagnose (symptom → class)

| Symptom                                        | Likely class           | First checks                                 |
| ---------------------------------------------- | ---------------------- | -------------------------------------------- |
| Radio/checkbox slow, grid flickers             | `render-cascade`       | State in parent? memo on grid? stable props? |
| Every toggle resort/shuffles hundreds of items | `main-thread-jank`     | Queue/build on interaction path              |
| Network spikes on option change                | `warmup-storm`         | Prefetch keyed on shuffle/random queue       |
| Thumbs blank / tab crash                       | `revoked-blob-display` | Gesture media tier doc                       |
| Only slow in dev after edits                   | `hmr false confidence` | Hard refresh                                 |

Labels: [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../../../docs/CONTINUOUS_PROCESS_IMPROVEMENT.md).

### 4. Fix (minimal patterns)

Prefer in order:

1. **Isolate state** — context/provider or child component so config clicks don’t re-render heavy siblings
2. **`memo` + stable props** — grid/list components; avoid inline handlers when comparator ignores them
3. **Defer expensive work** — shuffle at commit time; debounce persist not UI; `requestIdleCallback` for warmup
4. **Narrow subscriptions** — Dexie live query scope; don’t load full tables for a checkbox
5. **Tier-correct I/O** — preview vs session media (Gesture)

Do not “fix” by disabling features or removing optimistic UI without user ask.

### 5. Instrument (regression guard)

| Fix type                    | Add                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Interaction latency         | `e2e/smoke/<app>-<surface>-interaction.spec.ts` using [`e2e/helpers/interactionLatency.ts`](../../../e2e/helpers/interactionLatency.ts) |
| Pure logic cost / invariant | Vitest in `*Invariants.test.ts` or audit test                                                                                           |
| Media lifecycle             | Follow [`docs/GESTURE_MEDIA_STABILITY.md`](../../../docs/GESTURE_MEDIA_STABILITY.md) map                                                |

Update CUJ **Performance budgets** table with step + budget + verification path.

### 6. Verify

```bash
npx playwright test e2e/smoke/<relevant-interaction-spec>.ts
node scripts/run-scoped-e2e.mjs   # when app-scoped
npm run presubmit               # before done
```

## Interaction smoke template

```typescript
import { test, expect } from '@playwright/test';
import { measureClickUntil } from '../helpers/interactionLatency';
import { DEFAULT_INTERACTION_BUDGET_MS } from '../../src/shared/test/interactionLatencyCore';

test('CUJ-001 step: session length radio responds quickly', async ({
  page,
}) => {
  await page.goto('/gesture/?e2eSeed=1');
  const ms = await measureClickUntil(
    page,
    page.getByRole('radio', { name: 'Limited session length' }),
    () => expect(page.locator('#gesture-session-photo-limit')).toBeEnabled()
  );
  expect(ms).toBeLessThanOrEqual(DEFAULT_INTERACTION_BUDGET_MS);
});
```

## Agent implementation checklist

When shipping UI that includes **controls + heavy list/grid**:

- [ ] Config/control state isolated from grid re-renders
- [ ] No O(n) recompute on unrelated control changes (n = photos, rows, tags)
- [ ] Warmup/prefetch keys exclude random shuffle until user commits
- [ ] CUJ step documented if journey is primary
- [ ] Interaction smoke if budget listed or user reported lag

## Related skills

- **`labs-ux-journey`** — sketch before new heavy UI; promote to CUJ when stable
- **`labs-session-retrospective`** — codify new root cause class on second occurrence
- **`labs-visual-regression`** — layout/aesthetic regressions, not click latency
