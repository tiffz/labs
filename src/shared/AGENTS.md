# Shared library — agent context

Nested **`AGENTS.md`** for `src/shared/`. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`SHARED_UI_CONVENTIONS.md`](SHARED_UI_CONVENTIONS.md) — primitives, popovers, playback field selects.
2. [`layout/README.md`](layout/README.md) — app shell / workbench starter.
3. **Playback / notation:** [`hooks/PLAYBACK_HOOK_PATTERN.md`](hooks/PLAYBACK_HOOK_PATTERN.md), [`music/PLAYBACK_RENDERING_AUDIT.md`](music/PLAYBACK_RENDERING_AUDIT.md), [`notation/vexFlowDuration.ts`](notation/vexFlowDuration.ts), [`notation/playbackSvgHighlight.ts`](notation/playbackSvgHighlight.ts).
4. **Drive backup / local-first sync:** [`../../docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md), [`SHARED_UI_CONVENTIONS.md`](SHARED_UI_CONVENTIONS.md) § Drive, skill `labs-drive-backup`. Shared code: `drive/` (transport, conflict assessor, auto-sync hook), `google/` (account menu, OAuth).
5. **Dexie live queries:** [`dexie/resolveDexieLiveQuery.ts`](dexie/resolveDexieLiveQuery.ts) — distinguish loading (`undefined`) from empty; rule `.cursor/rules/dexie-live-query-empty-states.mdc`.

## Rules

- **Only cross-app reuse** lives here — apps must not import each other.
- New shared components → document in `SHARED_UI_CONVENTIONS.md` and demo under **`/ui/`** (`src/ui/` catalog).
- Register new consumers in `importBoundaries.test.ts` when adding app-facing APIs.

## Tests worth knowing

- `importBoundaries.test.ts`, `spaGuardrails.test.ts`
- `playbackFieldSelect.test.ts`, `useChartChordPlayback.test.ts`
- Rhythm: `presetIntegrity.test.ts`
