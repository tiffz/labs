# Node authoring checklist

When adding or editing curriculum nodes in `src/muscle/curriculum/nodes/`:

1. **ID** — stable snake_case matching future GLB mesh names (`muscle_deltoid_anterior`).
2. **Proko scope** — artistic drawing mechanics only; skip non-visible medical detail.
3. **`isSurfaceForm`** — `false` only for deep structures artists rarely draw.
4. **`layerDepth`** — 0 surface, 1 intermediate, 2 bone/deep.
5. **`artisticContext`** — all three fields required (why / mistake / movement).
6. **`layout`** — procedural placement until GLB export exists.
7. **`originBoneId` / `insertionBoneId`** — must reference existing node ids.
8. Run `npx vitest run src/muscle/curriculum/nodeIntegrity.test.ts`.
