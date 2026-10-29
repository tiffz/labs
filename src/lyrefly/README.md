# Lyrefly

Local-first comic workbench for tracking projects from sketchbook through script, art, and publishing.

## Ideas, works and where they show

One function, `lyreflyWorkPhase` (`workflow/lyreflyWorkPhase.ts`), decides where a comic shows
([ADR 0031](../../docs/adr/0031-lyrefly-ideas-and-works.md)):

- **Sketchbook** (`idea`): notes, and comics with only brainstorm material.
- **Workbench** (`developing`): "Start developing" (`developingAt`), real script text, or a page.
  The sample script a new comic starts with does not count.
- **Your comics** (`complete`): finished or published. "Show unfinished" shows the rest.

A note stays a lightweight `SketchbookSeed` until it is developed; then it becomes a comic whose
ids derive from the note, so two devices make the same one.

**Merge** (comic header ⋯ → "Merge into another comic…", `db/lyreflyMergeWorks.ts`): the target
gains the source's brainstorm notes, script and brainstorm assets (Drive files referenced, not
copied); the source is archived with `mergedIntoId`, never deleted. Refused, writing nothing, when
the source has pages or either script has not reached this device. No view reads `pipelineStatus`
(`workflow/lyreflyWorkPhaseGuardrails.test.ts`).

**Songs from Encore** (Sketchbook, [ADR 0032](../../docs/adr/0032-other-apps-read-encore-originals.md)):
your Encore originals, read from Drive through `src/shared/federation/encoreOriginalsReader.ts`.
"Start a comic" makes a comic idea with the lyrics quoted and a snapshot of the song in `sources`;
the comic's id derives from the song, so a song starts one comic. Lyrefly never writes Encore data.

## Script

Nested-bullet comic script (Google Docs style). See [`SCRIPT_FORMAT.md`](SCRIPT_FORMAT.md).

## Routes

- `#/gallery` — Your comics: finished work (default)
- `#/workbench` — Comics being developed, by step
- `#/project/:id` — Project workbench (brainstorm → script → art → publish)
- `#/project/:id/script` — Script stage (also reachable via workbench stepper)
- `#/identities` — Pen names, series, and the accounts each one posts from (`#/accounts` still works)

## Thumbs (removed)

The Thumbs step (rough panel mockups) is gone from the workflow for now: it was more confusing than
useful. Mockups and characters made with it still sync in `pageMockups` and `comicCharacters`, so
bringing it back loses nothing.

## Sketchbook

Inline idea capture (notes, flashes, links, art, files). "Start developing" turns a note into a
comic on the Workbench.
Bulk import past flashes from Markdown or JSONL — see [`SKETCHBOOK_IMPORT.md`](SKETCHBOOK_IMPORT.md).

Seeds sync in the gallery envelope (`progress.json` → `sketchbook`); their images and files upload
to `Lyrefly/sketchbook/` before the envelope is written (`drive/lyreflySketchbookSync.ts`). A delete
leaves a small marker row (`deletedAt`, status archived, content cleared) that syncs like an edit, so
the newer of a delete and an edit wins. Before this, seeds never left the browser they were made in.

## Collections

Collections (`#/collections/:id`) are named sets of finished pieces (daily strips, zine photos, old
webcomic pages): raw material, not projects. They show as stacks in the Sketchbook grid, ahead of
loose notes, rather than on a tab of their own; `#/collections` opens the Sketchbook. Archived
collections collapse under **Archived collections**.

Collections also hold notes and comics (`collectionMembers`, ADR 0031): comic header ⋯ → "Add to
collection…". A work can be in many collections; member ids derive from collection and work, and a
removal is a marker row. The collection page lists them above its pieces, and Your comics can filter
by any collection that holds a comic.

- **Add from Drive:** paste a folder link. Images are added in number order (`2.png` before
  `10.png`). Files you own are referenced in place (ADR 0029); a file someone else owns is copied to
  `Lyrefly/collections/` first. Adding the same folder again adds only what is new.
- **Lyrefly never edits, moves or trashes a piece's Drive file.** Deleting a piece or a collection
  removes Lyrefly's record only (`lyreflyCollections.test.ts` asserts no Drive write happens).
- **Make a comic:** select pieces (badges show the order picked), then **Make a comic**. Each image
  is copied in as a page, in that order, so the comic can be redrawn without touching the original.
  Pieces remember which comics they went into (`usedInProjectIds`).
- Sync: collections and pieces ride in the gallery envelope (`collections`), merged through
  policy maps; deletes are marker rows (`drive/lyreflyCollectionsSync.ts`). Thumbnails are fetched
  from Drive on view and cached per device (`pieceThumbs`, never synced).

## Pen names, series and accounts

Four kinds of thing, flat and linked rather than nested (rationale:
[`docs/design-explorations/lyrefly-songs-and-publishing.md`](../../docs/design-explorations/lyrefly-songs-and-publishing.md)):

- **Pen name** (`LyreflyPersona`) and **series** (`LyreflySeries`) each own **accounts** (`LyreflyAccount`).
  A series is not an author: _Between Walks_ has its own accounts but is credited to a pen name.
- A comic stores its own `personaIds` and `seriesId`. A series' pen name is only a default, so changing it
  later does not rewrite the credit of comics already out.
- Nothing is deleted, only retired, so sync is a plain union by id (`drive/lyreflyIdentitiesMerge.ts`).
  They ride in the gallery envelope (`progress.json` → `identities`).
- `personaIds: []` and `seriesId: null` mean "deliberately none" and win a merge; absent means "never set".
- Which account posted a publication is read from its URL (`utils/lyreflyAccountUrl.ts`), never stored.

## Local storage

Dexie database `lyrefly`: projects, page nodes, revisions, script documents, snapshots, archives.

## Google Drive

`Tiff Zhang Labs/Lyrefly/progress.json` — gallery envelope. Per-project packages under `projects/{id}/`.

## Dev

- `/?e2eSeed=1` — seeds a demo comic for smoke tests
- `/?debug=1` — reserved for future debug panel

Visual design: **Riso Cube** — see [`DESIGN.md`](DESIGN.md).

Brand mark: Android feather emoji (`public/icons/lyrefly-feather.png`).

## Related apps

- **Zine Box** — finished PDF reader
- **Zine Studio** (`/zines/`) — print PDF imposition
