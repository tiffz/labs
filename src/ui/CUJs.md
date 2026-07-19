# Critical user journeys — UI catalog

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Browse shared components

**Primary goal:** Load `/ui/` catalog and open a component demo.

| Step | Action                         | Performance budget (p95)                               | Verification                   |
| ---- | ------------------------------ | ------------------------------------------------------ | ------------------------------ |
| 1    | Open `/ui/`                    | Catalog list ≤ 3 s (dev hard refresh)                  | `e2e/smoke/app-shells.spec.ts` |
| 2    | Select a demo                  | Demo mounts ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | manual                         |
| 3    | Open `#regression/screenshots` | Gallery renders (used by skill `labs-visual-judge`)    | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `ui` — catalog list, desktop + mobile.
