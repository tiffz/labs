# Skin hole burn-down process

Canonical workflow for closing **visible skin holes** in Muscle Memory full-body atlas staging. Fixes belong in **Blender export** ([`export_region_glb.py`](../export_region_glb.py)) — not runtime procedural patches. See [ADR 0015](../../docs/adr/0015-muscle-memory-local-first-anatomy.md) and [`.cursor/rules/muscle-skin-pipeline.mdc`](../../.cursor/rules/muscle-skin-pipeline.mdc).

## Detection ladder (run in order)

| Step | Command                                                                                                         | Catches                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | `npm run muscle:skin-boundary`                                                                                  | Raw GLB open edges on `skin_envelope`                               |
| 2    | `npm run muscle:skin-coverage`                                                                                  | Study-half band triangles, lateral interior loops, platysma hotspot |
| 3    | `npm run muscle:skin-half-split`                                                                                | Reference mirror bleed, palm/ear/ankle tri counts per half          |
| 4    | `npm run muscle:skin-seam-gaps`                                                                                 | **Midline seam** open edges + closed loops (both halves)            |
| 5    | `npx vitest run src/muscle/anatomy/faceSkinCoverageAudit.test.ts src/muscle/anatomy/earSkinExportAudit.test.ts` | Face bands + auricular export predicates                            |

After export pipeline changes:

```bash
npm run muscle:export-pipeline -- --region atlas_skin   # requires Blender + Z-Anatomy.blend
npm run muscle:skin-boundary && npm run muscle:skin-half-split && npm run muscle:skin-coverage && npm run muscle:skin-seam-gaps
```

Hard refresh `/muscle/` (Cmd+Shift+R), then visual pass at peel depth 0.

## In-app debug overlay

`/muscle/?debug=1&skinHoles=1` on **Full body** tab, peel depth **0**:

| Color       | Meaning                        | Detection                                                                |
| ----------- | ------------------------------ | ------------------------------------------------------------------------ |
| **Magenta** | Significant **interior** holes | Closed boundary loops with `minAbsX > 0.035`, ≥14 edges (study half)     |
| **Yellow**  | **Midline seam** gaps          | Open boundary edges at `\|x\| ≤ 0.028` on study **and** reference halves |

Diagnostic env (Node):

```bash
MUSCLE_SKIN_HOLE_DIAG=1 npx vitest run src/muscle/anatomy/skinHoleHotspotDiagnostic.test.ts
MUSCLE_SKIN_COVERAGE_AUDIT=1 npm run muscle:skin-coverage
```

## Triage taxonomy

Classify every reported hole before editing export:

| Class                    | Symptom                                        | Fix layer                                                     | Example                                             |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| **A — Export topology**  | Magenta loop away from midline                 | `fill_skin_*` / `weld_skin_*` in export                       | Palm void, ear helix gap, delt patch seam           |
| **B — Midline seam**     | Yellow lines along sagittal cut                | Export midline weld **or** clip preserve band (prefer export) | Face/neck/throat pinholes, torso center line        |
| **C — Half mismatch**    | Visible on opaque only (or study only)         | Reference clip options + export geometry                      | Ear shredded without `preserveLateralEar`           |
| **D — Visual interface** | Gap where two halves meet, no loop             | Stitch/weld in export; tighten seam baseline                  | Center-line white pixels between opaque/transparent |
| **E — Micro-seam**       | Small loop (4–12 edges), filtered from magenta | Export weld band; optional `minEdgeCount=4` debug pass        | Patch perimeter slivers                             |

**Why magenta missed the center seam:** interior-hole detection requires `minAbsX > 0.035`. Seam-adjacent topology lives at `|x| ≈ 0` — use **yellow seam overlay** and `muscle:skin-seam-gaps` instead.

## Hotspot registry (priority burn-down)

Fix in order — each row maps debug color → band → export hook → baseline key:

| Priority | Area                             | Debug                  | Band id                                | Export hooks (grep)                                                                       | Baseline keys                                                                     |
| -------- | -------------------------------- | ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| P0       | **Palm void (transparent half)** | Magenta palm blob      | `palmWrist`                            | `fill_skin_palm_center_holes`, `weld_skin_palm_shell_band`, `fill_skin_palm_wrist_holes`  | `maxInteriorLoopsByBand.palmWrist`, `maxLargestInteriorLoopEdgesByBand.palmWrist` |
| P0       | **Ear helix / concha**           | Magenta ear loops      | `earLateral`                           | `finalize_skin_ear_shell`, `join_ear_overlay_to_envelope`, `weld_skin_ear_junction`       | `maxInteriorLoopsByBand.earLateral`, reference ear tri count in half-split audit  |
| P1       | **Midline face/neck/throat**     | Yellow seam lines      | (seam metrics)                         | `fill_skin_throat_holes`, `weld_skin_throat_midline_band`, midline preserve in study clip | `skinSeamGapBaseline.json`, `maxBoundaryEdgesByBand.platysmaFront`                |
| P1       | **Trap / delt / pec junction**   | Magenta shoulder loops | `upperTrapShoulder`, `pecDeltJunction` | `_orphan_skin_centroid_band`, neck bridge patches                                         | `platysmaHotspotMaxInteriorLoops`                                                 |
| P2       | **Smile line / eyebrow**         | Magenta face loops     | `smileLine`, `eyebrow`                 | Face patch routing, `faceSkinCoverageAudit`                                               | `faceSkinCoverageBaseline.json`                                                   |
| P2       | **Wrist / ankle bands**          | Magenta + yellow       | `palmWrist`, ankle half-split          | Palm/ankle welds post-ear join                                                            | half-split ankle tri floor                                                        |

## Per-hotspot fix loop (repeat until baseline tightens)

1. **Reproduce** — `?debug=1&skinHoles=1`; note magenta vs yellow; orbit to confirm half (study vs reference).
2. **Locate band** — match loop centroid to [`SKIN_COVERAGE_BANDS`](../../src/muscle/anatomy/skinCoverageAudit.ts) or seam metrics via `MUSCLE_SKIN_COVERAGE_AUDIT=1`.
3. **Find source mesh** — `grep` patch name in [`tools/muscle-anatomy/data/mesh_names.txt`](data/mesh_names.txt) → add to `_AUXILIARY_SKIN_BASES` / `_EAR_OVERLAY_BASES` / `_BRIDGE_SKIN_BASES` if missing.
4. **Export fix** — targeted Blender fill/weld in [`export_region_glb.py`](../export_region_glb.py); re-run `npm run muscle:export-pipeline -- --region atlas_skin`.
5. **Verify automated gates** — all five skin npm scripts green.
6. **Tighten baselines** — lower caps in `skinCoverageBaseline.json`, `skinSeamGapBaseline.json`, `skin-boundary-baseline.json` for affected bands. **Never loosen** without a regression note in PR.
7. **Add regression test** if user-reported (pattern: [`skinCoverageAudit.significant.test.ts`](../../src/muscle/anatomy/skinCoverageAudit.significant.test.ts)).
8. **Visual sign-off** — [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) checklist; attach before/after screenshots for P0 items.

## Quality bar (“done” definition)

A hotspot is **closed** when **all** of:

- Magenta/yellow overlay gone at default thresholds in that band
- Relevant baseline caps **lowered** from pre-fix values
- Half-split audit still passes (mirror bleed = 0, palm/ear tri floors met)
- No new failures in `muscleSkinPipelineGuardrails.test.ts`
- Human QA row in MUSCLE_QA checked

## Agent workflow

Skill: **`labs-muscle-anatomy-export`**. Read [`src/muscle/AGENTS.md`](../../src/muscle/AGENTS.md) § Full-body skin before editing export or clip code.

When the user sends `?debug=1&skinHoles=1` screenshots:

1. Classify each highlight (magenta vs yellow → taxonomy A–E).
2. Pick highest-priority open row from hotspot registry.
3. Implement export fix + re-export GLB (ask user to run Blender if unavailable).
4. Tighten baselines in the same PR as the GLB.

## Related docs

- [`ANATOMY_COVERAGE.md`](ANATOMY_COVERAGE.md) — mesh manifest gaps
- [`docs/MUSCLE_QA.md`](../../docs/MUSCLE_QA.md) — human visual checklist
- [`README.md`](README.md) — three skin audit gates + post-export commands
