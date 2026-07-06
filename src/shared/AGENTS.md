# Shared library — agent context

Nested **`AGENTS.md`** for `src/shared/`. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`SHARED_UI_CONVENTIONS.md`](SHARED_UI_CONVENTIONS.md) — primitives, popovers, playback field selects.
2. [`layout/README.md`](layout/README.md) — app shell / workbench starter.
3. **Playback / notation:** [`hooks/PLAYBACK_HOOK_PATTERN.md`](hooks/PLAYBACK_HOOK_PATTERN.md), [`music/PLAYBACK_RENDERING_AUDIT.md`](music/PLAYBACK_RENDERING_AUDIT.md), [`audio/platform/README.md`](audio/platform/README.md), [`../../docs/SHARED_AUDIO_PLATFORM.md`](../../docs/SHARED_AUDIO_PLATFORM.md).
4. **Drive backup / local-first sync:** [`../../docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) (§ Portfolio merge prompt policy, § Long-running jobs), [`SHARED_UI_CONVENTIONS.md`](SHARED_UI_CONVENTIONS.md) § Drive, skill `labs-drive-backup`. Shared code: `drive/` (`labsDriveBackupTypes.ts` policy + assessor, auto-sync hook), `google/` (account menu, OAuth), `jobs/` (`LabsBlockingJobContext.tsx` snackbar for bulk work).
5. **Dexie live queries:** [`dexie/resolveDexieLiveQuery.ts`](dexie/resolveDexieLiveQuery.ts) — distinguish loading (`undefined`) from empty; rule `.cursor/rules/dexie-live-query-empty-states.mdc`.

## Rules

- **Only cross-app reuse** lives here — apps must not import each other.
- New shared components → document in `SHARED_UI_CONVENTIONS.md` and demo under **`/ui/`** (`src/ui/` catalog).
- **Download filenames:** use [`utils/labsDownloadFileName.ts`](utils/labsDownloadFileName.ts) (`buildLabsDownloadFileName`) for every user-facing export — readable `Title - Kind.ext` stems, not app ids or raw notation slugs. Print/PDF chord charts: `buildChartPrintExportOptions` / `buildChordChartDownloadFileName`.

## Tests worth knowing

- `importBoundaries.test.ts`, `spaGuardrails.test.ts`
- `playbackFieldSelect.test.ts`, `useChartChordPlayback.test.ts`
- Rhythm: `presetIntegrity.test.ts`
