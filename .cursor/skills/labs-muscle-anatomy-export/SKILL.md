---
name: labs-muscle-anatomy-export
description: Z-Anatomy Blender export pipeline for Muscle Memory — audit coverage, export GLBs, validate budgets, sync bridge/registry, visual checklist. Use when exporting or fixing muscle 3D assets, skin gaps, atlas GLBs, or zAnatomyBridge.
---

# Labs muscle anatomy export

End-to-end workflow for Z-Anatomy → Muscle Memory GLBs. **Do not improvise** — run phases in order.

## Canonical docs

- [`tools/muscle-anatomy/README.md`](../../tools/muscle-anatomy/README.md) — prerequisites, CSV mapping, single-region Blender command
- [`src/muscle/AGENTS.md`](../../src/muscle/AGENTS.md) — runtime pitfalls, tests
- [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) — automated + visual QA (full-body skin section)
- Budgets: [`src/muscle/muscleAssetPerfBudget.ts`](../../src/muscle/muscleAssetPerfBudget.ts)

## When to use

- Exporting or re-exporting `public/muscle/models/*.glb`
- Fixing skin gaps, missing anatomy, Frankenstein seams, or eye globes
- Adding Z-Anatomy meshes to curriculum (`z_anatomy_name_map.csv`)
- After editing `tools/muscle-anatomy/export_region_glb.py` predicates

## Prerequisites

1. `tools/muscle-anatomy/data/Z-Anatomy.blend` present (gitignored — download from Z-Anatomy)
2. Blender 3.6+ on PATH or `/Applications/Blender.app/Contents/MacOS/Blender` (set `BLENDER=` to override)
3. For full atlas work: ~10–15 min Blender time + hard refresh after

## Pipeline (run in order)

```bash
npm run muscle:export-pipeline              # full: audit → export all → validate → sync → checklist
npm run muscle:export-pipeline -- --region atlas_skin   # one region only
npm run muscle:export-pipeline -- --skip-export         # validate + sync only (no Blender)
npm run muscle:export-pipeline -- --strict-audit        # fail on audit gaps
```

### Phase 1 — Audit (before export)

```bash
npm run muscle:audit-export
npm run muscle:audit-export -- --with-blender   # optional Blender candidate scan
```

Read output for missing curriculum nodes, skin overlay count, body-area gaps.  
Report: `tools/muscle-anatomy/data/export-audit-report.json`

**Skin-specific:** grep `tools/muscle-anatomy/data/mesh_names.txt` for surfaces missing from export predicates (see § Skin gaps below).

### Phase 2 — Export (Blender)

Full export (all regions):

```bash
npm run muscle:export-z-anatomy
```

Single region (faster iteration):

```bash
npm run muscle:export-pipeline -- --region atlas_skin
```

Regions and decimation caps are defined in [`scripts/export-muscle-z-anatomy-glbs.mjs`](../../scripts/export-muscle-z-anatomy-glbs.mjs).  
Atlas regions: `atlas_complete`, `atlas_head_face`, `atlas_supplement`, `atlas_skin`.

**Commit `public/muscle/models/`** (manifest + GLBs) with source changes — CI imports manifest at typecheck.

### Phase 3 — Validate

```bash
npm run muscle:validate-assets
```

Fails on unknown `nodeId`, triangle budget violations, or curriculum mismatches.  
Skin envelope cap: 48k tris (`MUSCLE_MAX_SKIN_ENVELOPE_TRIANGLES`).

### Phase 4 — Sync bridge + atlas registry

```bash
npm run muscle:sync-bridge          # zAnatomyBridge.ts from CSV
npm run muscle:sync-atlas-registry  # after atlas_complete / head_face export
```

If you edited `SKIN_OVERLAY_MESH_IDS` manually, also update [`scripts/sync-muscle-z-anatomy-bridge.mjs`](../../scripts/sync-muscle-z-anatomy-bridge.mjs) template and [`scripts/validate-muscle-assets.mjs`](../../scripts/validate-muscle-assets.mjs) `OVERLAY_NODE_IDS`.

### Phase 5 — Code + presubmit

When runtime merge logic or overlay IDs change:

```bash
npx vitest run src/muscle
npm run presubmit
```

GLB-only changes: still run `muscle:validate-assets` + `presubmit` (manifest guardrails).

### Phase 6 — Visual checklist (mandatory for atlas / skin)

Hard refresh `/muscle/#/` (Cmd+Shift+R) — HMR hides stale GLB cache.

| Checkpoint                 | Pass criteria                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| Full body sagittal split   | Study (+X) muscles visible; reference (−X) skin mirrored; no thin slice                              |
| Skin continuity            | No Frankenstein stitch ridges; palm, elbow, knee, neck/shoulder, face, ankles covered                |
| Eye globes                 | Orbital voids filled (sclera/cornea mesh); not hollow dark sockets                                   |
| Layer peel 0 + skin toggle | Semi-transparent study skin; muscles readable underneath                                             |
| Orbit perf                 | ~10 s drag without sustained judder; `npm run test:e2e:smoke -- e2e/smoke/muscle-orbit-perf.spec.ts` |

Full protocol: [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) § Full-body atlas.

## Skin gaps — root cause class

Z-Anatomy skin uses **inconsistent naming**:

| Pattern                 | Example                               | Export predicate                                  |
| ----------------------- | ------------------------------------- | ------------------------------------------------- |
| `* region.r`            | `Pectoral region.r`                   | `_is_region_skin_patch`                           |
| Named fossae / surfaces | `Palm.r`, `Cubital fossa.r`           | `_AUXILIARY_SKIN_BASES` in `export_region_glb.py` |
| Digit surfaces          | `Dorsal surfaces of digits of foot.r` | `_is_*_digit_skin_patch` or auxiliary list        |
| Bridge triangles        | `Deltopectoral triangle.r`            | `_BRIDGE_SKIN_BASES`                              |

**When user reports a gap:** grep `mesh_names.txt` → add to auxiliary/bridge list → re-export `atlas_skin` only → visual verify.

## New anatomy source checklist (female model / Z-Anatomy refresh)

When onboarding a new `.blend` or re-exporting after Z-Anatomy updates:

1. `npm run muscle:audit-export -- --with-blender` — review `skinSourceInventory` + missing patches
2. Grep `mesh_names.txt` for user-reported gaps → `_AUXILIARY_SKIN_BASES`, `_BRIDGE_SKIN_BASES`, `_FACE_AUXILIARY_SKIN_BASES`, neck bridge predicate order
3. Export one region: `npm run muscle:export-pipeline -- --region atlas_skin`
4. Automated gates: `muscle:skin-boundary`, `muscle:skin-half-split`, `muscle:skin-coverage`
5. Hard refresh `/muscle/#/full_body` — palm, ear, midline seam, throat (see [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md))
6. Commit `public/muscle/models/` with export script + runtime clip changes

Rule: `.cursor/rules/muscle-skin-pipeline.mdc` — export fixes holes; no runtime procedural skin meshes.

## Anti-patterns (learned)

| Do not                                    | Do instead                                           |
| ----------------------------------------- | ---------------------------------------------------- |
| SOLIDIFY thicken on joined skin patches   | `weld_skin_mesh` (merge_by_distance + smooth)        |
| Separate skin_hand / skin_foot GLB meshes | Single `skin_envelope` + runtime `mergeSkinMeshes`   |
| Fix gaps only in Three.js                 | Fix export predicates first                          |
| Skip audit before export                  | `muscle:audit-export` surfaces missing patches early |
| Trust presubmit alone for 3D              | Hard refresh + visual checklist                      |

## Adding curriculum nodes

1. Add node in `src/muscle/curriculum/nodes/*.ts`
2. Row in `tools/muscle-anatomy/z_anatomy_name_map.csv`
3. Re-export affected region(s)
4. `npm run muscle:sync-bridge`
5. `npm run muscle:validate-assets`

## Eye globes

Z-Anatomy provides `Sclera.r.*` + `Cornea.r.*` only (no iris). Exported as `eye_globes` mesh in `atlas_skin.glb`; rendered by `EyeGlobesLayer.tsx`. Add `_EYE_GLOBE_BASES` entries in `export_region_glb.py` if names change.

## Done checklist

- [ ] Audit report reviewed (no unexpected critical gaps)
- [ ] `muscle:validate-assets` green
- [ ] `zAnatomyBridge.ts` synced if CSV changed
- [ ] `npm run presubmit` green
- [ ] Visual checklist passed (hard refresh)
- [ ] `public/muscle/models/` committed with TS changes
