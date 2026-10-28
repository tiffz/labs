# Lyrefly

Local-first comic workbench for tracking projects from sketchbook through script, thumbs, art, and publishing.

## Script

Nested-bullet comic script (Google Docs style). See [`SCRIPT_FORMAT.md`](SCRIPT_FORMAT.md).

## Routes

- `#/gallery` — Your comics shelf (default)
- `#/project/:id` — Project workbench (brainstorm → script → art → publish)
- `#/project/:id/script` — Script stage (also reachable via workbench stepper)
- `#/accounts` — Pen names, series, and the accounts each one posts from

## Thumbs

Rough panel mockups per script page (script left / mockup right). Parses the script into
panels/dialogue/SFX via [`utils/lyreflyScriptMockup.ts`](utils/lyreflyScriptMockup.ts) and renders
them with the shared `src/shared/comic` mockup engine (`PanelMockupSvg`, `MockupFitCanvas`) under
Lyrefly's own Riso Cube chrome — it does not embed Scrapboard's `ScrapboardBoardEditor`. Print size
matches Draw via `resolveLyreflyPrintSpec`; mockups persist per page in `pageMockups`.

## Sketchbook

Inline idea capture (notes, flashes, links, art, files) that promotes into a comic project.
Bulk import past flashes from Markdown or JSONL — see [`SKETCHBOOK_IMPORT.md`](SKETCHBOOK_IMPORT.md).

Seeds sync in the gallery envelope (`progress.json` → `sketchbook`); their images and files upload
to `Lyrefly/sketchbook/` before the envelope is written (`drive/lyreflySketchbookSync.ts`). A delete
leaves a small marker row (`deletedAt`, status archived, content cleared) that syncs like an edit, so
the newer of a delete and an edit wins. Before this, seeds never left the browser they were made in.

## Collections

**Sketchbook → Collections** (`#/collections`, `#/collections/:id`): named sets of finished pieces
(daily strips, zine photos, old webcomic pages). Raw material, not projects. Ongoing collections
show first; archived ones collapse under **Archived** but stay searchable.

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
