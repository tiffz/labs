# Drag-and-drop (drums notation)

**Read when:** changing pattern drag/drop or drop previews on the VexFlow surface.

Three pure layers (do not merge concerns into `VexFlowRenderer`):

| Layer            | Module                      | Role                                                   |
| ---------------- | --------------------------- | ------------------------------------------------------ |
| Drop target      | `utils/dropTargetFinder.ts` | Cursor + note positions → target note/gap (line-aware) |
| Replace/insert   | `utils/dragAndDrop.ts`      | Notation string ops; beat snapping; partial “cut”      |
| Preview geometry | `utils/previewRenderer.ts`  | Highlight / insertion-line bounds                      |

`VexFlowRenderer` orchestrates: identify → compute → preview bounds → on drop apply. Visual vs logical measure coords / repeats: [`DEVELOPMENT.md`](../DEVELOPMENT.md) § Sequencer.

**Tests:** `dropTargetFinder.test.ts`, `dragAndDrop.test.ts`, `previewRenderer.test.ts`.
