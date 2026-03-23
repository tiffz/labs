# Beat Finder Architecture

This document captures the current UI architecture and the decisions that keep
the timeline editor stable as new features are added.

## Core Module Boundaries

- `App.tsx` orchestrates app state, persistence, media source switching, and
  wiring between analysis/playback components.
- `components/PlaybackBar.tsx` renders the timeline ruler, generated analysis
  lane, editable practice lanes, and section editing controls.
- `hooks/useAudioAnalysis.ts` owns decode + beat analysis state for local media.
- `hooks/useBeatSync.ts` owns playback transport state and audio/mixer controls.
- `storage/beatLibraryService.ts` + `storage/beatLibraryDb.ts` own persistence.
- Shared music controls are in `src/shared/components/music/`.
- MUI primitives (`@mui/material`) are the default for interactive controls
  (menus, selects, sliders, text fields, checkboxes), with app-specific styling
  layered via `styles/beat.css`.

## Timeline Coordinate System (Critical)

All time-based percentages must resolve against the same track width.

- The timeline uses a lane label gutter + track column model.
- `PlaybackBar` applies lane offsets with CSS variables:
  - `--lane-label-width`
  - `--lane-gap`
- The main ruler and lane sections both render in the track column.
- The lane playhead overlay is constrained to the same track column.
- `+ New lane` is rendered in the lane label column below the lane list so lane
  controls stay aligned with lane geometry.

If this rule is broken, lane chips and the ruler drift apart horizontally.

## Lane Model

Practice sections are lane-aware and persisted as:

- `UserPracticeData.lanes`
- `UserPracticeData.sections` with `laneId`

Generated analysis sections are read-only. Editing actions create or modify
practice-lane sections instead of mutating analysis output.

Section hover details are pointer-interactable. Practice sections can be renamed
inline from the hover card; generated sections remain read-only.

Migration path:

- `normalizePracticeData()` in `beatLibraryDb.ts` maps legacy flat section
  arrays into `lane-user-1` (`My Sections`).

## BPM / Key State Rules

- `BpmInput` uses a local draft and must not overwrite draft while focused.
- Detected key baseline and corrected key are separate:
  - baseline = detector output
  - corrected = user override used as transpose base
- Transpose state is semitone-based and computes playback key from corrected
  key + transpose delta.

## Playback Keyboard Rule

Global spacebar play/pause is allowed only when focus is not in editable UI.

- Guard is centralized in `utils/keyboardShortcuts.ts` via
  `shouldHandleGlobalPlaybackSpacebar()`.
- This avoids accidental playback toggles while typing in form controls.

## Testing Strategy

UI regressions are caught by:

- `components/PlaybackBar.test.tsx` for timeline controls + lane rendering
- `hooks/useSectionSelection.test.ts` for loop/selection behavior
- `shared/components/music/BpmInput.test.tsx` and `KeyInput.test.tsx`
- `storage/beatLibraryDb.test.ts` for lane migration normalization
- `utils/keyboardShortcuts.test.ts` for global spacebar guard behavior

When adding timeline UI, add tests in the same change to protect behavior.
