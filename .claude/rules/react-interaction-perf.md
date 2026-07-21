---
paths:
  - 'src/**/PracticeTab.tsx'
  - 'src/**/PracticeSessionControls.tsx'
  - 'src/**/*CollectionGrid*.tsx'
  - 'src/**/*Tab.tsx'
---

<!-- AUTO-GENERATED from .agents/rules/react-interaction-perf.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> React interaction performance — isolate control state from heavy grids; avoid O(n) work on click paths.

# React interaction performance

Canonical: [`docs/PERFORMANCE.md`](../../docs/PERFORMANCE.md). Budgets: [`docs/PERFORMANCE_BUDGETS.md`](../../docs/PERFORMANCE_BUDGETS.md). Skill: [`labs-performance`](../skills/labs-performance/SKILL.md). CUJs: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## Before editing control + grid screens

1. Read app **`CUJs.md`** if present.
2. Ask: does this click need to re-render the **grid / preview strip / live query subtree**? If no → isolate state.

## Required patterns

- **Isolate** timer/radio/checkbox/filter state from heavy siblings (context provider or dedicated child).
- **`memo`** list/grid rows; stable props; custom comparators when callbacks are stable by design.
- **No shuffle / sort / full-table scan** on every control change — defer to commit or use deterministic warmup queue.
- **Optimistic UI** — never disable entire rows for background persist (Drive/localStorage).
- **Interaction smoke** when fixing reported lag or adding CUJ budget — `e2e/helpers/interactionLatency.ts`.

## Red flags

- `useLiveQuery(() => db.table.toArray())` in same component as fast toggles
- `buildQueue` / `sort` / `Math.random` in render or in `useMemo` keyed on whole config object
- Inline `onClick={() => fn(id)}` on memoized children **without** a comparator that ignores callbacks

## Verify

- Hard refresh route (HMR hides cascade bugs)
- `npx playwright test e2e/smoke/*interaction*.spec.ts` when touching practice/configure flows
- React Profiler: one click should not repaint every card
