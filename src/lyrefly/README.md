# Lyrefly

Local-first comic workbench for tracking projects from sketchbook through script, thumbs, art, and publishing.

## Script

Nested-bullet comic script (Google Docs style). See [`SCRIPT_FORMAT.md`](SCRIPT_FORMAT.md).

## Routes

- `#/gallery` — Your comics shelf (default)
- `#/project/:id` — Project workbench (brainstorm → script → art → publish)
- `#/project/:id/script` — Script stage (also reachable via workbench stepper)

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
