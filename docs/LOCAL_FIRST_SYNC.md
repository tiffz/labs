# Local-first sync (Google Drive)

Canonical reference for how Labs micro-apps sync user data with Google Drive. Solo dev: treat this doc + linked ADRs as the product bar for sync UX and data-loss prevention.

## Apps with Drive sync

| App        | Model                                           | Drive location                                         | Local store        |
| ---------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------ |
| **Encore** | Continuous bidirectional repertoire + Originals | `Encore_App/`                                          | Dexie (`encoreDb`) |
| **Stanza** | Auto pull/push portfolio backup                 | `Tiff Zhang Labs/Stanza/progress.json` + `stem_audio/` | Dexie (`stanzaDb`) |
| **Scales** | Same as Stanza                                  | `Tiff Zhang Labs/LearnYourScales/progress.json`        | Progress reducer   |

No other micro-apps use Drive JSON backup today. Encore also uses Drive for uploads, picker, public snapshot, and guest reads — separate from the JSON sync loops below.

## Principles

1. **Local-first** — Dexie / in-memory progress is the working copy. Apps work offline without Google.
2. **Background by default** — Session auto-pull and debounced auto-push; no toast on every success.
3. **Data-loss guards** — Empty devices must not overwrite richer cloud data; undo snapshots before destructive merges; deletions propagate where union-merge would resurrect rows.
4. **Prompt only when judgment is needed** — Silent merge when heuristics are safe; dialogs when overwrite or per-row choices matter.
5. **Shared UX for portfolio apps** — Stanza and Scales use [`LabsDriveAccountMenu`](../src/shared/google/LabsDriveAccountMenu.tsx); Encore uses its own account menu with row-level conflict UI.
6. **No silent OAuth refresh** — ADR 0010/0011; user re-authenticates explicitly when tokens expire.

## Architecture

```mermaid
flowchart TB
  subgraph shared [src/shared]
    DriveFetch[driveFetch.ts]
    ConflictAssess[labsDriveBackupTypes.ts]
    SyncGuard[labsDriveSyncGuard.ts]
    AutoSync[useLabsDrivePortfolioAutoSync.ts]
    DriveUX[LabsDriveAccountMenu]
  end
  subgraph encore [Encore]
    RepertoireSync[repertoireSync.ts]
    EncoreSyncCtx[EncoreSyncContext]
  end
  subgraph portfolio [Stanza / Scales]
    AppHook[use*DriveBackup.ts]
    AppMerge[*DriveMerge.ts]
  end
  DriveFetch --> RepertoireSync
  DriveFetch --> AppHook
  ConflictAssess --> AppHook
  SyncGuard --> AutoSync
  AutoSync --> AppHook
  AppMerge --> AppHook
  DriveUX --> AppHook
  RepertoireSync --> EncoreSyncCtx
```

### Shared layer (`src/shared/drive/` + `src/shared/google/`)

| Module                                                                                             | Role                                                  |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`driveFetch.ts`](../src/shared/drive/driveFetch.ts)                                               | OAuth Drive v3 client                                 |
| [`labsDrivePortfolioLayout.ts`](../src/shared/drive/labsDrivePortfolioLayout.ts)                   | `Tiff Zhang Labs/{App}/progress.json` layout          |
| [`labsDriveBackupTypes.ts`](../src/shared/drive/labsDriveBackupTypes.ts)                           | Conflict assessment (`assessLabsDriveBackupConflict`) |
| [`labsDriveSyncGuard.ts`](../src/shared/drive/labsDriveSyncGuard.ts)                               | Blocks auto-push until pull or manual backup          |
| [`labsDrivePortfolioBackupConstants.ts`](../src/shared/drive/labsDrivePortfolioBackupConstants.ts) | Debounce / interval constants                         |
| [`labsDriveSyncMessages.ts`](../src/shared/drive/labsDriveSyncMessages.ts)                         | Shared sync status copy                               |
| [`useLabsDrivePortfolioAutoSync.ts`](../src/shared/drive/useLabsDrivePortfolioAutoSync.ts)         | Auto-pull once + debounced auto-push effects          |
| [`labsDriveBackupUiTypes.ts`](../src/shared/google/labsDriveBackupUiTypes.ts)                      | UI prop types for restore/conflict dialogs            |
| [`LabsDriveAccountMenu.tsx`](../src/shared/google/LabsDriveAccountMenu.tsx)                        | Account menu + restore + conflict shell               |

App-local code owns envelope schema, merge logic, tombstones (Stanza), and progress subscriptions (Scales).

## Data-loss guards

| Guard                                | Encore                                           | Stanza / Scales                                                            |
| ------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------- |
| Empty device cannot push sparse data | Pull when remote newer; conflict when both dirty | `labsDriveAutoPushAllowed` until pull or manual backup                     |
| Pre-merge undo                       | `encoreDriveUndoSnapshots` (IDB)                 | Stanza IDB ring; Scales localStorage ring                                  |
| Deletion propagation                 | Row delete in repertoire push                    | Stanza tombstones in envelope (`deletedDriveSourceFileIds`)                |
| Simultaneous edits                   | Row-level `bothEdited` dialog                    | Per-song / per-exercise merge heuristics; conflict dialog on manual backup |
| OAuth token expiry                   | Sync error state in account menu                 | `syncPaused` + shared reconnect copy                                       |

## Conflict decision tree

### Portfolio apps (Stanza, Scales)

```mermaid
flowchart TD
  Start[Session start or manual backup]
  AutoPull[Auto-pull on session start]
  SilentMerge[Silent merge into local store]
  ManualBackup[Manual Back up clicked]
  Assess[assessLabsDriveBackupConflict]
  Dialog[LabsDriveConflictDialog]
  Push[Write progress.json to Drive]

  Start --> AutoPull
  AutoPull --> SilentMerge
  SilentMerge --> Push

  ManualBackup --> Assess
  Assess -->|needsPrompt| Dialog
  Assess -->|no prompt| Push
  Dialog -->|Merge and upload| Push
  Dialog -->|Use this device only| Push
  Dialog -->|Cancel| Stop[No write]
```

**Conflict reasons** (any one triggers prompt on manual backup):

- `drive_file_newer_than_seen` — Drive `modifiedTime` > device `lastCloudModifiedTime`
- `remote_export_newer_than_last_backup` — envelope `exportedAt` > device `lastBackupExportedAt`
- `drive_nonempty_first_device` — no prior sync meta but remote has content

Auto-pull **merges silently** when the cloud looks newer but **this device has no local edits since the last backup** (`shouldPromptBeforePortfolioMerge` returns false). If both sides changed, the conflict dialog opens (including on session auto-pull — account menu message points users there).

Manual backup uses the same rule (not merely `assessment.needsPrompt`).

### Encore

When local and remote both changed since last sync:

- **`bothEdited.length === 0`** — silent auto-merge by `updatedAt`; brief snackbar
- **`bothEdited.length > 0`** — [`SyncConflictReviewDialog`](../src/encore/components/SyncConflictReviewDialog.tsx) per row (keep device vs use Drive)

See [`src/encore/ARCHITECTURE.md`](../src/encore/ARCHITECTURE.md) § Sync state machine.

## UX conventions

| Situation       | Expected behavior                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Happy path      | Silent auto-pull/push; “Last backup …” in account menu when known                                                 |
| Token expired   | “Sign in again to sync” / “Drive sync paused …” (see `labsDriveSyncMessages.ts`)                                  |
| Conflict        | Merge primary; replace-only with warning when cloud is richer                                                     |
| Restore         | Drive latest + local undo snapshots ([`LabsDriveRestoreDialog`](../src/shared/google/LabsDriveRestoreDialog.tsx)) |
| Clear site data | Undo snapshots lost; Drive remains recovery path (restore dialog copy)                                            |

## Stanza ↔ Encore data model

**Accepted:** [ADR 0007 revision Option B](adr/0007-revision-stanza-encore-federated-sync.md) — federated sidecar under `Encore_App/stanza_practice_overlay.json`.

Until overlay migration lands:

- Stanza `progress.json` remains the active backup path (ADR 0006).
- Encore uploads dedup scans Stanza `stem_audio/` to avoid duplicating stem bytes ([`labsDrivePortfolioDedupFolders.ts`](../src/shared/drive/labsDrivePortfolioDedupFolders.ts)).
- Overlay schema: [`stanzaPracticeOverlay.ts`](../src/stanza/drive/stanzaPracticeOverlay.ts) (not wired to sync yet).
- Migration checklist: [`stanza-encore-overlay-migration.md`](design-explorations/stanza-encore-overlay-migration.md).

**Uploads:** Stanza direct uploads stay common; Encore should reuse existing Drive files (dedup prompt) rather than upload duplicates. Full Encore↔Stanza upload linking is a follow-up after overlay migration.

**OAuth BFF:** deferred to next PR (ADR 0010/0011 unchanged).

## Known gaps

| Gap                   | Notes                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Dual canonical stores | Stanza `progress.json` vs Encore repertoire until overlay migration (Option B accepted)  |
| Tester gate           | **Removed (GA)** — optional `VITE_LABS_DRIVE_TESTER_HASHES` only for staging restriction |
| Scales tombstones     | Not needed while there is no delete-progress UX; add if reset ships                      |
| Sharded Encore sync   | Opt-in via `VITE_ENCORE_SHARDED_SYNC`; Stanza does not consume shards yet                |
| Multi-tab             | Debounced push only; document one tab per app                                            |
| Clock skew            | Heuristics use ISO string compare, not NTP                                               |

## Related ADRs

- [0006](./adr/0006-stanza-drive-backup-merge-and-restore.md) — Stanza auto-sync, tombstones, undo
- [0007](./adr/0007-encore-owned-practice-resources-stanza-secondary-client.md) — Encore-owned resources (original)
- [0007 revision](./adr/0007-revision-stanza-encore-federated-sync.md) — Federated sidecar (**accepted**)
- [0010](./adr/0010-encore-no-background-google-refresh.md) / [0011](./adr/0011-labs-stanza-scales-no-background-google-refresh.md) — OAuth posture
- [0012 Scales](./adr/0012-scales-drive-sync-parity.md) — Scales parity with Stanza safety model
- [0012 Originals](./adr/0012-encore-originals-local-first-domain.md) — Encore Originals domain

## Agent workflow

- Skill: [`.cursor/skills/labs-drive-backup`](../.cursor/skills/labs-drive-backup/SKILL.md)
- Before changing envelope shape: read app hook + merge module + this doc
- OAuth or sync contract changes → `labs-write-adr` skill
- **`npm run presubmit`** before merge
