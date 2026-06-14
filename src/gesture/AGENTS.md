# The Gesture Room — agent context

Nested **`AGENTS.md`** for Gesture. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product scope, Drive layout, env.
2. [`COPY_STYLE.md`](COPY_STYLE.md) — user-facing copy.
3. **Drive sync:** [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — portfolio `progress.json` pattern via `useGestureDriveBackup`.
4. **Upload UX:** [`UPLOAD_UX.md`](UPLOAD_UX.md) — phased feedback, manifest resume, duplicate skip.
5. **Design:** [`DESIGN.md`](DESIGN.md) — Linen tokens; rule `.cursor/rules/gesture-linen-design.mdc`.

## Architecture

- **Local:** Dexie (`gestureDb`) — packs, packFiles (metadata only), drawHistory, syncMeta, upload manifest, **mediaCache** (preview/session JPEG blobs).
- **Cloud:** `Tiff Zhang Labs/Gesture/progress.json` — packs, **packFiles** (photo index metadata), and drawHistory (no image bytes).
- **Upload layout:** `Tiff Zhang Labs/Gesture/Reference Packs/{collection name}/` — app-created folders via `drive.file`.
- **Phases:** home (Practice / Collections tabs) → zen session → debrief (`App.tsx`).
- **Pack stats:** `useGesturePackStats` — counts, cover ids (max 4), drawn sets; cards prefer synced `pack.coverFileIds`.
- **Live queries:** `useGesturePacks()` exposes `packsHydrated`; never show empty collections while Dexie is still loading (`resolveDexieLiveQuery`, rule `dexie-live-query-empty-states.mdc`).
- **Folder drop:** entire Collections tab accepts drops (`useGestureCollectionDrop`); traverse folders via `readDataTransferEntryFiles` (not `dataTransfer.files` alone).

## Media tiers

Canonical module: [`media/gestureMediaPolicy.ts`](media/gestureMediaPolicy.ts). Rule: `.cursor/rules/gesture-media-tiers.mdc`.

| Tier        | Use                                  | Resolution order                                                       | Never                                             |
| ----------- | ------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------- |
| **Preview** | Collection card 4-up strips (~320px) | memory/IDB → OAuth thumbnail https → public thumbnail → alt=media blob | Start with full-file download; `fetch()` lh3 URLs |
| **Session** | Zen drawing (1280–1920px)            | prefetch LRU → IDB → thumbnail `<img>` → alt=media blob                | Bulk prefetch entire queue                        |

- **Blob URL owner:** `gestureMediaCache` only — prefetch LRU holds references; never `revokeObjectURL` on cache-owned blobs.
- **Display-ready:** `gestureSessionPhotoPipeline` — decode one photo at a time (head on Practice/debrief; current + next in zen).
- **Warmup:** `useGestureMediaWarmup` (cover thumbs, idle); `useGestureSessionWarmup` (first session photo on Practice tab).

## Pitfalls

- v1 indexes **flat folders only** for **linked** Drive folders — local folder drop flattens nested images into one pack folder.
- **Uploads** must show status from drop/picker through completion; persist pack rows before all files finish (`createPackFromUpload`).
- Refresh mid-upload leaves partial Drive folders — surface `InterruptedUploadBanner`; never silently delete Drive content.
- Pack file index syncs via `progress.json`; after pull, **auto-reindex from Drive** fills any collection still missing photos (legacy backups or linked folders). Runs for all signed-in users, not only Drive backup testers.
- Shared Google token storage with Encore/Stanza/Scales — do not narrow OAuth scopes in Gesture-only code paths.
- **Skip vs complete:** skip does not write `drawHistory`; timer completion and **Mark done** (checkmark / Enter) record a draw with elapsed time.
- **Session back:** prefetch window keeps prev + current + next; prefetch must not revoke `gestureMediaCache` blob URLs on LRU eviction.
- **Session resolve order:** thumbnail `<img>` probe before OAuth `alt=media`; validate prefetch rows against live media cache blobs.
- **Drive token:** `readGestureDriveAccessToken` is single-flight; pass zen `accessToken` into session pipeline to avoid BFF refresh storms.
- **Queue order:** `prioritizeLeastDrawn` sorts by `sessionCount` ascending (never-drawn first); endless sessions never exclude photos.
- **Styles:** prefer `gesture.css` + `--gesture-*` tokens over ad-hoc hex in `sx` (zen error uses `--gesture-zen-error`).

## Tests

- Unit: `src/gesture/**/*.test.ts`
- Smoke: `/gesture/` in `e2e/routeRegistry.ts`; preview strip: `e2e/smoke/gesture-preview-strip.spec.ts` (dev-only `?e2eSeed=1` fixture)
