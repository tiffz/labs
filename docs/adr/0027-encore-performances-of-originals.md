# ADR 0027 — Encore performances may be logged against an original

- **Status:** Accepted
- **Date:** 2026-08-07
- **Amends:** [ADR 0012 — Encore Originals as a separate local-first domain](0012-encore-originals-local-first-domain.md) (decision 1)

## Context

ADR 0012 split songwriting from repertoire: `EncoreOriginalSong` lives in its own Dexie table, its
own Drive folder, its own wire and merge. Decision 1 states an original "does **not** appear in
`EncoreSong` or `repertoire_data.json` in v1" and that there is "**no** 'promote to repertoire'
bridge yet". Its Consequences already anticipate "repertoire promotion" as future work.

That split left one job impossible: **logging a gig of your own song.** `EncorePerformance.songId`
pointed only at `songs`, so the only way to record a performance of an original was to hand-create
a duplicate `EncoreSong` — a row with no artist that then polluted the library table, tag filters,
saved searches, Spotify playlist sync, and the public snapshot. The workaround was worse than the
gap.

A performance is not really a repertoire concept. `PERFORMANCE_UX.md` already defines it without
reference to repertoire: "a logged event: date, venue, notes, accompaniment, and one or more
videos". What it was missing is a **subject**.

## Decision

1. **A performance has a subject, which may be a repertoire song or an original.**
   `EncorePerformance.songId` **stays required** and carries the subject id either way; a new
   optional `subjectKind: 'song' | 'original'` says which table it points at. Absent means `'song'`,
   so every row written before this change keeps its meaning with no migration.

2. **`resolvePerformanceSubject` is the only place allowed to branch on the discriminant.** It is a
   pure function taking both id maps as parameters, so the coupling lives at the call site rather
   than as a module-level repertoire → originals import.

3. **Dependency direction: repertoire may hold an id reference to an original; originals must not
   import repertoire modules.** (Originals already depend on shared repertoire _types_ —
   `EncoreMiscResource` — which is unchanged.)

4. **Originals delete tombstones ride the repertoire extras row** (`deletedOriginalIds`). Originals
   sync through their own shard layout, but the extras row is the only single-row object both sides
   already merge, and a tombstone that does not reach a peer means a delete never applies there.

5. **Originals stay out of the public snapshot.** `filterSnapshotSource` drops any performance with
   `subjectKind === 'original'` before the optional `onlyPerformedSongs` intersection. Originals
   have no snapshot representation, so such a row would publish a date, venue, notes and a resolved
   video URL with no subject a guest could resolve.

6. **Deleting an original does not cascade to its performances.** They resolve to `kind: 'unknown'`
   and render on UI that already exists. Performance history is irreplaceable; a dangling pointer is
   not.

7. **The repertoire list is unchanged.** This ADR bridges _performances_ only. Originals still do
   not appear in `#/library`, and no `EncoreSong` row is ever created for one.

## Alternatives rejected

- **`songId?: string` + `originalId?: string`.** Makes "neither set" and "both set" representable —
  and `BulkPerformanceImportDialog` already writes `songId = prev?.songId ?? ''`. Optionality also
  leaks into the published guest contract through `PublicSnapshotPerformance`'s `Pick<>`, and empties
  the `performances.songId` Dexie index for originals: IndexedDB omits records whose index key is
  `undefined`, which would silently break all seven `where('songId')` queries (cascade delete, video
  side effects). One-way door once rows exist.
- **A linked stub `EncoreSong` with `originalOfId`.** Two physical rows with two titles that drift
  the first time the song is renamed in Originals. A broken single source of truth regardless of who
  created the row.
- **Widening `EncoreSong` with the songwriting fields.** Merges two sync grains ADR 0012
  deliberately split, and every new field would need a disposition in `SONG_MERGE_POLICY`.

## Consequences

- `songId` no longer literally names its target. Paid down with a doc comment on the field and the
  `resolvePerformanceSubject` / `performanceSubjectKey` accessors; **read those, not the raw field**.
- Insights groups by `performanceSubjectKey` (`<kind>:<id>`), so a song and an original can never
  merge into one subject.
- Drive filenames omit the artist segment for originals rather than stamping "Unknown artist"; this
  must be threaded through `syncPerformanceVideo`, which renames files after upload.
- `encoreDataRecovery` must skip original-subject performances when synthesizing missing song rows,
  or it would put the same id in both tables.
- Two-way door: drop `subjectKind` and every row still points somewhere.

## Fitness functions

- `PERFORMANCE_MERGE_POLICY` is `satisfies Record<keyof EncorePerformance, MergePolicy>`, so
  `subjectKind` could not be added without a conscious disposition (`'lww'` — the subject pointer
  moves as a unit and must never be `preserve-filled-*`).
- `driveSyncLayerPresence.test.ts` asserts the originals tombstone layer is recorded on delete,
  cleared on undo, and consulted on pull — and that the repertoire pull never blanket-clears
  originals push intent.
- `performanceSubject.test.ts`, `performancesStatsModel.test.ts`, `publicSnapshot.test.ts`,
  `originalsSharded.test.ts`, `repertoireWire.test.ts`.
