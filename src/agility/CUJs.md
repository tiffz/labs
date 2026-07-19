# Critical user journeys — Agility

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Calibrate latency and run a level

**Primary goal:** Complete latency calibration and play one pitch-timing level.

| Step | Action                            | Performance budget (p95)                                    | Verification                   |
| ---- | --------------------------------- | ----------------------------------------------------------- | ------------------------------ |
| 1    | Open `/agility/`                  | Shell + primary controls ≤ 3 s (dev hard refresh)           | `e2e/smoke/app-shells.spec.ts` |
| 2    | Finish latency step → run a level | Control response ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | manual                         |
| 3    | See precision summary             | Renders without layout shift                                | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `agility` — landing shell, desktop + mobile.
