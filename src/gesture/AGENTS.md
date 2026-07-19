# The Gesture Room — agent context

Nested **`AGENTS.md`** for Gesture. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product scope, Drive layout, env.
2. [`COPY_STYLE.md`](COPY_STYLE.md) — user-facing copy.
3. **Drive sync:** [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — portfolio `progress.json` pattern via `useGestureDriveBackup`.
4. **Upload UX:** [`UPLOAD_UX.md`](UPLOAD_UX.md) — phased feedback, manifest resume, duplicate skip.
5. **Design:** [`DESIGN.md`](DESIGN.md) — Linen tokens; rule `.cursor/rules/gesture-linen-design.mdc`.
6. **CUJs:** [`CUJs.md`](CUJs.md) — critical journeys, perf budgets, verification map.

## Architecture

- **Local:** Dexie (`gestureDb`) — packs, packFiles (metadata only), drawHistory, syncMeta, upload manifest, **mediaCache** (preview/session JPEG blobs).
- **Cloud:** `Tiff Zhang Labs/Gesture/progress.json` — packs, **packFiles** (photo index metadata), drawHistory, and **deletion tombstones** (`deletedDriveFolderIds` / `deletedDriveFileIds`) so removed collections do not resurrect on sync.
- **Upload layout:** `Tiff Zhang Labs/Gesture/Reference Packs/{collection name}/` — app-created folders via `drive.file`.
- **Phases:** home (Practice / Collections tabs) → zen session → debrief (`App.tsx`). Tab deep links: `#/practice`, `#/collections` via [`routes/gestureAppHash.ts`](routes/gestureAppHash.ts).
- **Pack stats:** `GesturePackStatsProvider` / `useGesturePackStats` — counts, cover ids (max 4), drawn sets; cursor aggregate + debounce; cards prefer synced `pack.coverFileIds`.
- **Live queries:** `useGesturePacks()` exposes `packsHydrated`; never show empty collections while Dexie is still loading (`resolveDexieLiveQuery`, rule `dexie-live-query-empty-states.mdc`).
- **Folder drop:** entire Collections tab accepts drops (`useGestureCollectionDrop`); traverse folders via `readDataTransferEntryFiles` (not `dataTransfer.files` alone).
- **Undo:** `LabsUndoProvider` in `App.tsx` (Tier A). App-only delete and local metadata edits go through `undo/gestureUndoableMutations.ts`; Drive side-effects (photo trash, folder rename) are never undoable.

## Media tiers

Canonical module: [`media/gestureMediaPolicy.ts`](media/gestureMediaPolicy.ts). Rule: `.cursor/rules/gesture-media-tiers.mdc`.

| Tier        | Use                                                               | Resolution order                                                                              | Never                                                              |
| ----------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Preview** | Collection card 4-up strips (~320px network; compact 2-up ~192px) | **https thumbnail first** — preview IDB stores downscaled blobs (max 320px), never full files | `blob:` from stale LRU in card grids; full-file `alt=media` in IDB |
| **Session** | Zen drawing (1280–1920px)                                         | prefetch LRU → IDB → thumbnail `<img>` → alt=media blob                                       | Bulk prefetch entire queue                                         |

- **Blob URL owner:** `gestureMediaCache` only — session prefetch holds references; preview **display** is https-only ([`docs/GESTURE_MEDIA_STABILITY.md`](../../docs/GESTURE_MEDIA_STABILITY.md)).
- **Display-ready:** `gestureSessionPhotoPipeline` — decode one photo at a time (head on Practice/debrief; current + next in zen).
- **Warmup:** `useGestureMediaWarmup` (cover thumbs, idle); `useGestureSessionWarmup` (first session photo on Practice tab).

## Pitfalls

- v1 **linked** Drive folders index photos in the folder root only — local uploads preserve nested subfolders on Drive.
- **Uploads** must show status from drop/picker through completion; persist pack rows before all files finish (`createPackFromUpload`).
- **Long-running jobs** → wrap with `useLabsBlockingJobs().withBlockingJob(label, fn)` (shared snackbar; see [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) § Long-running jobs). Do not dim the whole Collections grid — only disable conflicting actions (e.g. during upload).
- Refresh mid-upload leaves partial Drive folders — surface `InterruptedUploadBanner`; never silently delete Drive content.
- Pack file index syncs via `progress.json`; after pull, **auto-reindex from Drive** fills any collection still missing photos (legacy backups or linked folders). Runs for all signed-in users, not only Drive backup testers.
- Shared Google token storage with Encore/Stanza/Scales — do not narrow OAuth scopes in Gesture-only code paths.
- **Practice tag filters:** activating a tag prunes selection to matching collections (no “ghost” packs left selected off-grid). Session queue uses only visible-eligible pack ids — see `gesturePracticeSelection.ts`.
- **Skip vs complete:** skip does not write `drawHistory`; timer completion and **Mark done** (checkmark / Enter) record a draw with elapsed time.
- **Session back:** prefetch window keeps prev + current + next; prefetch must not revoke `gestureMediaCache` blob URLs on LRU eviction.
- **Session resolve order:** thumbnail `<img>` probe before OAuth `alt=media`; validate prefetch rows against live media cache blobs.
- **Drive token:** `readGestureDriveAccessToken` is single-flight; pass zen `accessToken` into session pipeline to avoid BFF refresh storms.
- **Queue order:** `prioritizeLeastDrawn` sorts by `sessionCount` ascending (never-drawn first); endless sessions never exclude photos.
- **Styles:** prefer `gesture.css` + `--gesture-*` tokens over ad-hoc hex in `sx` (zen error uses `--gesture-zen-error`).

## Tests

- Unit: `src/gesture/**/*.test.ts`
- **Preview display invariants (presubmit):** `gesturePreviewDisplayInvariants.test.ts`, `gesturePreviewImageUrl.test.ts`
- **Preview source audit:** `src/gesture/audits/gesturePreviewDisplayAudit.test.ts`
- Stability playbook: [`docs/GESTURE_MEDIA_STABILITY.md`](../../docs/GESTURE_MEDIA_STABILITY.md)
- Smoke: `/gesture/` in `e2e/routeRegistry.ts`; preview strip: `e2e/smoke/gesture-preview-strip.spec.ts` (dev-only `?e2eSeed=1` fixture — https `src`, no blob console errors)
- Interaction: `e2e/smoke/gesture-practice-interaction.spec.ts` — CUJ-001 session controls latency (`src/gesture/CUJs.md`)
- Layout: `e2e/smoke/layout-heuristics-gesture.spec.ts` — hash routes keep **both** tab panels mounted; assert collections via `aria-label`, not bare `.gesture-tab-panel`
- **After changing:** preview strip count, tab mounting/hash routes, collection card layout, or **responsive shell CSS** → `npm run test:e2e:scoped` (gesture) or `presubmit:push`. Mobile layout: `layout-heuristics-gesture.spec.ts` (390px + horizontal scroll).
- **Responsive:** [`docs/RESPONSIVE_DESIGN.md`](../../docs/RESPONSIVE_DESIGN.md) — shell pad tokens + 640/480 collapses in `gesture.css`.

## Performance (Collections / Practice grids)

- **Shared stats:** `GesturePackStatsProvider` + `loadGesturePackStatsAggregate()` — one Dexie subscription, cursor aggregation, 280ms debounce, stable `Map` refs when unchanged.
- **Scroll / thumbnails:** viewport-gated fetch (`previewFetchEnabled && near`); lazy `loading` on non-lead cells; priority resolve queue; delayed pin revoke on scroll-away.
- **Large libraries:** CSS grid in `CollectionsCollectionGrid` (variable card height — no fixed-row virtualizer). Viewport-gated preview fetch via `useNearViewport` + shared `gestureNearViewportObserver`.
- **Card memo:** stable handler maps in `CollectionsCollectionGrid` / `PracticeCollectionGrid` — do not inline `() => handler(id)` in `.map()` on large grids.
- **Covers:** prefer synced `pack.coverFileIds`; avoid recomputing cover maps when pack row already has covers.
