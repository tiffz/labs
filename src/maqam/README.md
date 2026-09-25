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

### Key colours: one channel per fact

Three different kinds of fact used to compete for one visual channel (fill colour), so "in the maqam" meant different things on different keys.

| Fact              | Channel                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| In this maqam     | **Presence** — a full-strength key; one outside it recedes toward the board |
| Tonic             | **Dot** — shape, so it survives a colour-blind reading                      |
| Retuned ½♭        | **Amber** — an underline at the foot of the key, plus a chip by its name    |
| Sounding now      | **Blue fill** — only during playback, and only the octave being played      |
| Its other octaves | **Soft blue** — true, and a tier quieter than the note you can hear         |

Membership is deliberately **not** a hue. Two hues carry meaning here and that is the whole
palette: blue is "sounding, or home", amber is "bent off equal temperament". A third colour for
membership put a cool green across two thirds of a warm keyboard and left the two that mean
something competing with it.

Each step of that presence ladder has to be visible: an out-of-maqam key once measured **1.01:1**
against the board and dissolved into it. `e2e/smoke/maqam-playground.spec.ts` now fails below
1.15:1 and names the pair.

Sikah's E½♭ is simultaneously filled, dotted and capped. That combination was impossible to express before, and `maqamTuning.test.ts` pins it.

### The staff scales from its width

`MaqamStaff` measures width, derives a scale, and sets its own height from that. Scaling from the available _height_ instead was tried and looked worse — the box stretched to whatever the layout had spare and the notation sat in a pool of white — and it risks a measure-draw feedback loop, since the SVG is what fills the box being measured.

## Melodies

The staff shows a melody, and the scale is just the default one. Everything is
**generated from the maqam's own degrees** rather than transcribed:

| Pattern                | What it teaches                                         |
| ---------------------- | ------------------------------------------------------- |
| The scale / Descending | The degrees, in order                                   |
| Jins by jins           | The 2 cells, meeting on the shared degree               |
| Up to the ghammaz      | Climb to the resting degree and fall back               |
| In thirds              | Hanon-style interval drill                              |
| Arpeggio               | Tonic, third, fifth. An interval drill, not a chord     |
| Qafla                  | The descending cadence a phrase closes on               |
| Generated phrase       | 2 bars, seeded, mostly stepwise, resolving to the tonic |

### Why generated, not transcribed

Copyright covers expression, not procedure. "Play the scale in thirds" is an idea, and a pattern derived mechanically from data we author carries no licence at all. Transcribing famous maqam repertoire would have meant shipping content whose provenance could not be verified: most named examples are 20th-century and firmly in copyright, and "traditional" attributions are wrong often enough to matter here. `Lamma Bada Yatathanna` was the one melody that checked out ([Wikimedia marks it PD](https://commons.wikimedia.org/wiki/File:Muwashah_lamma_bada_yatathanna.OGG)) — one of nine is not a library.

Generated patterns also cover all 9 families for free, and they are testable: `maqamMelody.test.ts` asserts every note of every pattern lands on a real degree of every maqam, and that the sounded pitch matches the written one on the playback path.

There are no chord progressions, deliberately. Maqam music is monophonic and heterophonic and has no functional harmony; the traditional accompaniment is a drone on the tonic. Saying so is more useful than inventing progressions the idiom does not have.

### Playback

The whole phrase is scheduled on the audio clock up front. It is a known, finite sequence of a couple of dozen notes, so there is nothing to gain from a look-ahead scheduler and nothing to lose to a blocked main thread — and it is not the `setTimeout` note clock `audioPatternRegistry` forbids. An animation frame only _reads_ that timeline to move the highlight, so the staff cannot drift from the ear.

## Audio

A **Karplus-Strong plucked string**, rendered offline into an `AudioBuffer` and cached per (note, cents). No samples, no licence, no CDN.

Why synthesis rather than a sample library: a piano is the wrong instrument for quarter-tones. It is fixed-pitch percussion, so the ear hears a pitch-shifted piano note as _out of tune_ rather than as an interval — which defeats an app about intervals. A plucked string with a long decay (oud, qanun) carries a microtone as a pitch. And synthesis is parameterised by frequency, so a 350-cent third is rendered **at** 350 cents rather than resampled towards it.

`pluckedString.test.ts` measures the rendered pitch by autocorrelation on the real samples — not by reading back the delay-line length, which would be the implementation grading its own homework. Worst case is **4.5 cents**, a twelfth of a quarter-tone.

- **Doubled courses.** An oud's strings are paired a few cents apart. Two voices per note is both authentic and the biggest richness win available.
- **A generated room.** A short convolution reverb from decaying noise. Crude, but the difference between an instrument in a room and one in an anechoic void — which is most of what makes a web synth sound cheap.
- `tone` shapes brightness **outside** the feedback loop. In the loop it was measurably almost inert (0.05 and 0.95 gave near-identical spectra) and it perturbed pitch compensation for nothing.
- 16-voice cap with oldest-first eviction, so a dropped MIDI note-off cannot leak voices into Chrome's per-document cap.
- Not on the shared audio platform's scheduler, for the reason in § Playback. Registered honestly in `audioPatternRegistry`.

## Notation

[`notation/maqamStaffDraw.ts`](notation/maqamStaffDraw.ts) awaits `ensureVexFlowFontsLoaded()` **inside** the draw function, so the guarantee travels with it rather than depending on a caller remembering. `MaqamStaff` _also_ holds render on `useVexFlowMusicFontReady()` to avoid flashing an empty box. Both arms are deliberate.

## State

`useMaqamState` holds it all; there is no persistence. Everything lives in the URL (`?maqam=rast_c&tuning=----d------d`), so a link is the save file. A corrupt `tuning` value falls back to the **maqam's own tuning**, never to twelve equal keys — that would look like a deliberate "no microtones" choice the user never made.

## Shared code touched

- `OnscreenPianoKeyboard` gained one optional prop, `decorateKey`, for per-key role classes and badges. Additive; every existing caller is unaffected.
- `audioPatternRegistry` gained a row for `maqam`, describing what this app actually does rather than aspiring to a pattern it does not use.

## MIDI

A status badge in the topbar, deliberately off the critical path: a chip, never a prompt, never a blocking permission ask. The app is fully usable with the on-screen keyboard. But there was previously no way to tell whether a connected controller had been seen, which makes a silent keyboard impossible to diagnose. Clicking it explains what MIDI gets you and why the browser may not offer it.

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
