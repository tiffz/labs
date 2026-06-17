# Zine Box — agent context

Nested **`AGENTS.md`**. Root: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — routes, MVP scope
2. [`DESIGN.md`](DESIGN.md) — Vibrant Academic tokens
3. [`COPY_STYLE.md`](COPY_STYLE.md)

## Architecture

- **Local:** Dexie `zinebox` — `comics`, `collections`
- **MVP PDF:** shared stub at `/zinebox/fixtures/sample-comic.pdf`
- **Mock import:** `db/mockDriveImport.ts` — 20 seeded comics, idempotent
- **Stacks:** `@dnd-kit/core` drag-to-group; `collections/naturalSortComics.ts`
- **Reader:** `pdfjs-dist` canvas render (not react-pdf)

## Pitfalls

- `useLiveQuery` undefined = loading, not empty — use `resolveDexieLiveQuery`
- Shelves view: PointerSensor `distance: 8` to avoid drag vs horizontal scroll fights
- Reader progress: debounced Dexie update on page change

## Tests

- Unit: `src/zinebox/**/*.test.ts`
- Smoke: `/zinebox/` in `e2e/routeRegistry.ts`
- Debug: `?debug=1` → `ZineboxDebugPanel` + `clearZineboxLocalData()` (IndexedDB only)
