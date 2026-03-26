# Music Portfolio Architecture

This document tracks the music app surface and shared boundaries so refactors stay
safe and maintainable.

## Music Apps

- `src/beat`: beat/chord analysis, media sync, practice sections.
- `src/chords`: chord progression generator and playback.
- `src/drums` (and `src/drums/universal_tom`): rhythm editing and playback.
- `src/piano`: score playback, MIDI practice, chord exercise generation.
- `src/words`: lyric sections + rhythm/chord playback composition.

## Shared Music Layers

- `src/shared/music/chordTypes.ts`: canonical chord domain types.
- `src/shared/music/chordTheory.ts`: Roman numeral -> chord conversion.
- `src/shared/music/chordVoicing.ts`: reusable voicing engine.
- `src/shared/music/randomization.ts`: canonical key list/random key picker.
- `src/shared/music/soundOptions.ts`: shared playback sound options.
- `src/shared/music/theory/pitchClass.ts`: pitch-class map and enharmonic spelling.
- `src/shared/music/chordProgressionText.ts`: progression parsing/inference.
- `src/shared/music/randomChordProgression.ts`: random progression helpers.
- `src/shared/music/songSections.ts`: section models/helpers used by words workflows.
- `src/shared/music/lyricSectionParser.ts`: lyric parsing helpers for section import flows.

## Boundary Rules

- `shared/**` must not import from app directories (`beat`, `chords`, `drums`, `piano`, `words`).
- App adapters can import `shared/**` and keep app-specific UI/state orchestration.
- New music theory logic should be added once in `shared/music/theory` and reused.

## Current Adapter Notes

- `src/chords/utils/chordTheory.ts` and `src/chords/utils/chordVoicing.ts` remain
  compatibility adapters that re-export shared implementations.
- Existing app code can keep old `chords/*` imports during migration, but new code
  should target shared modules directly.
