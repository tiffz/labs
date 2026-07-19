# Critical user journeys — Zines

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Read a zine spread

**Primary goal:** Open Zines and navigate spreads.

| Step | Action           | Performance budget (p95)                                                                                                   | Verification                   |
| ---- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 1    | Open `/zines/`   | Reader chrome ≤ 3 s (dev hard refresh)                                                                                     | `e2e/smoke/app-shells.spec.ts` |
| 2    | Navigate spreads | Page turn ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms); display tier stays https-only (rule `zines-image-display-tiers.mdc`) | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `zines` — reader shell, desktop + mobile.
