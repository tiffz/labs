# Critical user journeys — Cats

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Interact with the room

**Primary goal:** Load the cat room and click furniture without jank.

| Step | Action                      | Performance budget (p95)                                                             | Verification                   |
| ---- | --------------------------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| 1    | Open `/cats/`               | Room render ≤ 3 s (dev hard refresh)                                                 | `e2e/smoke/app-shells.spec.ts` |
| 2    | Click an interactive object | Response ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms), no frame drops during animation | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `cats` — room shell, desktop + mobile.
