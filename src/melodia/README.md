# Melodia Online

Curriculum-first sight-singing (no file required): pick an exercise, then the three-phase loop:

1. **Rhythm** — tap onsets (Space + check).
2. **Audiation** — tonic drone + playhead.
3. **Sing** — pitch trace + optional recording and duet listen-back.

**Curriculum:** JSON under [`curriculum/data/`](./curriculum/data/), loaded via [`curriculum/catalog.ts`](./curriculum/catalog.ts). Expand with the ingest CLI in [`scripts/melodia/README.md`](../../scripts/melodia/README.md).

**Comfort range:** Defaults with optional **Advanced** panel; transposes the loaded score (see [`music.ts`](./music.ts)).

**Internal review UI:** [UI catalog Melodia tab](/ui/#melodia) — MusicXML → validators + VexFlow preview + JSON export.

**Debug:** `?debug` skips phase gates, shows the Labs debug dock, and enables optional raw MusicXML/MIDI import.

**Engineering:** staff-overlay math, mic UX patterns, tonic/transpose rationale, debug URL merges, and a short backlog → [`DEVELOPMENT.md`](./DEVELOPMENT.md).

**Textbook / corpus import (OMR → MusicXML → JSON → app):** pipeline components, manual vs automated steps, and a full-port checklist → [`../../scripts/melodia/IMPORT_PIPELINE.md`](../../scripts/melodia/IMPORT_PIPELINE.md).
