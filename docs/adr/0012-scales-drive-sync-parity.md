# ADR 0012: Learn Your Scales Drive sync parity

## Status

Accepted — conflict-prompt policy partially superseded by [ADR 0020](./0020-silent-union-sync-row-conflicts-only.md): the `prompt_when_both_edited` policy referenced in decision 4 gave way to silent union merge with prompts only for true row-level conflicts. The merge/undo/auto-sync parity decisions stand.

## Context

Learn Your Scales previously used manual replace-only Drive backup with no merge, undo snapshots, or auto-sync. Multi-device use could silently lose practice progress.

## Decision

Mirror Stanza’s Drive safety model for Scales:

1. **Non-destructive merge** (`scalesDriveMerge.ts`) — union exercises by id; keep further stage advancement; union history by timestamp (cap 20).
2. **Undo snapshots** — localStorage ring (20) before pull, restore, merge, manual backup.
3. **Auto pull on session start** and **debounced auto-push** on progress saves (gated until successful pull or manual backup).
4. **Conflict dialog** — only when `STANZA_PORTFOLIO_MERGE_PROMPT_POLICY` (`prompt_when_both_edited`) applies; Gesture/Scales use silent union merge per [`LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md).
5. **`progressUpdatedAt`** on `ScalesProgressData` for merge clocks.
6. **Restore merges** and runs `normalizeScalesProgressPayload` (migrate + reconcile); resets active session UI.

## Update — custom routines (v5)

The Free Practice / My Routines feature adds two synced fields to `ScalesProgressData`
(version bumped 4 → 5), extending — not changing — the model above:

- **`customRoutines`** — user-defined practice routines, merged by `id` with
  last-writer-wins on `updatedAt` (`mergeCustomRoutinesWithTombstones`), reusing the
  Encore `SavedSearch` shape.
- **`deletedRoutineIds`** — deletion tombstones (id → ISO time) so a delete on one
  device is not resurrected by a remote that still lists the routine; a re-creation
  with a newer `updatedAt` beats a stale tombstone (per the silent-union + tombstone
  model of [ADR 0020](./0020-silent-union-sync-row-conflicts-only.md) and the
  drive-data-loss rule). Covered by `scalesDriveMerge.test.ts`.
- **`lastFreePracticeParams`** — device-local scratch (last picker selection), **stripped
  from the synced envelope** and carried through merges from the local side only.

## Links

- [`src/scales/hooks/useScalesDriveBackup.ts`](../../src/scales/hooks/useScalesDriveBackup.ts)
- [`src/scales/drive/scalesDriveMerge.ts`](../../src/scales/drive/scalesDriveMerge.ts)
- See [`docs/adr/0006-stanza-drive-backup-merge-and-restore.md`](./0006-stanza-drive-backup-merge-and-restore.md)
