# Zine Box — agent context

Nested **`AGENTS.md`**. Root: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — routes, MVP scope
2. [`DESIGN.md`](DESIGN.md) — Vibrant Academic tokens
3. [`COPY_STYLE.md`](COPY_STYLE.md)

## Architecture

- **Local:** Dexie `zinebox` — `comics`, `collections`
- **Drive OAuth:** `drive/zineboxGoogleDriveAccess.ts` — one GIS prompt for backup + folder import (do not use `ensureLabsGoogleAccessTokenForDrive` here)
- **MVP PDF:** shared stub at `/zinebox/fixtures/sample-comic.pdf`
- **Mock import:** `db/mockDriveImport.ts` — 20 seeded comics, idempotent
- **Stacks:** manual drag-to-group only (no import autostack). Drive merge unions stack membership by stack id but honors `removedStackMemberships` / `deletedStackIds` tombstones so unlinks stick across sync. `removeComicFromStack` in `collections/stackMutations.ts`.
- **Reader:** `pdfjs-dist` canvas render (not react-pdf); single/spread use **contain** fit; toolbar uses `@mui/icons-material`

## Pitfalls

- `useLiveQuery` undefined = loading, not empty — use `resolveDexieLiveQuery`
- Reader progress: seed page from Dexie once per open; do not re-sync on every progress write (see `ReaderView` `pageSeedKeyRef`)

## Tests

- Unit: `src/zinebox/**/*.test.ts`
- Smoke: `e2e/smoke/zinebox-library.spec.ts` — use `e2e/helpers/zineboxLibrary.expectZineboxLibraryChrome` before actions that leave `#/library`
- Debug: `?debug=1` → `ZineboxDebugPanel` + `clearZineboxLocalData()` (IndexedDB only)
