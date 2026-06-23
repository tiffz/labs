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
