# Scales — agent context

Nested **`AGENTS.md`** for Scales. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — curriculum, grading, file layout.
2. [`PEDAGOGY.md`](PEDAGOGY.md) — teaching principles, subdivision scaffold, advancement gates.
3. [`COPY_STYLE.md`](COPY_STYLE.md) — learner-facing copy.
4. **Shared UI:** [`/ui/`](/ui/) — `BpmInput`, `InputSourcesMenu` adapter pattern in `InputSources.tsx`.
5. **Drive backup:** skill `labs-drive-backup`; hook `hooks/useScalesDriveBackup.ts`.

## Pitfalls

- **Advancement regimen:** [`progress/advancementRegimen.ts`](progress/advancementRegimen.ts) is the single source for perfect-streak vs guided-threshold. Beat-only metronome stages require literal perfection to advance; 90%+ with timing slips is “near”, not qualifying. Do not reuse `getAdvancementCriteria` thresholds for perfect-streak UI or gates.
- **`SessionScreen.tsx`** (~2900 lines) — decomposition in progress; helpers in `sessionScreenHelpers.ts` and leaves under `sessionScreen/`; use skill `labs-component-decomposition`.
- **Store:** `store.tsx` — reducer invariants; run `npm test -- src/scales` after state shape changes.
- **Shared grading:** extend `src/shared/` for MIDI/acoustic pipeline; do not fork from Piano wholesale.

## Tests

- Unit: `npm test -- src/scales`
- Smoke: `/scales/` in `e2e/smoke/app-shells.spec.ts`
- Visual: `e2e/visual/apps.visual.spec.ts` scales desktop/mobile
