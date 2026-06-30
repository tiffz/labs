# Node authoring checklist

When adding or editing curriculum nodes in `src/muscle/curriculum/nodes/`:

1. **ID** — stable snake_case matching future GLB mesh names (`muscle_deltoid_anterior`).
2. **Proko scope** — artist-visible form and drawing role only.
3. **`isSurfaceForm`** — `false` only for deep structures artists rarely draw.
4. **`layerDepth`** — 0 superficial, 1 intermediate, 2 deep, 3 skeleton (bones/joints).
5. **`details`** — add or update entry in `structureDetailsCatalog.ts` (definition required; Wikipedia URL when verified).
6. **`layout`** — procedural placement until GLB export exists.
7. **`originBoneId` / `insertionBoneId`** — must reference existing node ids.
8. Run `npx vitest run src/muscle/curriculum/nodeIntegrity.test.ts`.
