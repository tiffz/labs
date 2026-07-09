# Lyrefly — agent context

Nested **`AGENTS.md`**. Root: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — routes, Drive layout
2. [`DESIGN.md`](DESIGN.md) — Riso Cube visual tokens
3. [`types/index.ts`](types/index.ts) — domain models

## Architecture

- **Dexie** working copy; **flat-file project packages** on Drive (`projects/{id}/`)
- **Page-node decoupling:** only `layout.json` holds order; revisions live under `pages/{nodeId}/`
- **Script:** canonical `script.md` + parsed `script.json`; line parser in `script/scriptLineParser.ts`
- **Drive:** portfolio factory via `lyreflyPortfolioDriveBackupConfig.ts`

## Pitfalls

- `useLiveQuery` undefined = loading — use `resolveDexieLiveQuery`
- Script undo: commit on Save/blur, not per keystroke (`LabsUndoProvider`)
- Sidecars before envelope when extending project shard upload

## Tests

- Unit: `src/lyrefly/**/*.test.ts`
- Smoke: `e2e/smoke/lyrefly-gallery.spec.ts`
