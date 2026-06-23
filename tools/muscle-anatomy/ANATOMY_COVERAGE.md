# Muscle anatomy coverage ledger

Single workflow for **closing gaps** without re-discovering the same missing meshes every session.

## Quick commands

```bash
# Human-readable gap report (module, full-body, CSV muscles, skin overlays)
npm run muscle:coverage

# Presubmit gate (blocking gaps + full-body regression baseline)
npx vitest run src/muscle/anatomy/anatomyCoverageLedger.test.ts

# Full asset validation (triangle budgets + CSV muscles)
npm run muscle:validate-assets

# Export pipeline when Blender + Z-Anatomy.blend are available
npm run muscle:export-pipeline
```

## How gaps are classified

| Kind                 | Meaning                                                                                     | CI                                   |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `module_region_mesh` | Curriculum node missing from its **module GLB** manifest row                                | **Blocking** (unless waived)         |
| `full_body_runtime`  | Node missing from **full-body union** (atlas + module GLBs loaded by `FullBodyRegionModel`) | Baseline cap — must not **increase** |
| `csv_muscle`         | Z-Anatomy CSV `muscle_*` row missing or below triangle minimum                              | **Blocking**                         |
| `skin_overlay`       | Required skin patch missing from `atlas_skin` manifest                                      | **Blocking**                         |

Implementation: [`src/muscle/anatomy/anatomyCoverageLedger.ts`](../../src/muscle/anatomy/anatomyCoverageLedger.ts)

## Waivers (explicit deferrals only)

[`coverage-waivers.json`](coverage-waivers.json) lists node ids that are **known missing** with a reason and export path. Waivers are not a substitute for fixing anatomy — remove a row when the mesh lands in `manifest.json`.

## Full-body baseline

[`coverage-baseline.json`](coverage-baseline.json) sets `maxFullBodyGaps`. When you fix full-body holes, **lower the number** in the same PR. CI fails if gaps **increase** above the baseline (regression guard).

## Recommended fix loop

1. `npm run muscle:coverage` — read the report; pick the highest-impact **blocking** row.
2. Update [`z_anatomy_name_map.csv`](z_anatomy_name_map.csv) if Z-Anatomy source names changed.
3. `npm run muscle:export-pipeline -- --region <region>` (or full pipeline).
4. `npm run muscle:validate-assets` + anatomy ledger test.
5. Remove waiver + lower baseline when the node is verified in-app (Full body peel + module study).

## Visual gaps not caught by manifest alone

If a node is **in manifest** but invisible in the canvas, check:

- GLB mesh name → `resolveCurriculumNodeId()` in [`zAnatomyBridge.ts`](../../src/muscle/curriculum/zAnatomyBridge.ts)
- Layer peel depth hiding skin vs muscle ([`layerDepthView.ts`](../../src/muscle/layerDepthView.ts))
- `isPlausibleAnatomyMesh()` rejecting degenerate geometry in [`extractGlbMeshes.ts`](../../src/muscle/components/canvas/extractGlbMeshes.ts)

Add a row to [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) when you confirm a new failure mode.
