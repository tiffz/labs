---
name: labs-muscle-anatomy-export
description: Z-Anatomy Blender export pipeline for Muscle Memory — audit coverage, export GLBs, validate budgets, sync bridge/registry, visual checklist. Use when exporting or fixing muscle 3D assets, atlas GLBs, or zAnatomyBridge.
---

# Labs muscle anatomy export

End-to-end workflow for Z-Anatomy → Muscle Memory GLBs. **Do not improvise** — run phases in order.

## Canonical docs

- [`tools/muscle-anatomy/README.md`](../../tools/muscle-anatomy/README.md) — prerequisites, CSV mapping, single-region Blender command
- [`src/muscle/AGENTS.md`](../../src/muscle/AGENTS.md) — runtime pitfalls, tests
- [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) — automated + visual QA (full-body atlas section)
- Budgets: [`src/muscle/muscleAssetPerfBudget.ts`](../../src/muscle/muscleAssetPerfBudget.ts)

## When to use

- Exporting or re-exporting `public/muscle/models/*.glb`
- Fixing missing anatomy or export seams
- Adding Z-Anatomy meshes to curriculum (`z_anatomy_name_map.csv`)
- After editing `tools/muscle-anatomy/export_region_glb.py` predicates

## Prerequisites

1. `tools/muscle-anatomy/data/Z-Anatomy.blend` present (gitignored — download from Z-Anatomy)
2. Blender 3.6+ on PATH or `/Applications/Blender.app/Contents/MacOS/Blender` (set `BLENDER=` to override)
3. For full atlas work: ~10–15 min Blender time + hard refresh after

## Pipeline (run in order)

```bash
npm run muscle:export-pipeline              # full: audit → export all → validate → sync → checklist
npm run muscle:export-pipeline -- --region atlas_complete   # one region only
npm run muscle:export-pipeline -- --skip-export         # validate + sync only (no Blender)
npm run muscle:export-pipeline -- --strict-audit        # fail on audit gaps
```

### Phase 1 — Audit (before export)

```bash
npm run muscle:audit-export
npm run muscle:audit-export -- --with-blender   # optional Blender candidate scan
```

Read output for missing curriculum nodes and body-area gaps.  
Report: `tools/muscle-anatomy/data/export-audit-report.json`

### Phase 2 — Export (Blender)

Full export (all regions):

```bash
npm run muscle:export-z-anatomy
```

Single region (faster iteration):

```bash
npm run muscle:export-pipeline -- --region atlas_complete
```

Regions and decimation caps are defined in [`scripts/export-muscle-z-anatomy-glbs.mjs`](../../scripts/export-muscle-z-anatomy-glbs.mjs).  
Atlas regions: `atlas_complete`, `atlas_head_face`, `atlas_supplement`.

**Commit `public/muscle/models/`** (manifest + GLBs) with source changes — CI imports manifest at typecheck.

### Phase 3 — Validate

```bash
npm run muscle:validate-assets
```

Fails on unknown `nodeId`, triangle budget violations, or curriculum mismatches.

### Phase 4 — Sync bridge + atlas registry

```bash
npm run muscle:sync-bridge          # zAnatomyBridge.ts from CSV
npm run muscle:sync-atlas-registry  # after atlas_complete / head_face export
```

### Phase 5 — Code + presubmit

When runtime merge logic changes:

```bash
npx vitest run src/muscle
npm run presubmit
```

GLB-only changes: still run `muscle:validate-assets` + `presubmit` (manifest guardrails).

### Phase 6 — Visual checklist (mandatory for atlas)

Hard refresh `/muscle/#/` (Cmd+Shift+R) — HMR hides stale GLB cache.

| Checkpoint               | Pass criteria                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Full body sagittal split | Study (+X) muscles visible; reference (−X) skeleton; no thin slice                                   |
| Layer peel               | Depth 0 muscles readable; deeper peel reveals skeleton underneath                                    |
| Orbit perf               | ~10 s drag without sustained judder; `npm run test:e2e:smoke -- e2e/smoke/muscle-orbit-perf.spec.ts` |

Full protocol: [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) § Full-body atlas.

## Anti-patterns (learned)

| Do not                       | Do instead                                           |
| ---------------------------- | ---------------------------------------------------- |
| Fix gaps only in Three.js    | Fix export predicates first                          |
| Skip audit before export     | `muscle:audit-export` surfaces missing patches early |
| Trust presubmit alone for 3D | Hard refresh + visual checklist                      |

## Adding curriculum nodes

1. Add node in `src/muscle/curriculum/nodes/*.ts`
2. Row in `tools/muscle-anatomy/z_anatomy_name_map.csv`
3. Re-export affected region(s)
4. `npm run muscle:sync-bridge`
5. `npm run muscle:validate-assets`

## Done checklist

- [ ] Audit report reviewed (no unexpected critical gaps)
- [ ] `muscle:validate-assets` green
- [ ] `zAnatomyBridge.ts` synced if CSV changed
- [ ] `npm run presubmit` green
- [ ] Visual checklist passed (hard refresh)
- [ ] `public/muscle/models/` committed with TS changes
