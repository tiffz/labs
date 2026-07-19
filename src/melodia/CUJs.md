# Critical user journeys — Melodia

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Sight-sing with mic input

**Primary goal:** Load Melodia and see pitch feedback UI.

| Step | Action             | Performance budget (p95)                                              | Verification                   |
| ---- | ------------------ | --------------------------------------------------------------------- | ------------------------------ |
| 1    | Open `/melodia/`   | Primary controls ≤ 3 s (dev hard refresh)                             | `e2e/smoke/app-shells.spec.ts` |
| 2    | Grant mic and sing | Pitch feedback latency ≤ 100 ms perceived (audio path, not UI budget) | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `melodia` — landing shell, desktop + mobile.
