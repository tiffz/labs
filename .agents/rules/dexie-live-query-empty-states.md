---
description: Dexie useLiveQuery loading vs empty — never flash false empty states
globs:
  - src/gesture/**/*.tsx
  - src/gesture/**/*.ts
  - src/encore/context/**/*Library*.tsx
  - src/stanza/**/*.tsx
  - src/shared/dexie/**
---

# Dexie live query — loading vs empty

`dexie-react-hooks#useLiveQuery` returns **`undefined` until the first emission**. That is **loading**, not an empty library.

## Do

1. Resolve with [`resolveDexieLiveQuery`](../../src/shared/dexie/resolveDexieLiveQuery.ts) (or an app `*Hydrated` flag like Encore `songsHydrated`).
2. UI states — in order:
   - **`!hydrated`** → spinner (`aria-busy`, `aria-label="Loading …"`)
   - **`hydrated && data.length === 0`** → empty-state copy
   - **else** → render list
3. Side effects (reindex, sync, auto-select) must **wait for hydration** before treating `[]` as real empty.

## Don't

- `const rows = raw ?? []` then `rows.length === 0` → empty UI (false flash).
- "Not found" / "Add your first …" while the query is still `undefined`.

## Reference implementations

- Encore: `EncoreLibraryContext.tsx` — `songsHydrated`, `libraryReady`, `useEncoreSong` `{ status: 'loading' | 'missing' | 'ok' }`
- Gesture: `useGesturePacks()` → `{ packs, packsHydrated }`; `useGesturePackStats()` → `statsHydrated`
- Shared helper: `src/shared/dexie/resolveDexieLiveQuery.ts`

Root cause class: **`empty-state logic`**. Codify on second occurrence — see `docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`.
