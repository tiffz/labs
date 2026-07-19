# Local-first sync (Google Drive)

How Labs apps keep a local working copy and back up to Drive. Solo bar: this doc + linked ADRs.

| Need                                      | Doc                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| OAuth paths, merge policies, entry points | [`SYNC_AND_AUTH_MAP.md`](SYNC_AND_AUTH_MAP.md)                             |
| P0 data-loss checklist + guard parity     | [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) |
| Skill                                     | `labs-drive-backup`                                                        |

## Apps with Drive sync

| App          | Model                                           | Drive location                                             | Local store         | Signed-out / local-only         |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------- | ------------------- | ------------------------------- |
| **Encore**   | Continuous bidirectional repertoire + Originals | `Encore_App/`                                              | Dexie (`encoreDb`)  | Yes (Continue without Google)   |
| **Stanza**   | Auto pull/push portfolio backup                 | `Tiff Zhang Labs/Stanza/progress.json` + audio sidecars    | Dexie (`stanzaDb`)  | Yes                             |
| **Scales**   | Same as Stanza                                  | `Tiff Zhang Labs/LearnYourScales/progress.json`            | Progress reducer    | Yes                             |
| **Gesture**  | **Drive-first** packs + portfolio backup        | `Tiff Zhang Labs/Gesture/progress.json` + packs            | Dexie (`gestureDb`) | Partial — new packs need Google |
| **Zine Box** | Portfolio + PDF sidecars                        | `Tiff Zhang Labs/ZineBox/progress.json` + `comics/`        | Dexie (`zineboxDb`) | Yes                             |
| **Lyrefly**  | Portfolio + full project packages               | `Tiff Zhang Labs/Lyrefly/progress.json` + `projects/{id}/` | Dexie               | Yes                             |

Encore also uses Drive for uploads, picker, public snapshot, and guest reads — see [`src/encore/README.md`](../src/encore/README.md). App-specific package/merge details live in each app’s Drive modules and README (do not restate here).

**Graceful degradation:** Portfolio apps stay usable with sync off. Gesture empty states should say Google is required for new collections until local-blob packs ship.

## Principles (short)

1. **Local-first** — Dexie / reducer is the working copy; offline without Google.
2. **Background by default** — session auto-pull, periodic re-pull (5 min visible), debounced auto-push (~3 s); no toast spam. Failures back off exponentially (30 s → 15 min); the "needs push" flag persists in localStorage so edits made just before a tab dies still push next session.
3. **Data-loss guards** — empty/sparse device must not clobber rich cloud; undo before destructive merges; tombstones for deletes. Details: [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) + ADR [0019](adr/0019-encore-non-destructive-sync-merge.md) / [0020](adr/0020-silent-union-sync-row-conflicts-only.md).
4. **Silent merge by default** — portfolio apps: `silent_union`; prompt only for true `needsReview` rows.
5. **No silent OAuth refresh** — ADR 0010/0011; optional BFF refresh ADR 0014.

## Divergence vs conflict

| Signal                            | Meaning                                                                       | User action                                          |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Divergence**                    | Cloud newer and/or local edits                                                | **Auto-merge** (union + non-destructive field merge) |
| **True conflict** (`needsReview`) | Same entity edited both sides **and** auto-merge would drop non-empty content | Per-row Keep device / Use Drive                      |

Analysis: [`labsPortfolioConflictAnalysis.ts`](../src/shared/drive/labsPortfolioConflictAnalysis.ts). Policy type: [`LabsPortfolioMergePromptPolicy`](../src/shared/drive/labsDriveBackupTypes.ts) — default `silent_union` (`LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT`). **Deprecated:** `prompt_when_both_edited`.

**Manual backup:** undo snapshot → `pullFromDriveAndMerge({ silent: true })` → `flushDriveWrite()`. Restore → **Undo last sync** rolls back a bad merge.

## Binary uploads (resumable)

Large media → [`driveUploadFileResumable`](../src/shared/drive/driveFetch.ts) / [`uploadDriveFileResumableChunked`](../src/shared/drive/driveResumableUpload.ts).

1. **Chunk PUTs use XHR, not `fetch`.** Drive returns HTTP **308**; browser `fetch` mishandles it (`drive-resumable-308`).
2. **Resume after suspend** — wait until visible, query session status, continue from Drive cursor.
3. **Progress + wake lock** — pass `onProgress` into the blocking job.

If Drive fails in a normal Chrome profile but works in Incognito, treat as extension/profile interference before blaming quota.

## Shared modules

| Module                                                                                     | Role                                                      |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [`driveFetch.ts`](../src/shared/drive/driveFetch.ts)                                       | Drive v3 client                                           |
| [`labsDrivePortfolioLayout.ts`](../src/shared/drive/labsDrivePortfolioLayout.ts)           | `Tiff Zhang Labs/{App}/progress.json`                     |
| [`labsDriveBackupTypes.ts`](../src/shared/drive/labsDriveBackupTypes.ts)                   | Conflict assessment                                       |
| [`labsDriveSyncGuard.ts`](../src/shared/drive/labsDriveSyncGuard.ts)                       | Block auto-push until pull/manual backup                  |
| [`labsDriveSyncLock.ts`](../src/shared/drive/labsDriveSyncLock.ts)                         | Web Lock — one tab syncs at a time per app                |
| [`useLabsDrivePortfolioAutoSync.ts`](../src/shared/drive/useLabsDrivePortfolioAutoSync.ts) | Auto-pull + debounced push, backoff, persisted needs-push |
| [`LabsBlockingJobContext.tsx`](../src/shared/jobs/LabsBlockingJobContext.tsx)              | Sticky snackbar + `beforeunload` for long jobs            |
| [`LabsDriveAccountMenu.tsx`](../src/shared/google/LabsDriveAccountMenu.tsx)                | Account menu + restore + conflict shell                   |

App-local code owns envelope schema, merge, tombstones, and progress subscriptions.

## Union merge + tombstones

Silent union by stable id resurrects removals unless merge **filters tombstones first**.

| Removal                                         | Envelope field                             | Merge                                                        |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Delete entity                                   | `deletedIds` / file tombstones             | Skip tombstoned ids when unioning                            |
| Remove from collection (e.g. Zine stack unlink) | membership tombstones (`stackId::comicId`) | Filter membership lists — do **not** re-union remote members |

**When adding delete / “remove from group” UX:** (1) record tombstone on action, (2) honor in merge before union, (3) regression test local removal vs remote still listing the row, (4) toast **adds/updates only** — not overlap “merged N” counts.

## Long-running jobs

Canonical: [`LabsBlockingJobContext.tsx`](../src/shared/jobs/LabsBlockingJobContext.tsx). Wrap user-launched work that writes Dexie/Drive and lasts > ~1 s with `withBlockingJob`. Debounced auto-push / session auto-pull → `{ silent: true }`. One sticky snackbar; do not dim the whole page. **New app:** copy Encore/Gesture wiring — provider at root, stock snackbar, wrap bulk ops. Do not fork app-local progress chrome.

## Adopting Drive in a new portfolio app

Mirror Stanza (blobs) or Scales (metadata-only). Prefer `createLabsPortfolioDriveBackup(config)` (see Zine Box).

| Layer     | Shared                                               | App-local                      |
| --------- | ---------------------------------------------------- | ------------------------------ |
| Layout    | `labsDrivePortfolioLayout.ts` — add folder constant  | —                              |
| Lifecycle | auto-sync, sync guard, backup types                  | `use*DriveBackup.ts`           |
| UI        | `LabsDriveAccountMenu` + restore/conflict dialogs    | Thin `*AccountMenu`            |
| Jobs      | `LabsBlockingJobProvider` when uploads/imports exist | `withBlockingJob` on user jobs |
| OAuth     | `ensureLabsGoogleAccessTokenForDrive()`              | Scope wrapper if needed        |

**App-local modules:** `*DriveEnvelope`, `*DriveMerge` (+ tests), `*DriveConflict` (`silent_union`), `*DriveSyncMeta`, `*LocalData`, optional sidecar sync. Call `notify*LocalChange({ immediate: true })` on bulk import so auto-push is not swallowed by priming skip.

**Wiring checklist**

- [ ] Backup provider / account menu at root
- [ ] `useLabsDrivePortfolioAutoSync({ enabled: … })`
- [ ] Manual backup: snapshot → silent pull/merge → `flushDriveWrite` (sidecars before envelope; **412 etag retry**)
- [ ] Treat `isLabsDrivePortfolioProgressPlaceholder()` as “no backup yet”
- [ ] Document in app README § Google; add row to `labs-drive-backup` skill table
- [ ] Update this apps table + [`SYNC_AND_AUTH_MAP.md`](SYNC_AND_AUTH_MAP.md)

## Loopback origins

`http://127.0.0.1:5173` and `http://localhost:5173` are different origins (separate IndexedDB/session). Prefer `127.0.0.1` for local Labs. Drive sync bridges the two if you must switch.

## Related ADRs

[0006](adr/0006-stanza-drive-backup-merge-and-restore.md) · [0007 revision](adr/0007-revision-stanza-encore-federated-sync.md) · [0010](adr/0010-encore-no-background-google-refresh.md) / [0011](adr/0011-labs-stanza-scales-no-background-google-refresh.md) · [0012 Scales](adr/0012-scales-drive-sync-parity.md) · [0014](adr/0014-google-oauth-session-bff.md) · [0019](adr/0019-encore-non-destructive-sync-merge.md) · [0020](adr/0020-silent-union-sync-row-conflicts-only.md)

OAuth/sync contract changes → skill `labs-write-adr`. Envelope shape changes → read app merge module + this doc + P0 checklist first.
