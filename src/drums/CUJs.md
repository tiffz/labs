# Drums (Darbuka Rhythm Trainer) — critical user journeys

## CUJ-001 — Open rhythm and play

| Step | Action                 | Performance budget                                        | Verification                               |
| ---- | ---------------------- | --------------------------------------------------------- | ------------------------------------------ |
| 1    | Hard refresh `/drums/` | First paint: input + controls without waiting for VexFlow | `e2e/smoke/drums-load-interaction.spec.ts` |
| 2    | Staff notation appears | VexFlow chunk loads async (skeleton → staff)              | same spec                                  |
| 3    | Click Play             | ≤ `AUDIO_PLAY_INTERACTION_BUDGET_MS` (650ms) after warmup | same spec                                  |

## Notes

- VexFlow (~700KB gzip) is lazy-loaded; palette mini-notation defers until `requestIdleCallback`.
- Playback highlight updates DOM only (no full staff re-layout per tick).

## CUJ-002 — Edit a rhythm with repeats

Editing must land on the note aimed at, in every measure, whatever repeats, ties and meter the
rhythm has. All edits are pure functions in [`utils/notationEdits.ts`](utils/notationEdits.ts).

| Step | Action                                              | Verification                                                               |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------- |
| 1    | Click a note after a repeated section               | `drums-interaction.spec.ts` — one highlight, on that note                  |
| 2    | Arrow to the next note, Delete, undo, redo          | `drums-interaction.spec.ts` — editing journeys                             |
| 3    | Copy a note, shift-select two others, paste         | `drums-interaction.spec.ts` — editing journeys                             |
| 4    | Drag a pattern onto the last measure, or onto a `%` | `drums-interaction.spec.ts`; preview and drop both call `dropPattern`      |
| 5    | Any edit, any rhythm                                | `notationEdits.fuzz.test.ts` (random rhythms × edit chains, exact oracle)  |
| 6    | A case the fuzz once found                          | `notationEdits.test.ts` — one named case per bug, expected strings by hand |
