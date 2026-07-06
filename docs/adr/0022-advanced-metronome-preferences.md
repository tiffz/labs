# ADR 0022: Advanced metronome preferences and split control

## Status

Accepted (July 2026)

## Context

Count Me In exposes subdivisions, vocal counting, takadimi, and per-channel mix. Other apps used a bare toggle with beat-only clicks. Users expect Count-grade metronome features in playback apps without changing default one-click behavior.

## Decision

1. **`MetronomePreferences`** — shared codec in `src/shared/audio/platform/metronome/preferences.ts` with app defaults (`PLAYBACK_APP_METRONOME_DEFAULTS`, `COUNT_METRONOME_DEFAULTS`).

2. **`MetronomeSplitControl`** — primary toggle + chevron opens `MetronomeAdvancedSettingsPanel`. Non-default prefs show indicator dot.

3. **`MetronomeRuntimeCoordinator`** — when prefs equal app defaults and voice/drum off, delegate to legacy click path; otherwise sync `MetronomeEngine`.

4. **Count Me In** — keeps full-screen SubdivisionMixer; shares preference types and `useCountMetronomePreferences` hook only (no popover UX).

5. **Persistence** — `useMetronomePreferences({ storageKey })` per app; Stanza also binds mix-rail gain separately in Dexie.

## Regression gate

Default prefs + default mix → scheduling must match pre-refactor golden tests (RhythmPlayer, ScorePlayback, Stanza click levels).

## Consequences

- Replace `MetronomeToggleButton` with `MetronomeSplitControl` in Midi, Drums, Words, Piano, Chords, Stanza strip.
- [`SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md) documents split control and accent panel.

## References

- ADR [0021](0021-shared-audio-platform.md)
- [`docs/SHARED_AUDIO_PLATFORM.md`](../SHARED_AUDIO_PLATFORM.md)
