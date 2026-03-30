# Words App Notes

## Major functionality

- Organizes a song into stacked sections (`Verse`, `Chorus`, `Bridge`) with unlimited section count.
- Converts section lyrics into darbuka-style notation and renders one merged VexFlow staff.
- Uses dictionary-first prosody with heuristic fallback for syllables and stress.
- Supports per-section and global rhythm/sound regeneration controls.
- Supports per-section chord progressions, per-section chord styles, and per-section template notation/bias.
- Chorus sections can link to previous chorus lyrics/template by default and optionally unlink.
- Chord input accepts both `I–V–vi–IV` and `C–G–Am–F` formats per section.
- Song key is global to the song and used across section progression parsing/randomization.
- Supports shareable URL state, while keeping the URL clean when still at defaults.

## Generation settings UX

- Generation controls include inline info tooltips for quick guidance.
- `line-break empty-space bias` is enabled by default and biases short rests between dense lyric lines.
- `template influence` and motif/adventure settings can be combined for tighter or looser phrasing.

## Input/playback interactions

- Spacebar toggles play/stop (ignored while typing in form fields).
- BPM editing is lenient while typing; value clamps only on blur/enter.
- Meter is currently locked to `4/4`.

## Shared Playback Integration

Words routes playback through the shared drums playback stack (audio lifecycle, scheduling, metronome callbacks), while keeping words-specific behavior in-app:

- lyric/section randomization and notation generation
- score highlighting and loop-back auto-scroll behavior
- section/global loop semantics

## Presubmit checklist

- `npm run lint`
- `npm run test -- src/words/utils/prosodyEngine.test.ts`
- `npm run test -- src/shared/music/chordProgressionText.test.ts`
- `npm run test -- src/shared/music/randomChordProgression.test.ts`
