# Critical user journeys — MIDI

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: MIDI device list

**Primary goal:** Open MIDI lab and see device picker.

| Step | Action           | Performance budget (p95)                                                    | Verification                   |
| ---- | ---------------- | --------------------------------------------------------------------------- | ------------------------------ |
| 1    | Open `/midi/`    | Device UI ≤ 3 s (dev hard refresh); no error state without devices          | `e2e/smoke/app-shells.spec.ts` |
| 2    | Connect a device | List updates ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) after `statechange` | manual                         |

**Visual states** (`e2e/routeRegistry.ts`): `midi` — no-device shell, desktop + mobile.
