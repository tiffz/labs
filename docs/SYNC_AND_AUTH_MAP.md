# Sync and auth map (Labs)

Quick reference for **which apps sync what**, **how OAuth reaches Drive**, and **where merge/conflict UX diverges**.

| Need                          | Doc                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Architecture / adopting Drive | [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md)                                                                                                     |
| P0 data-loss checklist        | [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md)                                                                       |
| OAuth BFF                     | [ADR 0014](adr/0014-google-oauth-session-bff.md)                                                                                                 |
| No silent Google refresh      | [ADR 0010 Encore](adr/0010-encore-no-background-google-refresh.md), [ADR 0011 Labs](adr/0011-labs-stanza-scales-no-background-google-refresh.md) |
| Merge policy                  | [ADR 0019](adr/0019-encore-non-destructive-sync-merge.md), [ADR 0020](adr/0020-silent-union-sync-row-conflicts-only.md)                          |
| Skill                         | `labs-drive-backup`                                                                                                                              |

## Sync families

| Family                | Apps                                       | Local store                     | Cloud artifact                                    | Merge policy                                           | Account UI                                       |
| --------------------- | ------------------------------------------ | ------------------------------- | ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| **Encore repertoire** | Encore                                     | Dexie `encoreDb`                | `Encore_App/repertoire_data.json` + media folders | Row-level review; content-aware merge (ADR 0019)       | Encore account menu + `SyncConflictReviewDialog` |
| **Portfolio backup**  | Stanza, Scales, Gesture, Zine Box, Lyrefly | Dexie or reducer + app envelope | `Tiff Zhang Labs/{App}/progress.json` (+ blobs)   | Silent union; prompt only for `needsReview` (ADR 0020) | `LabsDriveAccountMenu`                           |

Encore also uses Drive for uploads, picker, public snapshots, and guest BFF reads — see [`src/encore/README.md`](../src/encore/README.md) § Browser API key + BFF.

## OAuth and token paths

| Path                                    | When                                                           | Modules                                                                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GIS on user click (`skipBff: true`)** | Portfolio sign-in, scope upgrades, Zine Box folder import      | [`labsGoogleDriveAccess.ts`](../src/shared/google/labsGoogleDriveAccess.ts), [`zineboxGoogleDriveAccess.ts`](../src/zinebox/drive/zineboxGoogleDriveAccess.ts) |
| **Session BFF**                         | Encore signed-in Drive API; guest snapshot proxy in production | [`EncoreAuthContext`](../src/encore/context/EncoreAuthContext.tsx), Worker per ADR 0014                                                                        |
| **Spotify PKCE**                        | Encore reference/backing search (not Drive)                    | [`src/encore/spotify/pkce.ts`](../src/encore/spotify/pkce.ts)                                                                                                  |

**Rules:** (1) No silent OAuth refresh — reconnect copy in account menu. (2) Portfolio auto-push gated until pull or manual backup (`labsDriveSyncGuard`). (3) Zine Box split scopes — see [`src/zinebox/README.md`](../src/zinebox/README.md).

## Per-app sync entry points

| App      | Hook / context                       | Primary modules                                                                |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| Encore   | `EncoreSyncContext`, `useEncoreAuth` | `repertoireSync.ts`, `encoreRepertoireMerge.ts`                                |
| Stanza   | `useStanzaDriveBackup`               | `stanzaDriveMerge.ts`, `stanzaDriveMainMediaSync.ts`, `stanzaDriveStemSync.ts` |
| Scales   | `useScalesDriveBackup`               | Scales merge + progress reducer                                                |
| Gesture  | `useGestureDriveBackup`              | `gestureDriveMerge.ts` (Drive-first packs)                                     |
| Zine Box | `useZineboxDriveBackup`              | `zineboxDriveMerge.ts` + tombstones                                            |
| Lyrefly  | `useLyreflyDriveBackup`              | portfolio envelope + `lyreflyProjectPackageDriveSync.ts`                       |

## Apps without Drive sync

Other micro-apps are local-only or URL-state only. Adding Drive: [`LOCAL_FIRST_SYNC.md`](LOCAL_FIRST_SYNC.md) § Adopting + skill **`labs-drive-backup`**.

## Agent checklist

1. OAuth → confirm GIS vs BFF; never log tokens.
2. Merge → Encore row review vs portfolio union (ADR 0020).
3. Delete/remove → tombstone + merge filter + regression test.
4. Blocking jobs → `LabsBlockingJobContext` only.
5. Before merge/delete/push → [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md).

## Guard parity (summary)

Full matrix: [`DRIVE_SYNC_DATA_LOSS_PREVENTION.md`](DRIVE_SYNC_DATA_LOSS_PREVENTION.md) § Guard parity. All six synced apps have auto-push gate, pre-merge undo, tab-hide flush, and 412 retry. In-app Drive revision recovery: Encore full + portfolio MVP. Gesture packs remain Drive-first for new collections.
