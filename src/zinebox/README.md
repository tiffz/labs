# Zine Box

Local-first indie comic and digital zine **reader**. PDFs live in IndexedDB; portfolio backup syncs library metadata and PDF copies to Google Drive.

**Route:** `/zinebox/` · hash routes `#/library`, `#/read/:comicId`

## MVP scope

- **Empty library by default** — add PDFs via drop zone, file picker, or Google Drive folder (local IndexedDB)
- **Google Drive** — one sign-in for portfolio backup and folder import (see [Google sign-in](#google-sign-in) below)
- Library: **grid** view, source/read-status/unread filter pills
- **Stacks:** drag one comic onto another to group issues, or use **Organize** in the account menu (Drive backup row) for duplicate and series suggestions. Open a stack to remove issues with the unlink icon.
- **Reader:** full-screen PDF.js canvas with single / spread / scroll modes
- **Random:** header button opens a random unread zine

Dev/e2e fixture: append `?e2eSeed=1` to seed sample comics (not used in normal browsing).

Debug mode (`?debug` or `?dev`): bottom dock with **Clear library** and **Sample library** in the toolbar (IndexedDB only — other Labs apps and Google sign-in untouched).

Design preview: in dev, or add `?designPreview` — switch among 10 experimental artsy themes (see [`DESIGN.md`](DESIGN.md)).

## Google sign-in

Zine Box uses **one OAuth surface** for both features:

| Feature                                       | Scope                       | Module                    |
| --------------------------------------------- | --------------------------- | ------------------------- |
| Portfolio backup (`Tiff Zhang Labs/ZineBox/`) | `drive.file`                | `useZineboxDriveBackup`   |
| Drive folder PDF import                       | `drive.readonly` + metadata | `DriveFolderImportDialog` |

Both call `ensureZineboxGoogleDriveAccess` in [`drive/zineboxGoogleDriveAccess.ts`](drive/zineboxGoogleDriveAccess.ts), which requests the combined import scope set in a **single GIS prompt** on first sign-in (Account menu or **Review import**). Cached tokens are reused for backup and import until they expire.

Do not call `ensureLabsGoogleAccessTokenForDrive` (narrow backup-only scopes) from Zine Box — that split caused a second sign-in prompt for import.

**Cross-device:** Sign in on each browser via the account menu. After you add comics on one device, backup runs automatically within a few seconds (when signed in). On a new device, sign in once to pull metadata and PDFs from `Tiff Zhang Labs/ZineBox/`. If the library looks empty, use **Back up now** on the first device, then **Sign in** / **Sync** on the second.

**Dev vs production:** `http://127.0.0.1:5173/zinebox/` and `https://labs.tiffzhang.com/zinebox/` are different origins — each has its own IndexedDB. Uploading or reading on production does **not** populate local dev storage (and vice versa) unless both browsers are signed into the same Google account and Drive backup has uploaded PDF sidecars from the source device. Local dev is not “synced with prod” by default.

## URL params

| Hash         | Params                        | Meaning                          |
| ------------ | ----------------------------- | -------------------------------- |
| `#/library`  | `filter=unread`               | Unread only                      |
|              | `filter=read`                 | Started or finished              |
|              | `q=alive`                     | Search titles, filenames, tags   |
|              | `source=Shortbox`             | Source filter                    |
|              | `tag=anthology`               | Tag filter                       |
| `#/read/:id` | `mode=single\|spread\|scroll` | Reading mode                     |
|              | `spreadOffset=1`              | Offset first page in spread mode |

## Dev

```bash
npm run dev
# open http://127.0.0.1:5173/zinebox/
npm test src/zinebox
```

## Post-MVP

- Manual stack reorder UI
