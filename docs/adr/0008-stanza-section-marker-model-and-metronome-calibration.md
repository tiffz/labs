# ADR 0008: Stanza section/marker model and per-section metronome calibration

## Status

Accepted (backfill of existing behavior; no code change accompanies this ADR).

## Context

Stanza turns a song into a sequence of practice **sections** the user loops, labels,
and tracks focus time against. The data model has evolved across several Drive backup
revisions and a per-section metronome feature, and the rationale for the current
shape was previously scattered across inline comments. This ADR captures it in one
place so future contributors can reason about the trade-offs without spelunking.

Two related concerns are folded together here because they share the same primitives:

- The **section/marker** model that drives the timeline, library stats, undo stack,
  and Drive merge.
- The **per-section metronome calibration** stored on the song row, including the
  scope flip between "this section" and "whole song".

## Decision

### 1. Markers are the only source of truth; sections are derived

A `StanzaSong` stores a flat array of `StanzaMarker { id, time, label }` entries
plus an implicit "0" and "duration" boundary. `deriveSegments(markers, duration)`
produces a contiguous array of `DerivedSegment { id, index, start, end, label }`.

Sections are never persisted directly. This keeps the data minimal and makes
operations like split, drag, join, and snap-to-beat reduce to marker edits.

### 2. Segment ids are stable across marker moves

`deriveSegments` builds each segment id from the **left and right boundary keys**:
`stanzaSeg:<leftKey>:<rightKey>`. The two end boundaries are sentinel strings
(`__stanza_start__`, `__stanza_end__`); interior boundaries use the
sorted union of marker `id`s sitting at that time.

Why: practice stats (`song.stats[segmentId]`), per-section metronome calibration
(`song.metronomeBySegmentId[segmentId]`), and recorded takes (`take.segmentId`) all
hang off these ids. Stable ids let the user **drag a marker** without losing
attached state, and let the derive pass be cheap (no diffing required).

A pre-stable-id schema exists (`legacyDeriveSegments` returns `seg-N` ids). It is
referenced only by `migrateStanzaSongSegmentKeysIfNeeded`, which runs once per
song the first time a duration is known. Old `seg-N` keys are remapped onto the
matching new boundary key by start-time proximity.

### 3. Segment ordering is deterministic but the array is allowed to grow / shrink

The timeline uses `index` as a UI key (selection, hover) and as an input to
shift+click range selection (`areContiguousSegmentIndices`). Selection state lives
in the workspace as a list of indices, never as ids, because adding or removing a
marker is expected to **renumber** subsequent sections; the user thinks of "the
next section after 3" not "the section whose stable id contains marker `xyz`".

When sections are deleted (e.g. `Join with previous`), the workspace clears the
selection back to the section currently containing the playhead.

### 4. Metronome calibration has two scopes per song

Stored on the song row:

- `metronomeSongCalibration` — whole-song grid (anchored to `t = 0`).
- `metronomeBySegmentId[segmentId]` — per-section overrides.

A calibration carries:

- `bpm` — beats per minute.
- `anchorMediaTime` — media time (seconds) where a beat lands. Used directly by
  the metronome rAF (`useStanzaMetronomeSync`) for click scheduling.
- `firstBeatOffsetSec` — `anchorMediaTime − segmentStart`. Stored alongside so
  that **moving the section's start** can re-anchor the click without losing the
  user's tap-aligned offset (see `calibrationEffectiveAnchorMediaTime`).
- `source` — `'tap'` (manual) or `'analysis'` (Essentia auto-detect, see
  [ADR 0005](./0005-shared-find-the-beat-analyzer.md)). `confidence` /
  `analyzedAt` are present only on `'analysis'`.

Inheritance: when a section has no calibration but the song does,
`inheritedFirstBeatOffsetSecFromSongCalibration` reprojects the song's grid onto
the section's start.

### 5. The "scope" flip is per-song UI state, not a separate calibration

`song.metronomeTimingScope: 'song' | 'section'` is the single source of truth for
what the rail edits. The rail switches between `metronomeSongCalibration` and
`metronomeBySegmentId[segmentId]` based on this flag. **The default is `'song'`**:
new songs land in whole-song scope so that calibrating the BPM once is the
obvious first action, and per-section overrides become an explicit opt-in for
songs whose tempo actually drifts. We deliberately did NOT introduce a third
"song-level draft that propagates to sections" mode: the user can already do that
by editing in song scope (which only writes `metronomeSongCalibration`) and then
the inheritance rule above takes over for sections without overrides.

When the user is in song scope but the active section has its own calibration, an
inline alert tells them their edit will not change that section. This prevents a
silent surprise where the user "fixes the BPM" but the loaded section keeps
clicking on the old grid.

### 6. Skipped sections piggyback on stable segment ids

`song.skippedBySegmentId: { [segmentId]: true }` records sections the user has
opted out of forward playback (e.g. instrumental breaks while practicing
vocals). It hangs off the song row keyed by the same stable segment ids as
metronome calibration, so a marker drag does not lose the flag.

The semantics are deliberately narrow:

- A skip flag only auto-advances during **forward playback** (the playback RAF
  in `StanzaWorkspace`). Manual scrubs and explicit section-button clicks
  bypass skip for the section the user just entered, until the playhead
  naturally crosses into a different section.
- Skip applies in all loop modes (play-through, loop-all, loop-selection). When
  every remaining section in the current window is skipped, play-through
  pauses and looping rewinds to the window start.
- The on-disk representation is sparse: only skipped ids appear, and the field
  is dropped entirely when the map empties. This keeps Drive backups small and
  diff-friendly for songs nobody has marked sections on.

The math lives in `utils/stanzaSkippedSections.ts` as
`nextNonSkippedTimeForwardPlayback`, which is pure and unit-tested. The
StanzaWorkspace RAF only contributes the side-effects (seek, pause, the
"user just entered this section" gating ref).

### 7. Beat-grid snap and selection padding

Two related operations live in `utils/stanzaBeatGrid.ts`:

- `snapSegmentBoundaryMarkersToBeats` — aligns a section's boundaries to its
  effective beat grid (section override, else whole-song calibration, else
  120 BPM):
  - **Start** snaps to the nearest beat (≤ ½ period either way), so
    `firstBeatOffsetSec` becomes 0 and the section starts on Beat 1. For a
    section-scope calibration the function returns an `updatedSegmentCalibration`
    that re-anchors Beat 1 onto the new start (the rail's "Beat 1 offset" reads
    0 immediately). The new start is itself a beat of the original grid, so
    the underlying click cadence in absolute media-time is unchanged — we are
    only relabelling which grid beat counts as "Beat 1". The first section's
    start is fixed at 0 with no marker and is left alone.
  - **End** pads forward to the next beat at or after, so the metronome can
    play the section's last beat in full. The last section's end is the
    track end and is left alone.
  - Returns `null` (refuses the operation entirely) if a snap target collides
    with a neighbouring marker / the track end, or if the post-snap layout
    would shrink any segment below `STANZA_MIN_LOOP_SPAN_SEC`. We prefer a
    deterministic "no change" over a partial fix.
- `sectionBoundaryBeatMisaligned` — flag for the warning banner / hover-card
  snap affordance. Mirrors the snap scope: checks the start and end on the
  effective grid, but skips boundaries that aren't user-movable (first
  section's start, last section's end).
- `commitSelectionSpanToHullBoundaryMarkers` — moves the **outer** splits of the
  selected range to match the user's pink "selection span" (which can be padded
  or nudged without modifying markers). Inner splits between selected sections
  stay put.

Selection padding (`StanzaSectionSelectionExtend` in `stanzaPlaybackLoop.ts`) is
a **transient UI-only** concept that lives in workspace state, not on the song
row. The user has to hit the commit-to-boundaries icon to write it back into
markers. This is intentional: padding is the "did I actually want this loop a
beat earlier?" exploration, and burning it into markers eagerly would make the
section list jitter while the user explored.

## Consequences

- Adding new section-attached state is cheap: pick a key (string), hang it off
  the song row keyed by `segmentId`. The merge pipeline preserves any field it
  doesn't understand.
- Marker drags are O(markers) and run on every pointer move — the timeline
  clamps to neighbors via `clampMarkerTime` so that drag math stays simple.
- The dual scope (song vs section) requires the rail to maintain three drafts at
  once (rail BPM, rail offset, modal BPM/offset). This is annoying to refactor
  and is the main reason `StanzaSectionMetronomeRail.tsx` is allowed to remain a
  ~700-line single component (see its file header).
- Drive merge (ADR 0006) walks the `metronomeBySegmentId` map keyed by these
  stable ids; renaming the id scheme would invalidate every existing backup.

## Links

- [`src/stanza/db/stanzaDb.ts`](../../src/stanza/db/stanzaDb.ts) — data shape.
- [`src/stanza/utils/segments.ts`](../../src/stanza/utils/segments.ts) — derive +
  legacy + boundary helpers.
- [`src/stanza/utils/stanzaSegmentMigration.ts`](../../src/stanza/utils/stanzaSegmentMigration.ts) — one-shot legacy id rewriter.
- [`src/stanza/utils/stanzaMetronome.ts`](../../src/stanza/utils/stanzaMetronome.ts) — calibration build / inherit helpers.
- [`src/stanza/utils/stanzaMetronomeResolution.ts`](../../src/stanza/utils/stanzaMetronomeResolution.ts) — playback-time picker (live rail draft vs persisted vs inherited).
- [`src/stanza/utils/stanzaBeatGrid.ts`](../../src/stanza/utils/stanzaBeatGrid.ts) — snap and grid math.
- [`src/stanza/utils/stanzaSkippedSections.ts`](../../src/stanza/utils/stanzaSkippedSections.ts) — pure helper for skip-during-forward-playback.
- [`src/stanza/components/StanzaSectionMetronomeRail.tsx`](../../src/stanza/components/StanzaSectionMetronomeRail.tsx) — UI for both scopes.
- ADR [0005](./0005-shared-find-the-beat-analyzer.md) — how `'analysis'`-source calibrations get their numbers.
- ADR [0006](./0006-stanza-drive-backup-merge-and-restore.md) — how the keyed map survives Drive sync.
