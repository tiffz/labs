# Maqam Playground

Retune a 12-key piano keyboard to an Arabic _maqam_, see its structure, and play the quarter-tones between the keys.

**Stage:** in development (not listed on the public directory) · **Route:** `/maqam/` · **Tier:** experimental

## What it is for

A Western-trained musician can read "neutral third" and still have no idea what one sounds like. This app closes that gap in one action: pick a maqam, and the keyboard retunes so the keys you already know play the pitches you do not. Everything else on the page — the staff, the jins breakdown, the glossary — exists to explain what your ears just did.

It is a playground, not a DAW. No recording, no score editing, no _iqa'_ sequencer.

## Layout: one viewport

Everything lives above the fold — picker, staff, ajnas, keyboard, tuning strip — at 1440x900 and at 390x844. The page never scrolls; only the stage may, and only on a window too short for the staff and the ajnas panel together. `e2e/smoke/maqam-playground.spec.ts` asserts zero page overflow, so a future addition that breaks the single-viewport promise fails rather than quietly reintroducing a scrollbar.

The shell does **not** use `AppShellLayout`: that provides a scrolling content region, which is the opposite of what this app wants.

## The nine families

Rast, Bayati, Sikah, Saba, Hijaz, Kurd, Nahawand, Nikriz, Ajam. Every other named maqam in common use is a member of one of these, so this is the set that teaches the system rather than a catalogue.

Four are microtonal (Rast, Bayati, Sikah, Saba) and five sit entirely in 12-TET (Hijaz, Kurd, Nahawand, Nikriz, Ajam). That spread is asserted by a test: it is what stops a learner concluding that "maqam" means "quarter-tone".

### Saba does not close at the octave

Its upper tonic is flattened, so its scale stops at the seventh. `repeatsAtOctave: false` marks it, and the octave-span test branches on that flag rather than asserting 1200 cents for everything — the earlier blanket assertion was a Western assumption, and Saba is the counterexample.

Only Saba's lower jins is listed. Jins Saba, with its diminished fourth, is the uncontested defining cell; sources disagree about the upper region, and guessing would be inventing content.

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

| Region     | Job                                                           |
| ---------- | ------------------------------------------------------------- |
| Topbar     | Maqam picker (the primary action) and the explainer.          |
| The scale  | One stave. Pressing a key lights that degree.                 |
| Built from | The two ajnas and the degree they share — the real structure. |
| Keyboard   | The instrument, with home dot and retuned badges.             |
| Tune keys  | The 12-key matrix, **collapsed** — the escape hatch.          |

The matrix is collapsed deliberately. Two co-equal ways to set tuning would be `ux-journey-overload`; picking a maqam is the journey, hand-editing is the exception.

The ajnas panel sits beside the staff rather than under it because the ajnas **are** the structure of a maqam. Demoting them to a footnote is what made the first version read as "a scale with two odd accidentals".

### The staff scales from its width

`MaqamStaff` measures width, derives a scale, and sets its own height from that. Scaling from the available _height_ instead was tried and looked worse — the box stretched to whatever the layout had spare and the notation sat in a pool of white — and it risks a measure-draw feedback loop, since the SVG is what fills the box being measured.

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
- Members within each family (Huzam, Jiharkah, Hijaz Kar, Shahnaz…). Adding one is a `MAQAM_PRESETS` entry; the tests enforce the rest. Past a dozen the picker should group by family.
- _Sayr_ — the melodic path. The explainer says the app leaves it out rather than pretending a scale is a maqam.
- Saba's upper jins, once a source worth trusting settles it.
- Visual regression baselines — see `e2e/routeRegistry.ts` for why they are deferred.

## Removed

The live "last 4 notes" ribbon was dropped for MVP. It also carried the only flaky test in the app — a CI-only failure I could not reproduce at 20x CPU throttling, with `setPointerCapture` in the shared keyboard's `pointerdown` handler as the untested hypothesis. If that handler throws it aborts before `onNoteOn`, which would silently swallow a keypress in **every** app using `OnscreenPianoKeyboard`; worth a guard if it resurfaces.
