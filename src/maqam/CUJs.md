# Critical user journeys — Maqam Playground

Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

## CUJ-001: Hear a maqam (primary)

**Primary goal:** Pick one of the 9 families and play its microtones.

| Step | Action              | Performance budget (p95)                                      | Verification                             |
| ---- | ------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| 1    | Open `/maqam/`      | Keyboard interactive ≤ 3 s (dev hard refresh)                 | `e2e/smoke/maqam-playground.spec.ts`     |
| 2    | Pick a maqam        | Keyboard recolours ≤ `DEFAULT_INTERACTION_BUDGET_MS` (400 ms) | `e2e/smoke/maqam-playground.spec.ts`     |
| 3    | Press a retuned key | Tone starts ≤ 100 ms; pitch matches the written accidental    | `src/maqam/audio/maqamSynth.test.ts`     |
| 4    | Release the key     | No stuck voice; `activeNotes` empties                         | `src/maqam/state/useMaqamState.test.tsx` |

**Correctness gate:** the sounded frequency for every scale degree equals the frequency of its
written spelling (`maqamSynth.test.ts` § "what you hear matches what is written"). A regression
here is the app failing at its only job.

## CUJ-002: See what you played (primary link)

**Primary goal:** Press a key, see which degree of the scale it is.

| Step | Action         | Budget                                      | Verification                         |
| ---- | -------------- | ------------------------------------------- | ------------------------------------ |
| 1    | Open `/maqam/` | Staff draws after Bravura loads             | `e2e/smoke/maqam-playground.spec.ts` |
| 2    | Hold a key     | Matching notehead lights ≤ 400 ms           | `maqamSpelling.test.ts`              |
| 3    | Hold the tonic | Both tonics light — one key is every octave | `maqamSpelling.test.ts`              |

**Font gate:** the staff must not paint before Bravura resolves — enforced for every VexFlow
surface by `src/shared/notation/vexFlowMusicFontGateGuardrails.test.ts`.

**Glyph gate:** the rendered SVG must contain U+E280 (quarter-tone flat) and never U+E281
(three-quarter-tone flat) for a half-flat maqam — asserted against the pixels, not our data.

## CUJ-003: Understand what a maqam is

**Primary goal:** Answer "why only 7 notes?" without leaving the app.

| Step | Action                  | Budget                             | Verification                         |
| ---- | ----------------------- | ---------------------------------- | ------------------------------------ |
| 1    | Open "How maqamat work" | Panel opens, focus moves into it   | `e2e/smoke/maqam-playground.spec.ts` |
| 2    | Press Escape            | Panel closes                       | `e2e/smoke/maqam-playground.spec.ts` |
| 3    | Read "Built from"       | Ajnas of the loaded maqam, in view | `e2e/smoke/maqam-playground.spec.ts` |

## CUJ-004: Build a custom tuning and share it

| Step | Action           | Budget                         | Verification                            |
| ---- | ---------------- | ------------------------------ | --------------------------------------- |
| 1    | Open "Tune keys" | Matrix expands, 12 toggles     | `e2e/smoke/maqam-playground.spec.ts`    |
| 2    | Toggle a key     | Keyboard + URL update ≤ 400 ms | `e2e/smoke/maqam-playground.spec.ts`    |
| 3    | Reload the URL   | Same tuning restored           | `src/maqam/state/maqamUrlState.test.ts` |

## CUJ-005: Hear the maqam as music, not as a scale

**Primary goal:** Press play and feel the phrase, without already knowing the idiom.

| Step | Action         | Budget                                | Verification                         |
| ---- | -------------- | ------------------------------------- | ------------------------------------ |
| 1    | Press Play     | First note within 200 ms              | `e2e/smoke/maqam-playground.spec.ts` |
| 2    | Watch          | Staff note and keys light together    | `e2e/smoke/maqam-playground.spec.ts` |
| 3    | Pick a pattern | Staff redraws ≤ 400 ms                | `e2e/smoke/maqam-playground.spec.ts` |
| 4    | New phrase     | Fresh 2 bars, seed written to the URL | `e2e/smoke/maqam-playground.spec.ts` |

**Timing gate:** the staff highlight and the audio read one timeline
(`melodyTimeline.ts`), so they cannot drift. A separate visual clock would be
the bug this design exists to prevent.

**Content gate:** every pattern note lands on a real degree of the loaded maqam,
in all 9 families (`maqamMelody.test.ts`), and sounds at its written pitch.

## CUJ-006: Know whether your controller is connected

| Step | Action             | Budget                       | Verification                         |
| ---- | ------------------ | ---------------------------- | ------------------------------------ |
| 1    | Glance at the chip | State visible without action | `e2e/smoke/maqam-playground.spec.ts` |
| 2    | Click it           | Explains what MIDI does here | `e2e/smoke/maqam-playground.spec.ts` |

Deliberately off the critical path: never a prompt, never a blocking permission
ask. The app is fully usable with the on-screen keyboard.

## Layout invariant: one viewport

Every CUJ above is completable without scrolling the page, at 1440x900 and at 390x844.
`e2e/smoke/maqam-playground.spec.ts` asserts zero page overflow in both axes; an addition that
breaks that fails rather than quietly reintroducing a scrollbar.

The keyboard is the single surface with deliberate horizontal scroll — 2 octaves of
fingertip-sized keys do not fit 390px, and shrinking them below a fingertip is worse. Enforced by
`e2e/smoke/responsive-all-apps.spec.ts`.

## Visual states

Baselines deferred while the shell settles — see `e2e/routeRegistry.ts` (`visual: false`).
