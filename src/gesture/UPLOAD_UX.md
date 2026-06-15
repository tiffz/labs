# Gesture — collection upload UX

Canonical rules for **local folder → Google Drive** uploads in The Gesture Room. Read before changing drop handlers, upload hooks, or `createPackFromUpload`.

Related: [`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md) (portfolio JSON sync) · [`DESIGN.md`](DESIGN.md) (visual patterns).

## Problem this solves

Folder uploads have three slow phases before the user sees file counts:

1. **Read** — traverse dropped folder tree in the browser
2. **Prepare** — OAuth + create Drive folder
3. **Upload** — resumable file uploads (can take minutes)

If the tab closes mid-upload, Drive may contain a **partial folder** while the app forgets which local files were pending.

## Conventions (required)

### 1. Immediate feedback

Show **`GestureUploadActivity`** from the first user action (drop or picker), not only after uploads start.

| Phase       | When                                | Example copy                                           |
| ----------- | ----------------------------------- | ------------------------------------------------------ |
| `scanning`  | Folder tree read / file enumeration | “Reading dropped folder…” (+ file count when known)    |
| `checking`  | MD5 hash vs existing Drive photos   | “Checking for duplicates… 12 of 240”                   |
| `preparing` | OAuth + Drive folder creation       | “Preparing ‘Hands’ on Drive…”                          |
| `uploading` | Each file upload                    | “Uploading to Drive… 12 of 240” + determinate progress |
| `finishing` | Final Dexie writes                  | “Saving collection…”                                   |

Use `aria-live="polite"` and `aria-busy` on the status region (`CollectionUploadStatus`).

### 2. Incremental local persistence

**Do not** wait until all files finish before writing Dexie.

1. Create Drive folder
2. **`gestureDb.packs.put`** with `uploadStatus: 'uploading'`, counts, `uploadSourceFolderName`
3. **`uploadManifestFiles.bulkPut`** — one row per image (path, name, size, lastModified, `pending`)
4. **Reconcile** pending manifest rows against files already in the Drive folder before uploading (skip after refresh/crash)
5. **Drive layout:** mirror nested subfolders under the collection folder (`Cats/session 1/a.jpg` → `Reference Packs/Cats/session 1/a.jpg`). Legacy flat uploads (`Cats__session 1__a.jpg`) still reconcile on resume.
6. After **each** successful file: `packFiles.put`, manifest → `uploaded`, bump `uploadedFileCount`
7. On success: clear upload fields + delete manifest rows
8. On error: set `uploadStatus: 'incomplete'`

### 3. Interrupted upload recovery (Tier 1)

On load, surface packs where upload stopped via **`InterruptedUploadBanner`** (`shouldShowUploadRecoveryBanner`):

- `uploadStatus: 'incomplete'` — always show until resolved
- `uploadStatus: 'uploading'` — only when **no** upload is active in this session (e.g. after refresh mid-upload)

While an upload runs, show **one** progress bar at the top of Collections (`CollectionUploadStatus`). Do not duplicate progress in the Add toolbar or drop zone.

Copy must name the collection and progress, e.g.:

> Upload interrupted — “Life drawing”  
> 47 of 240 photos reached Google Drive…  
> To continue, choose the same folder: **Life drawing**

| Action                     | Behavior                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **Continue upload**        | Folder picker → match manifest → skip `uploaded` rows → upload rest to existing Drive folder |
| **Use partial collection** | Sync from Drive, clear upload flags + manifest                                               |
| **Remove…**                | Opens delete dialog (defaults to Drive cleanup for interrupted uploads)                      |

Re-pick is required (no cached filesystem path). Manifest matching uses `relativePath`, `name`, `size`, `lastModified`.

### 4. Organize duplicates (account menu)

**Organize collections** scans each collection folder on Drive for duplicate photos (same MD5 when available, otherwise same file name). Opens a review dialog with counts per collection, **Open in Drive** links, and **Move duplicates to trash** after explicit confirmation. Keeps the copy indexed in the app or with draw history when possible.

### 4b. Upload-time duplicate skip

Before uploading (new collection or add-to-existing), skip duplicates using fast local checks first, then MD5 only when needed:

1. **Manifest match** — same relative path, size, and lastModified as a prior uploaded row
2. **Indexed name** — flattened Drive name already in Dexie for this pack (instant re-drop of an existing folder)
3. **Unique size** — byte size not seen on Drive and not shared with another file in the batch
4. **MD5 hash** — remaining candidates, hashed in parallel (6 at a time), compared to Drive `md5Checksum`

Surface skipped counts in the completion toast.

### 4c. Drop on an existing collection

In Collections manage mode, each collection card accepts folder/photo drops (`usePackCollectionDrop`) and adds photos to that pack via `addPhotosToExistingPack`. Tab-level drop still creates a new collection. Card drop targets use `stopPropagation` so only the hovered card highlights.

### 5. Delete collection

`DeleteCollectionDialog` — always offer:

| Option                   | Behavior                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **App only**             | Remove pack, packFiles, drawHistory, manifest from Dexie. Drive untouched.                         |
| **App and Drive photos** | Trash all images in the Drive folder + trash folder (~30 day Drive trash). Then remove local rows. |

List Drive folder contents when trashing (not only locally indexed files) so failed partial uploads clean up fully.

### 6. Honest errors

Upload failures should point users to Collections recovery / continue flow.

### 7. Shared upload state

One `useGestureCollectionUpload` instance per Collections tab; pass to drop zone, Add menu, and interrupted banner.

### 8. Practice safety

Incomplete upload packs must not be treated as ready for practice until resolved (`isIncompleteUploadPack`).

## What we deliberately do not do (yet)

- **Persisted directory handles** (`showDirectoryPicker` + IndexedDB handle) for one-click continue without re-pick.
- **Local blob cache** of photos before upload (quota / duplication).
- **Background upload** via service worker.

## Key files

| File                                     | Role                                                           |
| ---------------------------------------- | -------------------------------------------------------------- |
| `hooks/useGestureCollectionUpload.ts`    | Phase machine + `continueUploadForPack` + `uploadPhotosToPack` |
| `hooks/usePackCollectionDrop.ts`         | Per-collection card drop target                                |
| `drive/gestureUploadManifest.ts`         | Manifest build + resume matching                               |
| `drive/gestureUploadDuplicateFilter.ts`  | MD5 pre-upload duplicate skip                                  |
| `drive/addPhotosToExistingPack.ts`       | Add photos to linked Drive folder                              |
| `shared/drive/computeFileMd5Hex.ts`      | Local MD5 for Drive checksum match                             |
| `drive/gesturePackUpload.ts`             | Per-file upload loop + manifest updates                        |
| `drive/resumePackUpload.ts`              | Continue after re-pick                                         |
| `drive/gestureDeleteCollection.ts`       | App-only vs Drive trash delete                                 |
| `components/InterruptedUploadBanner.tsx` | Recovery UI                                                    |
| `components/DeleteCollectionDialog.tsx`  | Remove collection options                                      |
