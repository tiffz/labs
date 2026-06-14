# The Gesture Room — agent context

Nested **`AGENTS.md`** for Gesture. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product scope, Drive layout, env.
2. [`COPY_STYLE.md`](COPY_STYLE.md) — user-facing copy.
3. **Drive sync:** [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) — portfolio `progress.json` pattern via `useGestureDriveBackup`.

## Architecture

- **Local:** Dexie (`gestureDb`) — packs, packFiles (metadata only), drawHistory, syncMeta.
- **Cloud:** `Tiff Zhang Labs/Gesture/progress.json` — packs + drawHistory only (no image bytes).
- **Upload layout:** `Tiff Zhang Labs/Gesture/Reference Packs/{collection name}/` — app-created folders via `drive.file`.
- **Images:** `driveResolveThumbnailLink` + `=s1920` downscale; JIT prefetch cache (4 entries max).
- **Phases:** home (Practice / Collections tabs) → zen session → debrief (`App.tsx`).
- **Design:** Linen theme — [`DESIGN.md`](DESIGN.md), tokens in `design/linenTheme.ts`, rule `.cursor/rules/gesture-linen-design.mdc`.
- **Folder drop:** entire Collections tab accepts drops (`useGestureCollectionDrop`); traverse folders via `readDataTransferEntryFiles` (not `dataTransfer.files` alone).
- **Collection uploads:** [`UPLOAD_UX.md`](UPLOAD_UX.md) — phased feedback, incremental Dexie writes, interrupted-upload recovery.

## Pitfalls

- v1 indexes **flat folders only** for **linked** Drive folders — local folder drop flattens nested images into one pack folder.
- **Uploads** must show status from drop/picker through completion; persist pack rows before all files finish (`createPackFromUpload`).
- Refresh mid-upload leaves partial Drive folders — surface `InterruptedUploadBanner`; never silently delete Drive content.
- Pack file index is **local**; after sync from another device, user may need **Refresh** on a pack.
- Shared Google token storage with Encore/Stanza/Scales — do not narrow OAuth scopes in Gesture-only code paths.

## Tests

- Unit: `src/gesture/**/*.test.ts`
- Smoke: `/gesture/` in `e2e/routeRegistry.ts`
