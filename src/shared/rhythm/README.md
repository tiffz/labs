# shared/rhythm — darbuka notation, presets, rhythm playback

Rhythm string parsing and the preset database shared by Drums, Words, and metronome surfaces.

## Map

| Area             | Files                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Notation parsing | `rhythmParser.ts` — darbuka strings (`D`, `T`, `K`, `-`, …) → timed strokes             |
| Preset database  | `presetDatabase.ts` (`RHYTHM_DATABASE`), integrity guard `presetIntegrity.test.ts`      |
| Playback         | `rhythmPlayer.ts`, `drumAudioPlayer.ts`, `usePlayback.ts`, `drumPlaybackNotePointer.ts` |
| Time signatures  | `timeSignatureUtils.ts`                                                                 |
| Prefs / links    | `metronomePlaybackPrefs.ts`, `buildDarbukaEditUrl.ts`                                   |

## Contracts

- **Editing presets:** follow skill [`labs-rhythm-preset`](../../../.cursor/skills/labs-rhythm-preset/SKILL.md) — every preset change must keep `presetIntegrity.test.ts` green (stroke counts vs time signature).
- Parser and player are UI-free; React integration goes through `usePlayback.ts`.
- Scheduling goes through [`../playback/`](../playback/README.md) — no ad-hoc `setTimeout` audio.
