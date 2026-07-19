# shared/notation — VexFlow score rendering + playback highlight

Score display and drum notation primitives shared by Drums, Words, Piano, and Encore surfaces.

## Map

| Area               | Files                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Score rendering    | `ScoreDisplay.tsx` (VexFlow; large — decomposition tracked in `docs/TECH_DEBT_ROADMAP.md`), `scoreDisplayHelpers.ts` |
| Drum glyphs        | `drumSymbols.ts`, `DrumNotationMini.tsx`, `notationMini.css`                                                         |
| Playback highlight | `playbackSvgHighlight.ts` — SVG note highlight during playback                                                       |
| VexFlow utils      | `vexFlowDuration.ts`, `vexFlowFontExport.ts`                                                                         |
| Metronome dots     | `metronomeDotLayout.ts`                                                                                              |

## Contracts

- **VexFlow bugs (beams, duration mapping, highlight drift):** read skill [`labs-playback-bugfix`](../../../.cursor/skills/labs-playback-bugfix/SKILL.md) and [`PLAYBACK_RENDERING_AUDIT.md`](../music/PLAYBACK_RENDERING_AUDIT.md) first — most classes have regression tests to extend.
- Rendering is deterministic for visual baselines — fonts come from the shared font bootstrap, not runtime fetches (`vexFlowFontExport.ts`).
- Keep components presentation-only; timing/state lives in [`../playback/`](../playback/README.md) hooks.
