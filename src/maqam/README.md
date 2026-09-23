# Maqam Playground

Retune a 12-key piano keyboard to an Arabic _maqam_ and play the quarter-tones between the keys.

**Stage:** in development (not listed on the public directory) · **Route:** `/maqam/` · **Tier:** experimental

## What it is for

A Western-trained musician can read "neutral third" and still have no idea what one sounds like. This app closes that gap in one action: pick a maqam, and the keyboard retunes so the keys you already know play the pitches you do not. Everything else on the page — the staff, the jins breakdown, the glossary — exists to explain what your ears just did.

It is a playground, not a DAW. No recording, no score editing, no _iqa'_ sequencer.

## The one invariant

**What you hear and what is written must be the same pitch.** Every design decision below follows from that.

### Accidentals are one table, not three facts

[`notation/maqamAccidentals.ts`](notation/maqamAccidentals.ts) binds an accidental's cents, its 12-TET key, and its VexFlow glyph in a single record, and [`maqamAccidentals.test.ts`](notation/maqamAccidentals.test.ts) asserts `cents === 100 * semitoneShift + microtonalCents`.

This exists because the original spec for this app specified VexFlow's `'db'` as the half-flat. It is not. In `vexflow@5` `Tables.accidentals`:

| Code | Glyph                                       | Cents |
| ---- | ------------------------------------------- | ----- |
| `d`  | `accidentalQuarterToneFlatStein`            | −50   |
| `db` | `accidentalThreeQuarterTonesFlatZimmermann` | −150  |
| `+`  | `accidentalQuarterToneSharpStein`           | +50   |

Half-flat is **`d`**. Half-sharp is **`+`**, not `'#'`. Shipping `'db'` would have drawn every E½♭ a full quarter-tone from the note it sounded, on the one glyph the app exists to teach.

### The detune matrix is derived, never authored

A maqam's pitches are written down exactly once — in `scaleDegrees`. [`deriveDetuneMatrix`](data/maqamPresets.ts) computes the 12-slot retuning from those spellings. The spec authored both side by side; nothing would have kept them agreeing.

`deriveDetuneMatrix` also **reports conflicts** rather than resolving them: a maqam wanting both E and E½♭ cannot be played on twelve keys, and that is surfaced, not silently last-write-wins.

### Ajnas are cross-checked against the scale

`intervalsInCents` on each jins is authored independently of `scaleDegrees`. [`maqamPresets.test.ts`](data/maqamPresets.test.ts) walks the scale from the jins root and requires the two to agree. This caught the spec's _Jins Nahawand on A_ in Bayati — on A, Bayati's B♭ gives `0·100·300·500` (Jins Kurd). Nahawand sits on **G**.

## Layout

| Panel              | Job                                                      |
| ------------------ | -------------------------------------------------------- |
| Choose a maqam     | The primary action. One click retunes everything.        |
| Play it            | The hero: keyboard + live tuning status + legend.        |
| Read it            | Reference scale (static) and the last four notes played. |
| Build your own     | The 12-key matrix, **collapsed** — the escape hatch.     |
| What it is made of | Ajnas of the current maqam.                              |
| Words used here    | Glossary.                                                |

The matrix is collapsed deliberately. Two co-equal ways to set tuning would be `ux-journey-overload`; picking a maqam is the journey, hand-editing is the exception.

## Audio

One `MaqamSynth` ([`audio/maqamSynth.ts`](audio/maqamSynth.ts)) owning one `AudioContext` for the app's lifetime, created lazily on the first note (a context built before a user gesture starts suspended) and closed on unmount.

- Cents fold into the **frequency exponent**, not `OscillatorNode.detune`. One place, testable without an AudioContext, and no risk of applying the bend twice.
- Triangle wave, 16-voice cap with oldest-first eviction, so a dropped MIDI note-off cannot leak voices into Chrome's per-document cap.
- Not on the shared audio platform: nothing here is grid-aligned. Per [`docs/SHARED_AUDIO_PLATFORM.md`](../../docs/SHARED_AUDIO_PLATFORM.md), a one-shot preview on a user gesture is the documented non-scheduler path.

## Notation

[`notation/maqamStaffDraw.ts`](notation/maqamStaffDraw.ts) awaits `ensureVexFlowFontsLoaded()` **inside** the draw function, so the guarantee travels with it rather than depending on a caller remembering. `MaqamStaff` _also_ holds render on `useVexFlowMusicFontReady()` to avoid flashing an empty box. Both arms are deliberate.

## State

`useMaqamState` holds it all; there is no persistence. Everything lives in the URL (`?maqam=rast_c&tuning=----d------d`), so a link is the save file. A corrupt `tuning` value falls back to the **maqam's own tuning**, never to twelve equal keys — that would look like a deliberate "no microtones" choice the user never made.

## Shared code touched

- `OnscreenPianoKeyboard` gained one optional prop, `decorateKey`, for per-key role classes and badges. Additive; every existing caller is unaffected.

## Intentional diversions

None yet.

## Tests

```bash
npx vitest run src/maqam
npx playwright test e2e/smoke/maqam-playground.spec.ts
npx playwright test e2e/smoke/responsive-all-apps.spec.ts --grep "/maqam/"
```

## Not built yet

- _Iqa'_ (rhythmic cycles) — a different app, if ever.
- More maqamat: Nahawand, Kurd, Saba, Ajam. Adding one is a `MAQAM_PRESETS` entry; the tests enforce the rest.
- Sayr (melodic pathway) guidance.
- Visual regression baselines — see `e2e/routeRegistry.ts` for why they are deferred.
