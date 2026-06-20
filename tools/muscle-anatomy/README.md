# Muscle anatomy asset pipeline

Offline tooling to convert [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) Blender sources into region GLBs for Muscle Memory.

## Prerequisites

1. Download `Z-Anatomy_Template.zip` from the Z-Anatomy models repository.
2. Install Blender 3.6+.
3. Optional: [gltfpack](https://github.com/zeux/meshoptimizer) for additional Draco compression.

## List mesh names from a GLB (without Blender)

```bash
npx gltf-transform inspect public/muscle/models/arm.glb --format json | jq '.meshes[].name'
```

Or use the Python helper on a `.blend` file:

```bash
python3 tools/muscle-anatomy/list_mesh_names.py tools/muscle-anatomy/data/Z-Anatomy.blend
```

Map each Z-Anatomy object name to a curriculum `node_id` in `z_anatomy_name_map.csv`, then re-export.

## Curriculum manifest (TypeScript)

Artist-facing nodes live in `src/muscle/curriculum/nodes/*.ts` (`MuscleMemoryNode`). The compiled entry point is `src/muscle/curriculum/index.ts` (with Z-Anatomy aliases in `zAnatomyBridge.ts`). Runtime GLB mesh ids are listed in `public/muscle/models/manifest.json` after export.

## Name mapping

Edit [`z_anatomy_name_map.csv`](z_anatomy_name_map.csv):

| Column           | Purpose                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `z_anatomy_name` | Object name in the Blender file **exactly** (including Z-Anatomy typos, e.g. `Scapular part of deltoid uscle.r`) |
| `node_id`        | `MuscleMemoryNode.id` in `src/muscle/curriculum/nodes/`                                                          |
| `region`         | Module bucket (`fundamentals`, `torso`, …)                                                                       |

## Download source (once)

Place the Zenodo / Z-Anatomy template blend at `tools/muscle-anatomy/data/Z-Anatomy.blend` (gitignored).

## Export all regions

Prefer the full pipeline (audit → export → validate → sync → visual checklist):

```bash
npm run muscle:export-pipeline
```

Single region:

```bash
npm run muscle:export-pipeline -- --region atlas_skin
```

Legacy all-regions export (validate + sync only at end):

```bash
npm run muscle:export-z-anatomy
```

## Export one region

```bash
blender tools/muscle-anatomy/data/Z-Anatomy.blend --background \
  --python tools/muscle-anatomy/export_region_glb.py -- \
  --region shoulder_neck \
  --blend tools/muscle-anatomy/data/Z-Anatomy.blend
```

## Procedural fallback (no Blender)

When Blender or Z-Anatomy sources are unavailable, generate curriculum-aligned placeholder GLBs:

```bash
npm run muscle:export-glbs
```

This writes `public/muscle/models/{region}.glb` and updates `manifest.json` from node `layout` + `primitiveShape` data.

Outputs:

- `public/muscle/models/{region}.glb` — **plain GLB, no Draco** (Three.js loads without a decoder)
- Updated `public/muscle/models/manifest.json` (includes `assetRevision` hash for GLB cache busting)

After export:

```bash
npm run muscle:sync-bridge   # regenerate zAnatomyBridge.ts from CSV
```

## Validate against curriculum

```bash
npm run muscle:validate-assets
```

Fails when manifest mesh `nodeId` values are missing from the TypeScript curriculum **or** triangle counts exceed performance budgets (25k/mesh, 80k/region — see `src/muscle/muscleAssetPerfBudget.ts`).

Re-export with decimation:

```bash
npm run muscle:export-z-anatomy   # --ratio 0.2 --max-tris 25000 per mesh
```

## License

Z-Anatomy data is **CC BY-SA 4.0**. See [`src/muscle/ATTRIBUTION.md`](../src/muscle/ATTRIBUTION.md).
