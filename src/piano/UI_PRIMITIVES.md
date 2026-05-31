# Piano — UI primitives

Piano-specific surfaces. **Shared playback/notation:** [`/ui/`](/ui/) catalog.

## Primitives

- **`PlaybackControls`** — main transport + settings entry; reuse shared `BpmInput`, `PlaybackSpeedControl`, export popover patterns.
- **`PracticeMode`** / **`NoteInput`** — step input and live grading; keep dense copy in tooltips per `USER_COPY_STYLE.md`.
- **`OnscreenPianoKeyboard`** (shared) — prefer [`src/shared/components/music/OnscreenPianoKeyboard.tsx`](../shared/components/music/OnscreenPianoKeyboard.tsx) over local keyboard markup.

## Agent context

[`AGENTS.md`](AGENTS.md) · [`ARCHITECTURE.md`](ARCHITECTURE.md)
