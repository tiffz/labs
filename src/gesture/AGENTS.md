# The Gesture Room — agent context

Nested **`AGENTS.md`** for Gesture. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product scope, Drive layout, env.
2. [`COPY_STYLE.md`](COPY_STYLE.md) — user-facing copy.
3. **Drive sync:** [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — portfolio `progress.json` pattern via `useGestureDriveBackup`.
4. **Upload UX:** [`UPLOAD_UX.md`](UPLOAD_UX.md) — phased feedback, manifest resume, duplicate skip.
5. **Design:** [`DESIGN.md`](DESIGN.md) — Linen tokens; rule `.cursor/rules/gesture-linen-design.mdc`.

## Architecture

- **Local:** Dexie (`gestureDb`) — packs, packFiles (metadata only), drawHistory, syncMeta, upload manifest.
- **Cloud:** `Tiff Zhang Labs/Gesture/progress.json` — packs, **packFiles** (photo index metadata), and drawHistory (no image bytes).
- **Upload layout:** `Tiff Zhang Labs/Gesture/Reference Packs/{collection name}/` — app-created folders via `drive.file`.
- **Images:** OAuth `driveResolveThumbnailLink` → display via `<img>` (never CORS `fetch` on thumbnail URLs). Fallback: `driveGetMediaArrayBuffer` → blob URL. Session cache: 4 entries (`gestureImagePrefetchCache`); collection previews: 320px cache (`gesturePreviewImageUrl`). Token: `readGestureDriveAccessToken`. **Practice start** prefetches the first photo (and warms the next two) before entering zen mode; the drawing timer does not run until the current photo is decoded.
- **Phases:** home (Practice / Collections tabs) → zen session → debrief (`App.tsx`).
- **Pack stats:** `useGesturePackStats` — shared counts / file ids / drawn sets for both tabs.
- **Folder drop:** entire Collections tab accepts drops (`useGestureCollectionDrop`); traverse folders via `readDataTransferEntryFiles` (not `dataTransfer.files` alone).

## Pitfalls

- v1 indexes **flat folders only** for **linked** Drive folders — local folder drop flattens nested images into one pack folder.
- **Uploads** must show status from drop/picker through completion; persist pack rows before all files finish (`createPackFromUpload`).
- Refresh mid-upload leaves partial Drive folders — surface `InterruptedUploadBanner`; never silently delete Drive content.
- Pack file index syncs via `progress.json`; after pull, **auto-reindex from Drive** fills any collection still missing photos (legacy backups or linked folders). Runs for all signed-in users, not only Drive backup testers.
- Shared Google token storage with Encore/Stanza/Scales — do not narrow OAuth scopes in Gesture-only code paths.
- **Skip vs complete:** only timer completion writes `drawHistory`; manual skip increments debrief only.
- **Queue order:** `prioritizeLeastDrawn` sorts by `sessionCount` ascending (never-drawn first); endless sessions never exclude photos.
- **Styles:** prefer `gesture.css` + `--gesture-*` tokens over ad-hoc hex in `sx` (zen error uses `--gesture-zen-error`).

## Tests

- Unit: `src/gesture/**/*.test.ts`
- Smoke: `/gesture/` in `e2e/routeRegistry.ts`
