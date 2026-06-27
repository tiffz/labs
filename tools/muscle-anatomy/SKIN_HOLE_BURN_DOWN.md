# Skin hole burn-down process

Canonical workflow for closing **visible skin holes** in Muscle Memory full-body atlas staging. Fixes belong in **Blender export** ([`export_region_glb.py`](../export_region_glb.py)) — not runtime procedural patches. See [ADR 0015](../../docs/adr/0015-muscle-memory-local-first-anatomy.md) and [`.cursor/rules/muscle-skin-pipeline.mdc`](../../.cursor/rules/muscle-skin-pipeline.mdc).

## Detection ladder (run in order)

| Step | Command                                                                                                         | Catches                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | `npm run muscle:skin-boundary`                                                                                  | Raw GLB open edges on `skin_envelope`                                                                              |
| 2    | `npm run muscle:skin-coverage`                                                                                  | Study-half band triangles, lateral interior loops, platysma hotspot                                                |
| 3    | `npm run muscle:skin-half-split`                                                                                | Reference mirror bleed, palm/ear/ankle tri counts per half                                                         |
| 4    | `npm run muscle:skin-seam-gaps`                                                                                 | **Midline seam** open edges + closed loops (both halves)                                                           |
| 5    | `npm run muscle:skin-runtime`                                                                                   | **Browser path** — GLTFLoader weld, **ear open edges = 0**, raycast shell coverage, **non-zero clipped skin tris** |
| 6    | `npm run muscle:skin-gates`                                                                                     | All of the above + significant holes + export/face guardrails + **earShellAudit**                                  |
| 7    | `npx vitest run src/muscle/anatomy/faceSkinCoverageAudit.test.ts src/muscle/anatomy/earSkinExportAudit.test.ts` | Face bands + auricular export predicates                                                                           |
| 8    | `npm run test:e2e:smoke -- e2e/smoke/muscle-full-body-skin.spec.ts`                                             | **Live browser** — `__MUSCLE_SKIN_RENDER_AUDIT__` welded + clipped triangle floors                                 |

After export pipeline changes:

```bash
npm run muscle:export-pipeline -- --region atlas_skin   # requires Blender + Z-Anatomy.blend
npm run muscle:skin-gates
```

Hard refresh `/muscle/` (Cmd+Shift+R), then visual pass at peel depth 0.

## Agent self-check loop (no human in the loop)

Use this when iterating on skin holes without waiting for visual QA:

1. **Run** `npm run muscle:skin-gates` — single command; must exit 0.
2. **Ear done?** Step 5 asserts `lateralEarOpenBoundaryEdges ≤ 8` and `earShellRayMissCount ≤ 4` on **both** halves — not just `earDebugLoops === 0`. **Zero magenta ≠ ear done.**
3. **If step 5 fails with high `magentaFloats` (~6000)** → class **H**: fix `mergeSkinEnvelopeParts` / `extractGlbMeshes`, not Blender export.
4. **If step 5 fails with high `earOpen` (orange overlay)** → class **I**: medial ear attachment seam (46-edge loop at `minAbsX ≈ 0.03`, below interior-hole threshold). Run `seal_skin_ear_attachment_seam` in export and re-export `atlas_skin`.
5. **If step 5 passes but skin is invisible in browser** → check `window.__MUSCLE_SKIN_RENDER_AUDIT__` (`weldedReady`, `weldError`, clipped tri counts) **and** `window.__MUSCLE_SKIN_PIXEL_AUDIT__` (`referenceSkinHits`, `studySkinHits`). Scene debug alone is not enough — `depthTest: true` can hide coplanar skin while metrics look healthy.
6. **Agent loop (no screenshots)** — `npm run muscle:skin-visual` then in browser console: `copy(JSON.stringify(window.__MUSCLE_SKIN_PIXEL_AUDIT__, null, 2))`. Require `referenceSkinHits >= 1` and `studySkinHits >= 1` at peel 0 with `?debug=1`.
7. **If step 2 passes but step 5 fails** → audit vs browser path drift; check `SkinEnvelopeLayer` and `useSkinEnvelopeGeometryForHalf` both use `skinEnvelopeRuntimeGeometry`.
8. **If all gates pass but a band still looks wrong** → class **F/G** (coverage gap) or **B** (yellow seam); use `MUSCLE_SKIN_RUNTIME_AUDIT=1 npm run muscle:skin-runtime` for per-half metrics.
9. **After export edits** → re-run `npm run muscle:skin-gates`; tighten baselines in the same change set.

```bash
MUSCLE_SKIN_RUNTIME_AUDIT=1 npm run muscle:skin-runtime
MUSCLE_SKIN_COVERAGE_AUDIT=1 npm run muscle:skin-coverage
```

## In-app debug overlay

`/muscle/?debug=1&skinHoles=1` on **Full body** tab, peel depth **0**:

| Color       | Meaning                           | Detection                                                                                          |
| ----------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Orange**  | **Ear open boundary edges**       | Lateral auricular band, `\|x\| > 0.028` — attachment seam + helix gaps (not closed interior loops) |
| **Magenta** | Significant **interior** holes    | ≥14 edges, `minAbsX > 0.035` — drawn on **same half** as analyzed mesh                             |
| **Magenta** | Palmar peripheral loops           | +8 edges in `palmWrist` band on **both** halves (relaxed debug)                                    |
| **Magenta** | **Thenar / hypothenar** pad loops | +4 edges in eminence bands (patch junction — not generic palm holes)                               |
| **Magenta** | **Ear pinholes**                  | +4 edges in `earLateral` band on both halves                                                       |
| **Cyan**    | **Palmar eminence pads**          | Thenar + hypothenar staging boxes (anatomical void landmarks)                                      |
| **Yellow**  | **Midline seam** gaps             | Open boundary edges at `\|x\| ≤ 0.028` on study **and** reference halves                           |

Study hole wireframes must render on `AnatomyHalfGroup half="study"` — mirroring study loops onto reference hid palmar voids on the transparent side.

Diagnostic env (Node):

```bash
MUSCLE_SKIN_HOLE_DIAG=1 npx vitest run src/muscle/anatomy/skinHoleHotspotDiagnostic.test.ts
MUSCLE_SKIN_COVERAGE_AUDIT=1 npm run muscle:skin-coverage
```

## Triage taxonomy

Classify every reported hole before editing export:

| Class                       | Symptom                                            | Fix layer                                                                                                                       | Example                                                                 |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **A — Export topology**     | Magenta loop away from midline                     | `fill_skin_*` / `weld_skin_*` in export                                                                                         | Palm void, ear helix gap, delt patch seam                               |
| **B — Midline seam**        | Yellow lines along sagittal cut                    | Export midline weld **or** clip preserve band (prefer export)                                                                   | Face/neck/throat pinholes, torso center line                            |
| **C — Half mismatch**       | Visible on opaque only (or study only)             | Reference clip options + export geometry; **study** `preserveMedialPalmCuff` / `preserveLateralUpperArm`                        | Ear shredded without `preserveLateralEar`; palm void from sagittal clip |
| **D — Visual interface**    | Gap where two halves meet, no loop                 | Stitch/weld in export; tighten seam baseline                                                                                    | Center-line white pixels between opaque/transparent                     |
| **F — Coverage gap**        | Visible void, no magenta loop in band              | Add/weld Palm / eminence auxiliary mesh                                                                                         | Hypothenar pad (cyan box, sparse tris)                                  |
| **G — Eminence junction**   | Void on thenar/hypothenar pad, small loops         | `fill_skin_palm_eminence_holes`, Palm + eminence weld at export                                                                 | Palm.r ↔ thenar/hypothenar eminence.r seam                              |
| **H — GLTF primitive seam** | Many ear/palm loops, watertight in Blender         | `mergeSkinEnvelopeParts` strips GLTF **normals** before `mergeVertices`; gate: `npm run muscle:skin-runtime`                    | skin_envelope exported as multiple glTF primitives                      |
| **I — Ear attachment seam** | Visible ear voids, **no magenta**, high **orange** | `seal_skin_ear_attachment_seam`, extended `weld_skin_ear_junction`; gate: `earShellAudit` (`lateralOpenBoundaryEdges`, raycast) | 46-edge loop at `minAbsX ≈ 0.03` (below interior threshold)             |
| **E — Micro-seam**          | Small loop (4–12 edges), filtered from magenta     | Export weld band; optional `minEdgeCount=4` debug pass                                                                          | Patch perimeter slivers                                                 |

**Why magenta missed the center seam:** interior-hole detection requires `minAbsX > 0.035`. Seam-adjacent topology lives at `|x| ≈ 0` — use **yellow seam overlay** and `muscle:skin-seam-gaps` instead.

**Why magenta missed the center palm void:** the visible hole is often **sparse/missing shell** in the anterior palmar center (≈26 tris vs 80 floor) — not a closed boundary loop. Magenta marks **peripheral loops** (thenar/hypothenar/wrist rim). Use **cyan palmar diagnostic** for the expected void band and primary loop centroid.

## Hotspot registry (priority burn-down)

Fix in order — each row maps debug color → band → export hook → baseline key:

**Why magenta missed the center palm void:** visible voids on **thenar / hypothenar eminence pads** are often **patch junction gaps** (Palm.r ↔ eminence.r) or **missing shell** — not a single closed loop at mid-palm. Use **cyan eminence boxes** + eminence-band magenta (4+ edges).

| Priority | Area                           | Debug                  | Band id                                | Export hooks (grep)                                                                                | Baseline keys                                                                                        |
| -------- | ------------------------------ | ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **P0**   | **Ear helix / concha**         | Orange + magenta       | `earLateral`                           | `seal_skin_ear_attachment_seam`, `fill_skin_ear_envelope_holes`, `join_ear_overlay_to_envelope`    | `earShellAudit` (`lateralOpenBoundaryEdges ≤ 8`, `rayMiss ≤ 4`), `maxInteriorLoopsByBand.earLateral` |
| P0       | **Palm eminence pads**         | Cyan + magenta pads    | `palmWrist`                            | `fill_skin_palm_eminence_holes`, `weld_skin_palm_eminence_junction`, `fill_skin_palm_center_holes` | `maxInteriorLoopsByBand.palmWrist`, eminence tri floors in debug                                     |
| P1       | **Midline face/neck/throat**   | Yellow seam lines      | (seam metrics)                         | `fill_skin_throat_holes`, `weld_skin_throat_midline_band`, midline preserve in study clip          | `skinSeamGapBaseline.json`, `maxBoundaryEdgesByBand.platysmaFront`                                   |
| P1       | **Trap / delt / pec junction** | Magenta shoulder loops | `upperTrapShoulder`, `pecDeltJunction` | `_orphan_skin_centroid_band`, neck bridge patches                                                  | `platysmaHotspotMaxInteriorLoops`                                                                    |
| P2       | **Smile line / eyebrow**       | Magenta face loops     | `smileLine`, `eyebrow`                 | Face patch routing, `faceSkinCoverageAudit`                                                        | `faceSkinCoverageBaseline.json`                                                                      |
| P2       | **Wrist / ankle bands**        | Magenta + yellow       | `palmWrist`, ankle half-split          | Palm/ankle welds post-ear join                                                                     | half-split ankle tri floor                                                                           |

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
