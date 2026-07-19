# Critical user journeys — Pitch

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Explore pitch concepts

**Primary goal:** Load Pitch explorer and switch concept tabs.

| Step | Action             | Performance budget (p95)                                | Verification                   |
| ---- | ------------------ | ------------------------------------------------------- | ------------------------------ |
| 1    | Open `/pitch/`     | Visualization region ≤ 3 s (dev hard refresh)           | `e2e/smoke/app-shells.spec.ts` |
| 2    | Switch concept tab | Tab response ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `pitch` — default concept, desktop + mobile.
