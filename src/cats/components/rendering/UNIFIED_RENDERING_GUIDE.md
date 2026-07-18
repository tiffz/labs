# Unified furniture rendering (invariants)

**Read when:** adding or changing Cats furniture / world placement. Migration history is gone — follow current APIs only.

## Invariants

1. **All furniture** goes through `UnifiedFurnitureRenderer` + `createFurnitureConfig` / `FurniturePositioning` — no per-item `catToScreen` / scale multipliers in component bodies.
2. **Floor** placement uses floor coordinates; **wall** uses wall coordinates (`FurniturePositioning.floor` / `.wall`). Do not mix systems.
3. **Positioning:** centered horizontally, bottom-aligned vertically; scale from the coordinate system only (no arbitrary `* 1.15` multipliers).
4. **Shadows:** driven by furniture config (`occupiesFloor`, `massWidth`) — do not hand-roll shadow DOM.
5. **Responsiveness:** renderer subscribes to coordinate-system changes; furniture components must not skip that path.

## Usage

```tsx
const config = createFurnitureConfig({
  kind: 'couch',
  ...FurniturePositioning.floor(x, z), // or .wall(x, y, z)
  viewBoxWidth: VB_W,
  viewBoxHeight: VB_H,
  massWidth: actualMassWidth, // optional
});

return (
  <UnifiedFurnitureRenderer {...config} ariaLabel="couch">
    {/* SVG visuals only — no positioning/scaling logic */}
  </UnifiedFurnitureRenderer>
);
```

## Gotchas

| Symptom            | Check                                           |
| ------------------ | ----------------------------------------------- |
| Too small/large    | viewBox sizes; leftover scale multipliers       |
| Wrong place        | floor vs wall helpers; valid transform coords   |
| Missing shadow     | `occupiesFloor` / `massWidth` on config         |
| Debug overlays off | mass-box vs viewBox mapping; baseline alignment |

## Tests

`UnifiedFurnitureRenderer.test.tsx` — config helpers + render path. Resize the game window when changing placement math.
