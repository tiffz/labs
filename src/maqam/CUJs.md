# Critical user journeys — Maqam Playground

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Hear a maqam (primary)

**Primary goal:** Pick a maqam and play its microtones on the on-screen keyboard.

| Step | Action              | Performance budget (p95)                                      | Verification                          |
| ---- | ------------------- | ------------------------------------------------------------- | ------------------------------------- |
| 1    | Open `/maqam/`      | Keyboard interactive ≤ 3 s (dev hard refresh)                 | `e2e/smoke/maqam-playground.spec.ts`  |
| 2    | Click a maqam       | Keyboard recolours ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | `e2e/smoke/maqam-playground.spec.ts`  |
| 3    | Press a retuned key | Tone starts ≤ 100 ms; pitch matches the written accidental    | `src/maqam/audio/maqamSynth.test.ts`  |
| 4    | Release the key     | No stuck voice; `activeNotes` empties                         | `src/maqam/state/maqamTuning.test.ts` |

**Correctness gate:** the sounded frequency for every scale degree equals the frequency of its
written spelling (`maqamSynth.test.ts` § "what you hear matches what is written"). A regression
here is the app failing at its only job.

## CUJ-002: Read the quarter-tone glyph

**Primary goal:** See the half-flat drawn on a staff and recognise it later.

| Step | Action          | Budget                                    | Verification                         |
| ---- | --------------- | ----------------------------------------- | ------------------------------------ |
| 1    | Open `/maqam/`  | Reference staff draws after Bravura loads | `e2e/smoke/maqam-playground.spec.ts` |
| 2    | Play four notes | Live staff shows them, newest last        | `e2e/smoke/maqam-playground.spec.ts` |

**Font gate:** the staff must not paint before Bravura resolves — enforced for every VexFlow
surface by `src/shared/notation/vexFlowMusicFontGateGuardrails.test.ts`.

## CUJ-003: Build a custom tuning and share it

| Step | Action                | Budget                         | Verification                            |
| ---- | --------------------- | ------------------------------ | --------------------------------------- |
| 1    | Open "Build your own" | Matrix expands, 12 toggles     | `e2e/smoke/maqam-playground.spec.ts`    |
| 2    | Toggle a key          | Keyboard + URL update ≤ 400 ms | `e2e/smoke/maqam-playground.spec.ts`    |
| 3    | Reload the URL        | Same tuning restored           | `src/maqam/state/maqamUrlState.test.ts` |

## Mobile parity (390px)

All three CUJs are completable at 390px. The keyboard is the single surface with deliberate
horizontal scroll — two octaves of fingertip-sized keys do not fit, and shrinking them below a
fingertip is worse. Enforced by `e2e/smoke/responsive-all-apps.spec.ts`.

## Visual states

Baselines deferred while the shell settles — see `e2e/routeRegistry.ts` (`visual: false`).
