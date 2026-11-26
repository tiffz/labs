# Critical user journeys — Forms

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Play a rhythm form

**Primary goal:** Load Forms and start the default exercise.

| Step | Action                        | Performance budget (p95)                            | Verification                   |
| ---- | ----------------------------- | --------------------------------------------------- | ------------------------------ |
| 1    | Open `/forms/`                | Shell + form canvas ≤ 3 s (dev hard refresh)        | `e2e/smoke/app-shells.spec.ts` |
| 2    | Interact with the form canvas | Response ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | manual                         |

## CUJ-002: See where the forms meet

**Primary goal:** The blue intersection curves sit on the seams where forms meet.

| Step | Action         | Verification                                                                                          |
| ---- | -------------- | ----------------------------------------------------------------------------------------------------- |
| 1    | Open `/forms/` | `e2e/smoke/forms-intersection-lines.spec.ts` (pixels), `src/forms/utils/intersectionComputer.test.ts` |

**Visual states** (`e2e/routeRegistry.ts`): `forms` — landing shell, desktop + mobile.
