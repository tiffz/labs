# Zine Box

Local-first indie comic and digital zine **reader**. PDF files will eventually live in Google Drive; metadata, stacks, and reading progress stay in IndexedDB (Dexie).

**Route:** `/zinebox/` · hash routes `#/library`, `#/read/:comicId`

## MVP scope

- **Empty library by default** — add PDFs via drop zone, file picker, or Google Drive folder (local IndexedDB)
- Google sign-in via shared account menu (Drive sync coming soon)
- Library: **Grid** and **Shelves** views, source/unread filter pills
- **Stacks:** drag one comic onto another to group issues
- **Reader:** full-screen PDF.js canvas with single / spread / scroll modes

Dev/e2e fixture: append `?e2eSeed=1` to seed sample comics (not used in normal browsing).

Debug mode (`?debug` or `?dev`): bottom dock with **Clear library** and **Sample library** in the toolbar (IndexedDB only — other Labs apps and Google sign-in untouched).

Design preview: in dev, or add `?designPreview` — switch among 10 experimental artsy themes (see [`DESIGN.md`](DESIGN.md)).

## URL params

| Hash         | Params                        | Meaning                          |
| ------------ | ----------------------------- | -------------------------------- |
| `#/library`  | `view=grid\|shelves`          | Layout                           |
|              | `filter=unread`               | Unread only                      |
|              | `source=Shortbox`             | Source filter                    |
| `#/read/:id` | `mode=single\|spread\|scroll` | Reading mode                     |
|              | `spreadOffset=1`              | Offset first page in spread mode |

## Dev

```bash
npm run dev
# open http://127.0.0.1:5173/zinebox/
npm test src/zinebox
```

## Post-MVP

- Google Drive PDF storage via portfolio `progress.json` ([`docs/LOCAL_FIRST_SYNC.md`](../../docs/LOCAL_FIRST_SYNC.md))
- Cover extraction from PDF first page
- Manual stack reorder UI
