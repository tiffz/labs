# Shared library — agent context

Nested **`AGENTS.md`** for `src/shared/`. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`SHARED_UI_CONVENTIONS.md`](SHARED_UI_CONVENTIONS.md) — primitives, popovers, playback field selects.
2. [`layout/README.md`](layout/README.md) — app shell / workbench starter.
3. **Playback / notation:** [`hooks/PLAYBACK_HOOK_PATTERN.md`](hooks/PLAYBACK_HOOK_PATTERN.md), [`music/PLAYBACK_RENDERING_AUDIT.md`](music/PLAYBACK_RENDERING_AUDIT.md).

## Rules

- **Only cross-app reuse** lives here — apps must not import each other.
- New shared components → document in `SHARED_UI_CONVENTIONS.md` and demo under **`/ui/`** (`src/ui/` catalog).
- Register new consumers in `importBoundaries.test.ts` when adding app-facing APIs.

## Tests worth knowing

- `importBoundaries.test.ts`, `spaGuardrails.test.ts`
- `playbackFieldSelect.test.ts`, `useChartChordPlayback.test.ts`
- Rhythm: `presetIntegrity.test.ts`
