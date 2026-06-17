# Local-first sync (Google Drive)

Canonical reference for how Labs micro-apps sync user data with Google Drive. Solo dev: treat this doc + linked ADRs as the product bar for sync UX and data-loss prevention.

## Apps with Drive sync

| App         | Model                                           | Drive location                                         | Local store         |
| ----------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------- |
| **Encore**  | Continuous bidirectional repertoire + Originals | `Encore_App/`                                          | Dexie (`encoreDb`)  |
| **Stanza**  | Auto pull/push portfolio backup                 | `Tiff Zhang Labs/Stanza/progress.json` + `stem_audio/` | Dexie (`stanzaDb`)  |
| **Scales**  | Same as Stanza                                  | `Tiff Zhang Labs/LearnYourScales/progress.json`        | Progress reducer    |
| **Gesture** | Portfolio backup (packs + draw history)         | `Tiff Zhang Labs/Gesture/progress.json`                | Dexie (`gestureDb`) |

No other micro-apps use Drive JSON backup today. Encore also uses Drive for uploads, picker, public snapshot, and guest reads — separate from the JSON sync loops below.

## Principles

1. **Local-first** — Dexie / in-memory progress is the working copy. Apps work offline without Google.
2. **Background by default** — Session auto-pull, **periodic re-pull while the tab is visible** (every 5 min), debounced auto-push (3 s); no toast on every success.
3. **Data-loss guards** — Empty devices must not overwrite richer cloud data; undo snapshots before destructive merges; deletions propagate where union-merge would resurrect rows.
4. **Silent merge by default** — Portfolio apps use **`silent_union`** unless merge heuristics can hide meaningful differences (see [Portfolio merge prompt policy](#portfolio-merge-prompt-policy)). Prompt only when user judgment is required; Encore uses row-level review for true simultaneous edits.
5. **Shared UX for portfolio apps** — Stanza, Scales, and Gesture use [`LabsDriveAccountMenu`](../src/shared/google/LabsDriveAccountMenu.tsx); Encore uses its own account menu with row-level conflict UI.
6. **No silent OAuth refresh** — ADR 0010/0011; user re-authenticates explicitly when tokens expire (optional BFF refresh per ADR 0014).

## Portfolio merge prompt policy

Shared type: [`LabsPortfolioMergePromptPolicy`](../src/shared/drive/labsDriveBackupTypes.ts). Each app exports a constant in `*DriveConflict.ts` and calls `shouldPromptPortfolioMerge({ policy, assessment, localChangedSinceLastBackup })`.

| Policy                             | When to use                                                                                                                                                     | Apps today                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **`silent_union`** (default)       | Union merge cannot drop local edits; undo snapshots + Restore are the escape hatch. Auto-pull and manual backup **merge then upload** with no dialog.           | **Gesture**, **Scales**                              |
| **`prompt_when_both_edited`**      | Cloud diverged **and** local changed since last backup → show [`LabsDriveConflictDialog`](../src/shared/google/LabsDriveConflictDialog.tsx) before pull/backup. | **Stanza** (section markers / richer per-song merge) |
| **Row-level review** (Encore only) | Local and remote both changed the **same** repertoire row → per-row keep device vs Drive.                                                                       | **Encore**                                           |

**Default for new portfolio apps:** set `LABS_PORTFOLIO_MERGE_PROMPT_POLICY_DEFAULT` (`silent_union`). Diverge only with a one-line comment in `*DriveConflict.ts` explaining why union merge is insufficient.

**Assessment vs prompt:** `assessLabsDriveBackupConflict` still records _divergence_ (`drive_file_newer_than_seen`, etc.) for diagnostics and copy. Prompt policy decides whether divergence blocks the user.

**Manual backup pattern (`silent_union` apps):**

1. Undo snapshot (`manual-backup`)
2. `pullFromDriveAndMerge({ silent: true })` — merge remote into local
3. `flushDriveWrite()` — upload merged envelope

**Undo:** Restore → **Undo last sync** (pre-pull snapshot) rolls back a bad merge without needing the conflict dialog.

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
| [`LabsBlockingJobContext.tsx`](../src/shared/jobs/LabsBlockingJobContext.tsx)                      | Sticky snackbar + `beforeunload` for long jobs        |
| [`labsDriveBackupUiTypes.ts`](../src/shared/google/labsDriveBackupUiTypes.ts)                      | UI prop types for restore/conflict dialogs            |
| [`LabsDriveAccountMenu.tsx`](../src/shared/google/LabsDriveAccountMenu.tsx)                        | Account menu + restore + conflict shell               |

App-local code owns envelope schema, merge logic, tombstones (Stanza), and progress subscriptions (Scales).

## Data-loss guards

| Guard                                | Encore                                           | Stanza / Scales / Gesture                                            |
| ------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------------- |
| Empty device cannot push sparse data | Pull when remote newer; conflict when both dirty | `labsDriveAutoPushAllowed` until pull or manual backup               |
| Pre-merge undo                       | `encoreDriveUndoSnapshots` (IDB)                 | Stanza IDB ring; Scales localStorage ring; Gesture localStorage ring |
| Deletion propagation                 | Row delete in repertoire push                    | Stanza/Gesture tombstones in envelope                                |
| Simultaneous edits                   | Row-level `bothEdited` dialog                    | Stanza: merge prompt; Scales/Gesture: silent union merge             |
| OAuth token expiry                   | Sync error state in account menu                 | `syncPaused` + shared reconnect copy                                 |

## Conflict decision tree

### Portfolio apps (Stanza, Scales, Gesture)

```mermaid
flowchart TD
  Start[Session start or manual backup]
  AutoPull[Auto-pull / pullFromDriveAndMerge]
  Policy{App merge prompt policy}
  SilentMerge[Merge remote into local + undo snapshot]
  Dialog[LabsDriveConflictDialog]
  Push[Write progress.json to Drive]

  Start --> AutoPull
  AutoPull --> Policy
  Policy -->|silent_union| SilentMerge
  Policy -->|prompt_when_both_edited + both sides changed| Dialog
  Policy -->|prompt_when_both_edited + local unchanged| SilentMerge
  SilentMerge --> Push
  Dialog -->|Merge and upload| Push
  Dialog -->|Use this device only| Push
  Dialog -->|Cancel| Stop[No write]
```

**Conflict reasons** (recorded by `assessLabsDriveBackupConflict`; prompt only when policy + local-changed say so):

- `drive_file_newer_than_seen` — Drive `modifiedTime` > device `lastCloudModifiedTime`
- `remote_export_newer_than_last_backup` — envelope `exportedAt` > device `lastBackupExportedAt`
- `drive_nonempty_first_device` — no prior sync meta but remote has content

**`silent_union` (Gesture, Scales):** auto-pull and manual backup always merge silently when remote exists, then push when appropriate. No blocking dialog.

**`prompt_when_both_edited` (Stanza):** auto-pull merges silently when local unchanged since last backup; otherwise opens the conflict dialog (including blocking auto-pull with an account-menu hint).

### Encore

When local and remote both changed since last sync:

- **`bothEdited.length === 0`** — silent auto-merge by `updatedAt`; brief snackbar
- **`bothEdited.length > 0`** — [`SyncConflictReviewDialog`](../src/encore/components/SyncConflictReviewDialog.tsx) per row (keep device vs use Drive)

See [`src/encore/ARCHITECTURE.md`](../src/encore/ARCHITECTURE.md) § Sync state machine.

## UX conventions

| Situation       | Expected behavior                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Happy path      | Silent auto-pull/push; periodic re-pull every 5 min while tab visible; “Last backup …” in account menu when known |
| Token expired   | “Sign in again to sync” / “Drive sync paused …” (see `labsDriveSyncMessages.ts`)                                  |
| Cloud diverged  | **`silent_union`:** merge in background; optional account-menu note. **Stanza:** dialog when both sides edited.   |
| Restore         | Drive latest + local undo snapshots ([`LabsDriveRestoreDialog`](../src/shared/google/LabsDriveRestoreDialog.tsx)) |
| Clear site data | Undo snapshots lost; Drive remains recovery path (restore dialog copy)                                            |

## Long-running jobs (portfolio + Encore)

**Canonical module:** [`LabsBlockingJobContext.tsx`](../src/shared/jobs/LabsBlockingJobContext.tsx) — bottom snackbar with indeterminate/determinate progress, `role="status"`, and a “keep this tab open” caption. **`beforeunload` is armed only while at least one non-silent job is running.**

| App                 | Provider                                                                                        | Hook                      |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------- |
| **Encore**          | `EncoreBlockingJobProvider` (wraps shared; Encore-specific caption)                             | `useEncoreBlockingJobs()` |
| **Gesture**         | `LabsBlockingJobProvider` in `App.tsx`                                                          | `useLabsBlockingJobs()`   |
| **Stanza / Scales** | Adopt shared provider when adding user-visible bulk work (today: account-menu sync status only) | `useLabsBlockingJobs()`   |

### When to wrap work

| Wrap with **`withBlockingJob(label, fn)`** (loud)                  | Use **`{ silent: true }`** or no job                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| User launched; **> ~1 s**; writes Dexie or Drive                   | Debounced auto-push, session auto-pull, background re-index                         |
| Uploads, imports, merge/delete/organize, refresh index, bulk edits | Quick local toggles, typing, navigation                                             |
| Anything the user should not navigate away from mid-flight         | Pair `{ silent: true }` with account-menu / `syncState` copy when work is invisible |

### UX rules (all Drive-synced apps)

1. **One sticky snackbar** per app shell — do not add a second full-width progress bar in tab content for the same job.
2. **Do not dim the whole page** for background work — disable only the control that was pressed (or block conflicting actions, e.g. uploads).
3. **Update the snackbar label** as phases change (`startBlockingJob` → `updateLabel` / `updateProgress`).
4. **Dialogs** may show a short status line; **progress bar lives in the snackbar**, not duplicated in the dialog body.
5. **Completion toasts** — optional success/error banner at top (`GestureStatusBanner`, Encore snackbar) after the blocking job ends; the blocking snackbar clears in `finally`.

### Adopting in a new app (do not fork)

When a micro-app needs long-running job UX, **copy Encore’s wiring first** — do not invent app-local snackbars, docked bars, or theme-specific progress UI.

1. **Provider at app root** — wrap the shell in `LabsBlockingJobProvider` (or a thin re-export like `EncoreBlockingJobProvider`) so hooks such as `useGestureDriveBackup` can call `withBlockingJob`.
2. **Default shared chrome** — use the stock snackbar from `LabsBlockingJobContext` + `labsBlockingJob.css`. Theme tokens (`background.paper`, `primary`, `shape.borderRadius`) adapt per app automatically.
3. **Wrap every user-launched job** — scan, organize, backup, refresh, upload, merge, delete. Inline button spinners and account-menu “busy” copy are not a substitute; disable the control and let the snackbar carry progress.
4. **Only customize after shipping** — `snackbarBottom`, `unloadCaption`, or shared-module polish when Encore and Gesture both need it. **Do not** add app CSS overrides (e.g. full-width Linen dock) unless the user explicitly rejects the shared look.
5. **Reference** — Encore: [`EncoreBlockingJobContext.tsx`](../src/encore/context/EncoreBlockingJobContext.tsx), [`EncoreActionsContext.tsx`](../src/encore/context/EncoreActionsContext.tsx) (`reorganizeDriveUploads`). Gesture: [`App.tsx`](../src/gesture/App.tsx), [`GestureAccountMenu.tsx`](../src/gesture/components/GestureAccountMenu.tsx).

**Tests:** [`LabsBlockingJobContext.test.tsx`](../src/shared/jobs/LabsBlockingJobContext.test.tsx), Encore re-exports in [`EncoreBlockingJobContext.test.tsx`](../src/encore/context/EncoreBlockingJobContext.test.tsx).

## Stanza ↔ Encore data model

**Accepted:** [ADR 0007 revision Option B](adr/0007-revision-stanza-encore-federated-sync.md) — federated sidecar under `Encore_App/stanza_practice_overlay.json`.

Until overlay migration lands:

- Stanza `progress.json` remains the active backup path (ADR 0006).
- Encore uploads dedup scans Stanza `stem_audio/` to avoid duplicating stem bytes ([`labsDrivePortfolioDedupFolders.ts`](../src/shared/drive/labsDrivePortfolioDedupFolders.ts)).
- Overlay schema: [`stanzaPracticeOverlay.ts`](../src/stanza/drive/stanzaPracticeOverlay.ts) (not wired to sync yet).
- Migration checklist: [`stanza-encore-overlay-migration.md`](design-explorations/stanza-encore-overlay-migration.md).

**Uploads:** Stanza direct uploads stay common; Encore should reuse existing Drive files (dedup prompt) rather than upload duplicates. Full Encore↔Stanza upload linking is a follow-up after overlay migration.

**OAuth BFF:** [ADR 0014](./adr/0014-google-oauth-session-bff.md) — optional Cloudflare Worker when `VITE_LABS_SESSION_BFF_URL` is set. GIS silent refresh stays off (ADR 0010/0011); BFF refresh uses HTTPS only.

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
- [0010](./adr/0010-encore-no-background-google-refresh.md) / [0011](./adr/0011-labs-stanza-scales-no-background-google-refresh.md) — OAuth posture (no GIS silent refresh)
- [0014](./adr/0014-google-oauth-session-bff.md) — optional Google session BFF (Cloudflare Workers)
- [0012 Scales](./adr/0012-scales-drive-sync-parity.md) — Scales parity with Stanza safety model
- [0012 Originals](./adr/0012-encore-originals-local-first-domain.md) — Encore Originals domain

## Agent workflow

- Skill: [`.cursor/skills/labs-drive-backup`](../.cursor/skills/labs-drive-backup/SKILL.md)
- Before changing envelope shape: read app hook + merge module + this doc
- OAuth or sync contract changes → `labs-write-adr` skill
- **`npm run presubmit`** before merge
