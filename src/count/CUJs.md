# Critical user journeys — Count

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Metronome beat display

**Primary goal:** Load Count and see beat visualization respond.

| Step | Action              | Performance budget (p95)                                                            | Verification                   |
| ---- | ------------------- | ----------------------------------------------------------------------------------- | ------------------------------ |
| 1    | Open `/count/`      | Beat display ≤ 3 s (dev hard refresh)                                               | `e2e/smoke/app-shells.spec.ts` |
| 2    | Start the metronome | Play response ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms); beat flash stays on tempo | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `count` — landing shell, desktop + mobile.
