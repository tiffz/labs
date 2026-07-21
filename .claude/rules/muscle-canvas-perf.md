<!-- AUTO-GENERATED from .agents/rules/muscle-canvas-perf.md — do not edit directly. Edit the source and run `npm run generate:agent-guidance`. -->

> Muscle Memory 3D canvas performance guardrails

# Muscle canvas performance

Read [`src/muscle/CUJs.md`](../../src/muscle/CUJs.md) CUJ-001 before changing orbit, picking, or materials.

## Non-negotiables

1. **`GlbRegionModel` must not subscribe to Zustand** — per-mesh hooks only (`useAnatomyMeshFlags`).
2. **BVH on GLB geometry** — `prepareAnatomyGeometry` in `extractGlbMeshes.ts`; do not remove without replacement.
3. **Triangle budgets** — manifest meshes ≤ 25k tris, regions ≤ 80k (`muscleAssetPerfBudget.test.ts`).
4. **Lambert materials** — use `acquireAnatomyMaterial` pool; avoid per-mesh `MeshStandardMaterial`.
5. **Hover updates** — coalesce via rAF in store; do not set `hoveredNodeId` synchronously on every pointer move from components.
6. **`frameloop="demand"`** — scene-level `invalidate()` on module/view changes; OrbitControls must invalidate while enabled.

## Before declaring done

- `npm run muscle:validate-assets`
- `npm run test:fast -- src/muscle/canvasPerfGuardrails.test.ts src/muscle/muscleAssetPerfBudget.test.ts`
- Hard refresh `/muscle/` and orbit (manual frame-time check — see `src/muscle/CUJs.md` CUJ-001 manual trace protocol). There is no orbit frame-time e2e: it was low-signal on headless software-WebGL; the deterministic guardrails above are the CI gate.

## Related

- [`docs/PERFORMANCE.md`](../../docs/PERFORMANCE.md) — sustained render layer
- Skill `labs-performance`
