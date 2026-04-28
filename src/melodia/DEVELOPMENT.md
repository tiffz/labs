# Melodia — design notes & backlog

This doc captures **major implementation decisions** from a focused Melodia UX/audio pass so future work does not redo research. It complements [`README.md`](./README.md) (product overview) with **engineering context**.

---

## Textbook / corpus import pipeline

The batch and review tooling for bringing **OMR-exported MusicXML** into curriculum JSON lives under **`scripts/melodia/`**. That flow is **not** the same as the in-app lesson runtime; it includes normalization, HRMF, validators, optional bulk categorization, and a **manual** step to map outputs into **`MelodiaCurriculumExercise`** files.

**Canonical write-up:** [`scripts/melodia/IMPORT_PIPELINE.md`](../../scripts/melodia/IMPORT_PIPELINE.md) (status, gaps, full-port checklist, future automation ideas).

---

## Pitch trace (staff overlay)

**Problem.** The ink path (`MelodiaInkTrace`) maps live microphone MIDI to SVG `y`. A naive “pixels per chromatic semitone” model diverges from how **VexFlow** lays out pitches (staff lines, ledger lines, enharmonics), so traces looked flat or systematically misaligned versus the rendered noteheads.

**Decision.** In [`components/MelodiaStaff.tsx`](./components/MelodiaStaff.tsx), `MelodiaStaffLayout.yForMidi` is derived from the **same primitives VexFlow uses**:

- Spell MIDI using the shared `NOTE_NAMES` convention → key glyph (`midiToVexKeyGlyph`, aligned with how `StaveNote` keys are built).
- **`VexFlow.keyProperties(glyph, clef)`** for the fractional staff line.
- **`stave.getYForNote(kp.line)`** for the vertical coordinate.

**Fallback.** If lookup throws (unexpected glyph), clamp to the first rendered note frame’s `yMid` so we still draw something predictable.

---

## Mic UI footprint

**Problem.** Full-width mic card + dense controls competed with the staff; device selection belonged behind a deliberate affordance rather than inline.

**Decision.** [`components/MelodiaMicBar.tsx`](./components/MelodiaMicBar.tsx) uses a compact **pill trigger** (“Mic · …” + cue) plus [`AnchoredPopover`](../../shared/components/AnchoredPopover.tsx): device picker, pitch-trace toggle, and retry-after-block live in the popover panel (same UX family as Piano/Scales `InputSourcesMenu`, Melodia-themed).

---

## Tonic drone, cadence, and transpose

**Problem.** Curriculum **transpose** adjusts written pitches and tonal comfort. The **previous** tonic-only drone keyed off raw key/octave semantics could disagree with “what sounds” after transpose (listeners heard eg. C vs what the staff visually implied).

**Decision.** Helpers in [`music.ts`](./music.ts):

- **`melodyAnchorReferenceMidi`** — first melodic pitch written, else a sensible tonic-range default.
- **`tonicAnchorMidiForLesson`** — lesson key tonic shifted by **`transposeSemitones`**, then octave-snapped near the melodic reference MIDI so octave choice matches the exercise.
- **`tonicDroneFrequencyForLesson`** — Hz for drones/preview anchored to that same tonic.

[`phases/AudiationPhase.tsx`](./phases/AudiationPhase.tsx) drives the tonic **drone** and **`playAudiationCadence`** / **`playTonicPreviewHertz`** from these values. [`App.tsx`](./App.tsx) passes **`transposeSemitones`** from reducer state into `AudiationPhase` so playback matches the loaded exercise variant.

Cadence chord voicing APIs live beside this in **`audio.ts`** + `audiationCadenceVoicingFromTonicRootMidi` ([`music.ts`](./music.ts)).

---

## Labs debug routing

**Problem.** Opening the debug catalog rewrote the URL as `?exercise=…`, dropping **`?debug`** / **`?dev`** and breaking the debug dock continuity.

**Decision.** Catalog links merge `window.location.search` with **`exercise`**, preserving existing query pairs (implemented in **`catalogExerciseHref`** in [`App.tsx`](./App.tsx)).

---

## Pending / worth revisiting later

- **Curriculum vs pedagogy language.** Lesson **titles** in JSON can still say eg. “Do on the tonic” while movable-do **labels under notes** (`midiToSolfege`) describe **degree in the lesson key**. After transpose + movable-do that can sound contradictory (eg. “Do” wording vs syllable printed as Fa). Editorial pass on titles/descriptions—or a single glossary line in the lesson shell—is still open product-side.
- **Multi-note regressions.** The new `yForMidi` mapping is keyed to Vex’s model; sanity-check traces on **chromatic leaps**, chords (if surfaced), and very high/low ledger lines across several exercises once you resume.
- **Ghost guide parity.** Sing-phase ghost playback uses **`buildPitchedOnsets(..., transposeSemitones: 0)`** because scores are typically **already transposed** at load (`loadCatalogExercise`); verify this stays correct if you ever transpose at render time differently from server-side score cloning.
- **E2E / visual snapshots.** Smoke coverage for `/melodia` exists elsewhere in the repo; when Melodia stabilizes visually, intentional Playwright/visual baselines for staff + overlays would anchor future refactors.
- **Popover affordance.** Tune trigger copy/ARIA (“dialog” vs “menu”), focus trap, and whether “denied/error” deserves a badge on the pill without opening the panel.

---

## Tests tied to transpose / tonic helpers

[`music.test.ts`](./music.test.ts) includes assertions for **`melodyAnchorReferenceMidi`**, **`tonicAnchorMidiForLesson`**, and **`tonicDroneFrequencyForLesson`** when extending this behavior.
