# ADR 0027: Stanza Organize — cross-source merge safety contract

## Status

**Accepted** (July 2026) — the owner approved building the full Organize merge (detection, review UI,
and both same-source and cross-source merge) to this contract. The merge apply-path is implemented and
every clause below is enforced with a test (see **Implementation**). It still lands on `main` only
after `labs-qa-review` and the owner's listen-test.

## Context

Stanza's silent dedup engine (`stanzaSongContentKey`, `consolidateStanzaSongDuplicates`) collapses
only rows that point at **byte-identical** content — same `ytId`, same `driveSourceFileId`, same
`localMediaFingerprint`. The owner's real pain is **near-duplicates the silent engine cannot see**:
two different YouTube uploads of one song, a YouTube row plus a local upload of the same take, two
Drive files of the same export. Those produce different content keys, so nothing collapses.

The "Organize" feature adds fuzzier detection plus a human confirm. The design spike and the
architecture review split the work sharply:

- **Same-source merge** (two rows, identical content key) is a **two-way door** — the surviving row
  keeps the same `ytId`/blob, so nothing unique is lost. The existing `mergeStanzaRicherSongMetadata`
  already handles it.
- **Cross-source merge** (two rows, _different_ recordings) is a **one-way, data-loss door**. A
  `StanzaSong` holds exactly **one** primary source (`ytId` **or** `driveSourceFileId` **or**
  `localAudioBlob`). Merging two different recordings forces discarding a source. The architecture
  review flagged this path as safe to build **only behind the contract below** plus owner testing.

Detection shipped first as pure, read-only analysis (`src/stanza/organize/stanzaDuplicateHeuristics.ts`).
The merge apply-path is built to the contract in the same feature: a PURE planner
(`stanzaOrganizeMerge.ts`) decides every risky move and a thin applier (`stanzaOrganizeApply.ts`)
executes it.

## Decision

**Build the cross-source merge only when it honors every clause of this contract, gated behind
`labs-qa-review` plus an owner listen-test.**

The cross-source merge MUST honor:

### 1. No silent media loss — user picks the surviving recording

Merging different recordings is **choosing which recording plays**. The merge preview MUST surface a
**"Play from" choice** listing each candidate's source (YouTube A / YouTube B / uploaded file). The
chosen source sets `ytId` / `driveSourceFileId` / `practiceSource`; the others are dropped from the
merged row. This is the one mandatory user decision — never silent.

### 2. A unique local blob must be preserved or the merge refuses

Durable undo is **metadata-only** — `stanzaDriveEnvelope.ts` excludes `localAudioBlob`, stems, and
thumbnails from the Drive snapshot. So a dropped local blob that exists on no other row is **gone
permanently** once the transaction commits; the Drive undo snapshot cannot bring it back. Therefore:
a unique `localAudioBlob` (or unique stem blob) on a discarded row MUST be **preserved** — inherited
onto the survivor (`inheritLocalArtefacts`) or uploaded to Drive first — **or the merge refuses**.
Never permanent media loss.

### 3. Segment-keyed maps: keep only the survivor's

`stats`, `metronomeBySegmentId`, `drumPatternBySegmentId`, and `takes.segmentId` are keyed by stable
segment ids derived from **marker times on one specific recording** (`deriveSegments`). Across two
different recordings those ids **do not align** — the same key means a different moment. A key-union
would graft one recording's practice history/calibration onto unrelated positions of another.
Cross-source merge MUST keep **only the surviving recording's** segment-keyed data and drop the
donor's, and MUST **state this in the preview** ("the other copy's per-section timing will be
dropped"). (Same-source merge keeps the existing union — there the ids do align.)

### 4. Dropped rows must tombstone (including keyless local uploads)

Deleting a merged-away row without a tombstone lets the next Drive pull **resurrect** it
(`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`, ADR 0020). Every dropped row MUST emit a tombstone into
the Drive envelope. Local-only uploads that never got a synced key still need an **id-level
tombstone**, or a peer device re-adds the duplicate.

### 5. Two-layer undo stays mandatory

In-session `useLabsUndo` snapshot before apply (keyboard-first, Stanza convention) **and** a
`pre-merge` Drive undo snapshot before the Dexie transaction — both already exist. Note the
limitation from clause 2: the durable layer restores metadata only, which is exactly why unique
blobs must be preserved up front, not "recovered later."

### 6. Fitness-function tests before cross-source ships

Cross-source merge does not ship until these regression tests are green (per
`docs/TEST_STRATEGY.md` § Mandatory feature-test matrix). All three now pass in
`stanzaOrganizeApply.test.ts` / `stanzaOrganizeMerge.test.ts`:

- **drop → tombstone → no-resurrection:** a merged-away keyless-local row stays gone across a Drive
  pull that still lists it (control proves it resurrects without the tombstone).
- **blob-preservation:** a unique `localAudioBlob`/stem is never dropped — carried onto the survivor
  or the merge refuses.
- **cross-source segment integrity:** only the survivor's segment-keyed maps remain; donor keys are
  not unioned onto mismatched positions.

## Implementation (Phase 1)

The risky decisions are pure and unit-tested; the applier is a thin executor.

| Clause                                | Enforced by                                                                                                                                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. User picks the surviving recording | `planStanzaOrganizeMerge` reads `selection.playFromId`; `applyPlayFromSource` writes `ytId`/`driveSourceFileId`/`practiceSource`.                                                                                                                                                               |
| 2. Never lose a unique un-backed blob | Blob-safety gate in `planGroup` **refuses** any group that would drop a member's un-backed `localAudioBlob`/stem not carried onto the survivor. Refusing is the MVP choice; upload-then-merge is deferred.                                                                                      |
| 3. Survivor-only segment-keyed data   | Cross-source donors are never folded; only same-source donors union via `mergeStanzaRicherSongMetadata`. Donor takes are deleted (`takeDropSongIds`); same-source takes remap (`takeRemapIds`).                                                                                                 |
| 4. Tombstones on discarded sources    | `tombstones.{driveSourceFileIds,youtubeVideoIds,localSongIds}`; the new id-level `stanzaLocalSongTombstones` store + a `deletedLocalSongIds` envelope field + a `localSongTombstoneIds` filter in `mergeDriveRowsIntoLocalLibrary`. Never tombstones a source a surviving row still references. |
| 5. Two-layer undo                     | `applyStanzaOrganizeMerge` writes a `pre-merge` Drive snapshot and returns `undo`/`redo` (capturing pre-rows/takes/tombstones) for the UI's `useLabsUndo`.                                                                                                                                      |

## Consequences

- **Positive:** Delivers the owner's most-wanted capability (collapsing near-duplicates) with the
  data-loss surface fenced by the contract: pure planner, refuse-not-lose on un-backed media,
  survivor-only cross-source data, tombstones, two-layer undo.
- **Positive:** The lossy path was written down before it was built, so the merge has a concrete,
  testable bar rather than being discovered in production.
- **Trade-off:** The owner must make a "Play from" choice per cross-source group — deliberate
  friction, and the correct default given irreversible media loss.
- **Trade-off:** Cross-source merge cannot union segment-keyed practice history; the donor's per-
  section timing/stats and its practice takes are dropped. Accepted — grafting mismatched keys is
  worse than dropping, and the preview states it plainly.
- **Trade-off (MVP):** a group holding un-backed unique audio is **refused** rather than
  uploaded-then-merged. The user backs up first, or leaves that group out. Upload-then-merge is a
  later nicety.

## Alternatives considered

- **Union segment-keyed maps across recordings** — rejected: segment ids are time-derived and do not
  align across recordings, so a union corrupts practice history.
- **Store multiple sources per song (Encore-style attachment slots)** — a larger schema change
  (`StanzaSong` assumes one primary source across playback, metronome, transpose). Out of scope;
  revisit if multi-source practice becomes a real need.

## Links

- Design spike: Stanza Organize — duplicate detection + smart merge (§C heuristics, §D merge, §F scope)
- Detection engine: `src/stanza/organize/stanzaDuplicateHeuristics.ts`
- Merge planner + applier: `src/stanza/organize/stanzaOrganizeMerge.ts`, `stanzaOrganizeApply.ts`
- Id-level tombstones: `src/stanza/drive/stanzaLocalSongTombstones.ts` (+ `deletedLocalSongIds` in `stanzaDriveEnvelope.ts`, filter in `stanzaDriveMerge.ts`)
- [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../DRIVE_SYNC_DATA_LOSS_PREVENTION.md) — guard matrix
- [ADR 0020](0020-silent-union-sync-row-conflicts-only.md) — silent union sync, tombstones
- [ADR 0006](0006-stanza-drive-backup-merge-and-restore.md) — Stanza Drive backup + undo snapshots
- [ADR 0024](0024-major-change-ux-qa-review-gates.md) — major-change review gates (PM / arch / UX / QA)
- `src/stanza/utils/stanzaSongDeduplication.ts`, `src/stanza/utils/stanzaSongMetadataMerge.ts`
