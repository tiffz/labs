# Zine Box

Local-first indie comic and digital zine **reader**. PDFs live in IndexedDB; portfolio backup syncs library metadata and PDF copies to Google Drive.

**Route:** `/zinebox/` · hash routes `#/library`, `#/read/:comicId`

## MVP scope

- **Empty library by default** — add PDFs via drop zone, file picker, or Google Drive folder (local IndexedDB)
- **Google Drive** — one sign-in for portfolio backup and folder import (see [Google sign-in](#google-sign-in) below)
- Library: **grid** view, source/unread filter pills
- **Stacks:** drag one comic onto another to group issues
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

## URL params

| Hash         | Params                        | Meaning                          |
| ------------ | ----------------------------- | -------------------------------- |
| `#/library`  | `filter=unread`               | Unread only                      |
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
