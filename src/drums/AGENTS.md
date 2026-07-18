# Drums — agent context

Nested **`AGENTS.md`** for Drums. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — editing, playback, URL state.
2. [`DEVELOPMENT.md`](DEVELOPMENT.md) — sequencer/repeats, time signatures, randomization (read when touching those).
3. **Deep guides (stubs):** [`docs/TAB_IMPORT.md`](docs/TAB_IMPORT.md), [`docs/DRAG_AND_DROP_ARCHITECTURE.md`](docs/DRAG_AND_DROP_ARCHITECTURE.md), [`docs/URL_SHARING.md`](docs/URL_SHARING.md) → repo URL-state pattern.
4. **Shared notation:** [`../shared/notation/`](../shared/notation/) — `DrumNotationMini`, `drawDrumSymbol`, `vexFlowDuration.ts`.
5. **Shared UI:** [`../shared/SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md).

## Pitfalls

- **Symbol drawing:** use `drawDrumSymbol` from `src/shared/notation/drumSymbols.ts` — not inline SVG paths in renderers.
- **Duration helpers:** use `sixteenthTicksToVexFlowDuration` / `durationToVexFlow` from shared — not local copies.
- **Playback / async stop:** `.cursor/rules/playback-ui-regressions.mdc` + skill `labs-playback-bugfix` (stable props, generation token, real `stopAll()`).

## Tests

- Unit: `npm test -- src/drums`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
