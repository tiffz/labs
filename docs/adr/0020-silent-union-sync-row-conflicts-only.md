# ADR 0020: Silent union sync — prompt only for true row-level conflicts

## Status

Accepted (July 2026)

## Context

Labs portfolio apps (Stanza, Scales, Gesture, Zine Box) and Encore sync user data to Google Drive.
Users expect Dropbox-like behavior: background merge, no modals for routine divergence.

Historically, **cloud divergence** (Drive file newer than last seen) was treated as a **user conflict**.
Stanza used `prompt_when_both_edited`: any time the cloud moved and the local library also changed
since the last backup, [`LabsDriveConflictDialog`](../../src/shared/google/LabsDriveConflictDialog.tsx)
asked the user to **Merge and upload**, **Use this device only**, or **Cancel** — without a per-row
diff. That is:

1. **Obtrusive** — minor updates on another device trigger a blocking modal.
2. **Scary** — "Use this device only" can overwrite Drive; users lack enough information to choose.
3. **Inconsistent** — Gesture, Scales, and Zine Box already use `silent_union`; Encore already
   auto-merges when no row is `bothEdited` and shows [`SyncConflictReviewDialog`](../../src/encore/components/SyncConflictReviewDialog.tsx)
   only for overlapping rows.

ADR [0006](0006-stanza-drive-backup-merge-and-restore.md) documented Stanza's coarse conflict prompt.
ADR [0019](0019-encore-non-destructive-sync-merge.md) established non-destructive, content-aware merge
for Encore. This ADR unifies the **prompt policy** across all Drive-synced apps.

## Decision

**Divergence is not conflict. Auto-merge by default. Prompt only when the same stable entity was
edited on both sides since the last sync baseline and auto-merge would drop non-empty content.**

1. **Silent union is the only portfolio policy.** Deprecate `prompt_when_both_edited`. All portfolio
   apps (including Stanza) use `silent_union`: auto-pull and manual backup merge remote into local
   and push without a coarse dialog.

2. **True conflict = row-level `needsReview`.** Shared analysis
   ([`labsPortfolioConflictAnalysis.ts`](../../src/shared/drive/labsPortfolioConflictAnalysis.ts))
   classifies entities as `localOnly`, `remoteOnly`, `bothEdited` (auto-resolvable), or
   `needsReview`. Block the user only when `needsReview.length > 0`.

3. **Review UI is per-row and content-aware.** Shared
   [`LabsPortfolioConflictReviewDialog`](../../src/shared/google/LabsPortfolioConflictReviewDialog.tsx)
   lists only conflicting rows with stakes summaries (counts, timestamps). Choices are **Keep this
   device** / **Use Drive** per row, then **Apply choices and sync**. Never a bare "Use Drive" for
   the whole library on the default path.

4. **Replace-entire-library is not everyday sync.** Demote "Use this device only" / overwrite Drive
   to Restore → Advanced with explicit confirmation.

5. **Safety nets remain mandatory:** pre-merge undo snapshots, Undo last sync, blocking jobs during
   bulk work, auto-push gated until pull, tombstones for deletions, non-destructive field merge
   (filled beats empty — ADR 0019 principles).

6. **Encore keeps its content-aware sub-entity merge** (ADR 0019) and may share analysis types /
   dialog shell; portfolio apps implement app-specific dry-run detectors (e.g. Stanza markers).

### Pull flow (all portfolio apps)

```text
Fetch remote envelope
  → analyzeConflict(local, remote, syncMeta)
  → if needsReview empty: mergePayload + optional snackbar + allow auto-push
  → else: open LabsPortfolioConflictReviewDialog
       → on apply: merge with per-row choices + push
```

`assessLabsDriveBackupConflict` remains for **diagnostics and copy only** (divergence reasons).
It must not gate the user by itself.

## Consequences

- **Positive:** Routine multi-device use feels like Dropbox. Users are not asked to judge merges they
  cannot see. Stanza matches Gesture/Scales/Zine Box.
- **Positive:** When a true conflict appears, the UI shows what is at stake per row.
- **Trade-off:** False negatives (silent loss) are mitigated by non-destructive merge, dry-run
  detectors, and undo snapshots — characterization tests are required before removing any prompt.
- **Trade-off:** False positives (too many review dialogs) are tuned per app; Stanza's richer
  metadata merge should keep dialogs rare.
- **Supersedes ADR 0006 conflict UX only** — auto-pull/push, tombstones, and undo snapshots in
  ADR 0006 remain in force.

## Alternatives considered

- **Keep Stanza's coarse dialog** — rejected; users report it as scary and uninformative.
- **Always prompt on first device** (`drive_nonempty_first_device`) — rejected; silent union + undo
  is safer and less interruptive for a solo multi-browser workflow.
- **CRDT / operational transform** — out of scope for static-hosted Dexie + JSON envelopes.

## Links

- [`docs/LOCAL_FIRST_SYNC.md`](../LOCAL_FIRST_SYNC.md) — architecture, divergence vs conflict
- [`docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](../DRIVE_SYNC_DATA_LOSS_PREVENTION.md) — guard matrix
- [ADR 0006](0006-stanza-drive-backup-merge-and-restore.md) — Stanza backup (conflict UX superseded)
- [ADR 0019](0019-encore-non-destructive-sync-merge.md) — Encore content-aware merge
- [`src/shared/drive/labsPortfolioConflictAnalysis.ts`](../../src/shared/drive/labsPortfolioConflictAnalysis.ts)
- [`src/shared/google/LabsPortfolioConflictReviewDialog.tsx`](../../src/shared/google/LabsPortfolioConflictReviewDialog.tsx)
