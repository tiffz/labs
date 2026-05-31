# Drums — agent context

Nested **`AGENTS.md`** for Drums. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — editing, playback, URL state.
2. [`DEVELOPMENT.md`](DEVELOPMENT.md) — deep architecture when touching sequencer/notation.
3. **Shared notation:** [`../shared/notation/`](../shared/notation/) — `DrumNotationMini`, `drawDrumSymbol`, `vexFlowDuration.ts` (do not duplicate symbol paths or sixteenth→VexFlow mapping).
4. **Shared UI:** [`../shared/SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md) — BPM/sound pickers, volume sliders.
5. **Playback hooks:** [`../shared/hooks/PLAYBACK_HOOK_PATTERN.md`](../shared/hooks/PLAYBACK_HOOK_PATTERN.md).

## Pitfalls

- **Symbol drawing:** use `drawDrumSymbol` from `src/shared/notation/drumSymbols.ts` — not inline SVG paths in renderers.
- **Duration helpers:** use `sixteenthTicksToVexFlowDuration` / `durationToVexFlow` from shared — not local copies.
- **Stable props:** memoize objects passed to notation mini hosts and playback children.
- **Async stop:** generation token + real `stopAll()` when touching `usePlayback` / rhythm player.

## Tests

- Unit: `npm test -- src/drums`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
