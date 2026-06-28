# ADR 0019: Encore sync is content-aware and non-destructive (no empty-over-filled clobber)

## Status

Accepted (June 2026)

## Context

Encore syncs the repertoire as a single JSON file (`Encore_App/repertoire_data.json`) and merges
songs **whole-row, last-writer-wins by `updatedAt`** (`mergeRecordsByUpdatedAt`). Exercise answers
(`song.practiceExerciseRuns` — "lyrics in your own words", section narratives, the nine character
questions) live **inside the song row**. There was no content awareness anywhere in the merge.

A real data-loss incident ("Because of You") followed directly from this design:

1. Prod had the song filled in (hours of answers). It synced to Drive.
2. A dev instance held an empty copy of the same song whose `updatedAt` had drifted **newer** than
   prod's (an incidental edit, or the conflict resolver's own `bumpedClock`). Dev auto-pushed the
   empty-but-newer row, **overwriting the filled copy in Drive**.
3. The user hit the conflict dialog in dev and picked **"Use Drive"**, expecting prod's filled copy
   — but Drive was already empty, so it restored empty.
4. Prod later auto-pulled, saw Drive newer, and `mergeRecordsByUpdatedAt` kept the empty row
   because its timestamp was newer → **prod cleared too.**

Root cause: **wall-clock last-writer-wins at row granularity treats "cleared all answers" exactly
like "edited the title."** An empty/sparser copy with a newer clock silently destroys filled work.

## Decision

**Merge repertoire content non-destructively. Filled user content must never be lost to an
empty or sparser copy — regardless of timestamps or coarse conflict choices.**

Implemented in [`encoreRepertoireMerge.ts`](../../src/encore/drive/encoreRepertoireMerge.ts):

1. **Sub-entity merge.** Exercise runs merge by stable run `id` (union — a run on only one side is
   kept). For the same id, a copy **with content always beats a copy with no content**, regardless
   of which `updatedAt` is newer. Only when both copies have content does richer-then-newer win.
2. **Song merge preserves answers.** `mergeSongPreservingExercises` takes the newer row's scalar
   fields (we have no per-field clocks) but always unions `practiceExerciseRuns` via the rule above.
   `mergeSongRecords` replaces `mergeRecordsByUpdatedAt` for songs in `pullRepertoireFromDrive`.
3. **Coarse choices never delete answers.** In `resolveConflictWithChoices`, "keep this device" /
   "use Drive" selects _scalar_ fields only; exercise answers from both copies are always merged in.
   The coarse "Use Drive" path (`resolveConflictUseRemoteThenPush` → pull-merge) inherits this.
4. **Content-aware conflict UI.** The review dialog shows per-song answer counts
   ("device: 12 · Drive: 0 — answers from both copies are kept") so a coarse pick is never blind;
   the coarse dialog states plainly that answers are preserved either way.

### Recovery from history (generalized)

Because the bytes already exist in history, recovery is built in
([`encoreRecoveryRunner.ts`](../../src/encore/drive/encoreRecoveryRunner.ts) +
[`encoreDataRecovery.ts`](../../src/encore/drive/encoreDataRecovery.ts)): Account menu →
**Recover lost data from history** scans every revision of `repertoire_data.json` **plus the local
pre-sync undo snapshots** (a second source — Drive prunes old revisions, snapshots on the device may
not), reconstructs the richest copy of every entity, and offers back only what the current library is
missing. It is not limited to exercise answers: it detects **deleted songs, lost media/file
references, misc resources, emptied lyrics/journal text, and deleted performances**, presented as
per-song, per-category toggles. Restore copies only the chosen categories from the reconstructed
superset onto the live row through the same non-destructive merge + an undo snapshot, so it can only
_add_ back content the user no longer has — never overwrite or remove anything present now. This also
doubles as the "restore the other side of a merge" safety net the user asked for.

> Drive auto-prunes unpinned revisions of non-Google files (≈100 revisions / 30 days), so Drive-based
> recovery is time-sensitive after an incident; the local undo snapshots (up to 10) widen the window.

## Consequences

- **Positive:** The catastrophic failure mode (empty clobbers filled) is structurally impossible for
  exercise answers. Coarse conflict choices are safe. Lost answers are recoverable from Drive history
  in-app.
- **Trade-off — resurrection over loss.** Union-by-id can resurrect an intentionally deleted run
  (no tombstones yet). This is deliberate: a stray empty/old run is annoying and recoverable; lost
  answers are catastrophic. Add run tombstones if/when delete-exercise UX ships.
- **Trade-off — partial both-edited.** When both sides have content for the same run, richer-then-
  newer wins (text can't be auto-merged). True simultaneous edits route to the content-aware conflict
  dialog rather than a silent merge.
- **Scope:** scalars (title, links, etc.) still follow song-level newer-wins; only content-bearing
  fields are protected. Broaden the protected-field set if another rich field is reported lost.

## Cross-app principles

Generalized in [`docs/LOCAL_FIRST_SYNC.md`](../LOCAL_FIRST_SYNC.md) § Data-loss guards for all
cloud-synced Labs apps:

1. **Non-destructive merge for additive content** — empty/sparser must never silently beat filled.
2. **Sub-entity merge by stable id**, not whole-row last-writer-wins, for compound rows.
3. **Content-aware conflict surfacing** — show what is at stake (counts), never a bare "Use Drive".
4. **Revision history is a first-class recovery path** — expose in-app restore from older versions.
5. **Don't bump timestamps without content changes**; treat wall-clock LWW as fragile.

## Related

- [`docs/LOCAL_FIRST_SYNC.md`](../LOCAL_FIRST_SYNC.md) — architecture, data-loss guards
- [ADR 0006](0006-stanza-drive-backup-merge-and-restore.md) — Stanza merge/tombstones/undo
- [ADR 0007 revision](0007-revision-stanza-encore-federated-sync.md) — federated sync
