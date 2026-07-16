# Sync and auth map (Labs)

Quick reference for **which apps sync what**, **how OAuth reaches Drive**, and **where merge/conflict UX diverges**. Canonical sync mechanics: [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md). ADRs: [0006](adr/0006-google-oauth-client-side.md), [0007](adr/0007-local-first-google-drive-sync.md), [0010](adr/0010-no-silent-oauth-refresh.md), [0014](adr/0014-session-bff-oauth.md), [0019](adr/0019-encore-non-destructive-sync-merge.md).

## Sync families

| Family                | Apps                                       | Local store                     | Cloud artifact                                                              | Merge policy                                                                     | Account UI                                        |
| --------------------- | ------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Encore repertoire** | Encore                                     | Dexie `encoreDb`                | `Encore_App/repertoire_data.json` + media folders                           | Row-level review when same row edited both sides; content-aware merge (ADR 0019) | Encore account menu + `SyncConflictReviewDialog`  |
| **Portfolio backup**  | Stanza, Scales, Gesture, Zine Box, Lyrefly | Dexie or reducer + app envelope | `Tiff Zhang Labs/{App}/progress.json` (+ blobs: stems, comics, pack photos) | See merge prompt policy below                                                    | `LabsDriveAccountMenu` (Encore uses its own menu) |

Encore also uses Drive for **uploads, picker, public snapshots, and guest BFF reads** — separate from the repertoire JSON sync loop. See [`src/encore/README.md`](../src/encore/README.md) § Browser API key + BFF.

## OAuth and token paths

| Path                                    | When                                                                  | Modules                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GIS on user click (`skipBff: true`)** | Default for portfolio sign-in, scope upgrades, Zine Box folder import | [`labsGoogleDriveAccess.ts`](../src/shared/google/labsGoogleDriveAccess.ts), [`zineboxGoogleDriveAccess.ts`](../src/zinebox/drive/zineboxGoogleDriveAccess.ts) |
| **Session BFF**                         | Encore signed-in Drive API, guest snapshot proxy in production        | [`EncoreAuthContext`](../src/encore/context/EncoreAuthContext.tsx), [`publicDriveProxy.ts`](../src/encore/drive/publicDriveProxy.ts), Worker per ADR 0014      |
| **Spotify PKCE**                        | Encore reference/backing search and link paste (not Drive)            | [`src/encore/spotify/pkce.ts`](../src/encore/spotify/pkce.ts)                                                                                                  |

**Rules:**

1. No silent OAuth refresh (ADR 0010/0011) — expired tokens surface reconnect copy in account menu.
2. Portfolio apps block auto-push until first pull or manual backup (`labsDriveSyncGuard`).
3. Zine Box uses **split scopes**: `drive.readonly` for folder import vs `drive.file` for portfolio backup — see [`src/zinebox/README.md`](../src/zinebox/README.md).

## Portfolio merge prompt policy (ADR 0020)

| Policy           | Apps                                       | User sees dialog when…                                         |
| ---------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `silent_union`   | Stanza, Gesture, Scales, Zine Box, Lyrefly | Only when `needsReview.length > 0` (true same-entity conflict) |
| Row-level review | Encore                                     | Same repertoire row edited on device and Drive (content-aware) |

Constants live in each app's `*DriveConflict.ts` → [`LabsPortfolioMergePromptPolicy`](../src/shared/drive/labsDriveBackupTypes.ts). Analysis: [`labsPortfolioConflictAnalysis.ts`](../src/shared/drive/labsPortfolioConflictAnalysis.ts).

## Per-app sync entry points

| App      | Hook / context                       | Envelope / sync module                                                                                                                                                                                                     |
| -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encore   | `EncoreSyncContext`, `useEncoreAuth` | [`repertoireSync.ts`](../src/encore/drive/repertoireSync.ts), [`encoreRepertoireMerge.ts`](../src/encore/drive/encoreRepertoireMerge.ts)                                                                                   |
| Stanza   | `useStanzaDriveBackup`               | [`stanzaDriveMerge.ts`](../src/stanza/drive/stanzaDriveMerge.ts), [`stanzaDriveMainMediaSync.ts`](../src/stanza/drive/stanzaDriveMainMediaSync.ts), [`stanzaDriveStemSync.ts`](../src/stanza/drive/stanzaDriveStemSync.ts) |
| Scales   | `useScalesDriveBackup`               | Scales merge + progress reducer                                                                                                                                                                                            |
| Gesture  | `useGestureDriveBackup`              | [`gestureDriveMerge.ts`](../src/gesture/drive/gestureDriveMerge.ts) — **Drive-first** pack upload (not local-first library CRUD)                                                                                           |
| Zine Box | `useZineboxDriveBackup`              | [`zineboxDriveMerge.ts`](../src/zinebox/drive/zineboxDriveMerge.ts), tombstones for comics + stack membership                                                                                                              |
| Lyrefly  | `useLyreflyDriveBackup`              | Lyrefly portfolio envelope via `createLabsPortfolioDriveBackup`                                                                                                                                                            |

## Apps without Drive sync today

All other micro-apps (Drums, Chords, Words, Piano, Sight, Muscle, Cats, etc.) are **local-only** or use URL state only — no `progress.json` backup loop. Adding Drive to a new app: start with [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) § Adopting in a new app and skill **`labs-drive-backup`**.

## Agent checklist

1. **Touching OAuth?** Confirm GIS vs BFF path; never log tokens.
2. **Touching merge?** Match app family (Encore row review vs portfolio union).
3. **Touching delete/remove?** Add tombstone + merge filter + regression test (see LOCAL_FIRST_SYNC § Union merge).
4. **Touching blocking jobs?** Use shared `LabsBlockingJobContext` — one snackbar per shell.
5. **Touching merge/delete/push?** Read [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) + rule `portfolio-drive-data-loss.mdc`.

## Data-loss guard parity

| Guard                            | Encore   | Stanza | Scales | Gesture | Zine Box | Lyrefly |
| -------------------------------- | -------- | ------ | ------ | ------- | -------- | ------- |
| Auto-push gated until pull       | ✅       | ✅     | ✅     | ✅      | ✅       | ✅      |
| Pre-merge undo snapshot          | ✅       | ✅     | ✅     | ✅      | ✅       | ✅      |
| Tab-close debounced push flush   | ✅       | ✅     | ✅     | ✅      | ✅       | ✅      |
| 412 etag retry on push           | ✅       | ✅     | ✅     | ✅†     | ✅       | ✅      |
| In-app Drive revision recovery   | ✅       | ❌     | ❌     | ❌      | ❌       | ❌      |
| Delete tombstones + merge filter | partial‡ | ✅     | n/a    | ✅      | ✅       | ✅      |
| Core CRUD without Google         | ✅       | ✅     | ✅     | ❌      | ✅       | ✅      |

† Gesture portfolio hook retries 412; refresh `DRIVE_SYNC_DATA_LOSS_PREVENTION.md` if the matrix still shows ❌.
‡ Encore exercise-run deletes can resurrect on merge — see [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md).
