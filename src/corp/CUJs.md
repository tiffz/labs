# Critical user journeys — Corp

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Browse corp landing

**Primary goal:** Load the corp micro-app shell.

| Step | Action        | Performance budget (p95)                 | Verification                   |
| ---- | ------------- | ---------------------------------------- | ------------------------------ |
| 1    | Open `/corp/` | Primary heading ≤ 3 s (dev hard refresh) | `e2e/smoke/app-shells.spec.ts` |

**Visual states** (`e2e/routeRegistry.ts`): `corp` — landing shell, desktop + mobile.
