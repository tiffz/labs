# ADR 0031: Lyrefly ideas and works: one behaviour, two records

## Status

**Accepted** (October 2026). Design and review:
[`docs/design-explorations/lyrefly-one-work-model.md`](../design-explorations/lyrefly-one-work-model.md).

## Context

The owner wants a Sketchbook note to be "the same kind of object" as a comic: a comic still in
brainstorming. Brainstorm-only work should stay out of the Workbench and the Library; developing
it (a script, pages, or saying so) moves it to the Workbench; finishing it moves it to the Library.
Ideas and comics should collect into the same collections and merge into each other.

The first draft turned every note (`SketchbookSeed`) into a `ComicProject` by bulk migration. An
architecture review found that migration unsafe here:

- A derived project id converges the project row across devices, but promotion mints random ids
  for the script document and every asset, so two devices migrating produce duplicates and orphans.
- A project delete is a permanent id tombstone (`lyreflyDriveTombstones.ts`), so undoing and
  re-running a migration makes a note vanish from every view.
- Promotion silently skips an attachment whose bytes are not on this device, then hides the seed.
- A project with no pages re-downloads its whole Drive package on every sync, so hundreds of
  ideas as projects make every sync slow.

## Decision

1. **Two records, one behaviour.** A note stays a `SketchbookSeed`, synced in the gallery envelope,
   until it is developed. Every view treats a seed and a brainstorm-only `ComicProject` alike: the
   same card, the same place, the same collect and merge actions.
2. **Developing creates the project, with derived ids throughout.** The project id, its script
   document id and each asset id derive from the seed (`lyreflyStableId('work-from-seed:' + …)`),
   so promoting on two devices lands on the same rows. Assets reference the seed's Drive file
   (`driveFileId`) instead of copying bytes; an attachment that is neither local nor on Drive
   blocks the promotion with its reason, rather than being dropped.
3. **Where a work shows is derived from its content** by one function, `lyreflyWorkPhase`:
   - `complete`: finished, or published at least once → the Library.
   - `developing`: `developingAt` set ("Start developing"), real script text, or any page →
     the Workbench.
   - `idea`: otherwise → the Sketchbook. Every seed is an idea.
   - `null`: the project's Drive package is not on this device yet. Views do not guess.

   The built-in sample script does not count as script text. `developingAt` is a plain
   last-writer-wins field, because `stageCompletion` merges as a one-way OR and could never move a
   work back.

4. **No bulk migration.** Existing seeds stay seeds.
5. **Nothing in a merge or a promotion deletes.** A merged-away work is archived with
   `mergedIntoId`; a promoted seed stays as a row marked `promoted`.

## Alternatives

- **Every note becomes a `ComicProject` now** (the first draft). One record type, at the price of
  a distributed migration, a Drive folder per idea, and per-sync package downloads. Rejected for
  the reasons above.
- **A new `Work` type both become.** A rename of `ComicProject` with a migration of every comic.

## Consequences

- Seeds and projects both need handling in the Sketchbook, collections and merge. `lyreflyWorkPhase`
  is the only place a view decides where a work goes (guarded by a test).
- Tracker comics with neither script nor pages show in the Sketchbook, as ideas.
- Assets can now reference a Drive file in another folder (a seed's). Any future "clean up orphan
  Drive files" job must check every reference first.
- `pipelineStatus` keeps its stored values but no view reads it.
