# Words App Notes

**Agents:** [`AGENTS.md`](AGENTS.md) · shared UI: [`/ui/`](/ui/) · chrome contract: [`docs/CHROME_UI_CONTRACT.md`](../../docs/CHROME_UI_CONTRACT.md) · copy: [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md)

## Chrome UI (reference app)

Words is the first app on the shared chrome contract — dropdown shadows, button hovers, and popover surfaces come from [`labsChrome.css`](../shared/styles/labsChrome.css) + `--labs-popover-*` / `--labs-control-*` tokens. Override **brand tint** on `.words-page` only; keep layout in `word-rhythm.css`.

## Major functionality

- Organizes a song into stacked sections (`Verse`, `Chorus`, `Bridge`) with unlimited section count.
- Converts section lyrics into darbuka-style notation and renders one merged VexFlow staff.
- Uses dictionary-first prosody with heuristic fallback for syllables and stress.
- Supports per-section and global rhythm/sound regeneration controls.
- Supports per-section chord progressions, per-section chord styles, and per-section template notation/bias.
- Chorus sections can link to previous chorus lyrics/template by default and optionally unlink.
- Chord input accepts both `I–V–vi–IV` and `C–G–Am–F` formats per section.
- Song key is global to the song and used across section progression parsing/randomization. **You set it explicitly** in the playback rail; editing section chords does not change it.
- Supports shareable URL state, while keeping the URL clean when still at defaults.

## Generation settings UX

- Generation controls include inline info tooltips for quick guidance.
- `line-break empty-space bias` is enabled by default and biases short rests between dense lyric lines.
- `template influence` and motif/adventure settings can be combined for tighter or looser phrasing.

## Input/playback interactions

- Spacebar toggles play/stop (ignored while typing in form fields).
- BPM editing is lenient while typing; value clamps only on blur/enter.
- Time signature: **4/4** and **3/4**. Changing meter resets section templates to the first preset for the new meter and remaps incompatible chord styles.
- **Undo / redo:** header controls plus ⌘Z / Ctrl+Z (shared `LabsUndoProvider`). Covers section edits, chord progressions (commit on blur), lyric import, chorus linking, and randomize-everything. Chord typing uses live preview without pushing undo until you leave the field.

## Chord playback

- Playback and export parse chord symbols via shared `chordSymbolToTheoryChord()` — slash chords (`Bbmaj7/D`), `maj7`, `sus4`, etc.
- Per-section **chord style** menu filters by current time signature (`ChordStyleInput` + `timeSignature` prop).

## Shared Playback Integration

Words routes playback through the shared drums playback stack (audio lifecycle, scheduling, metronome callbacks), while keeping words-specific behavior in-app:

- lyric/section randomization and notation generation
- score highlighting and loop-back auto-scroll behavior
- section/global loop semantics

## Presubmit checklist

- `npm run lint`
- `npm run test -- src/words`
- `npm run test -- src/shared/music/chordSymbolToTheoryChord.test.ts`
- `npm run test -- src/shared/music/chordProgressionText.test.ts`
