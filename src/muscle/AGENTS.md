# Muscle Memory — agent context

Nested **`AGENTS.md`** for `src/muscle/`. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — modules, modes, assets.
2. [`DESIGN.md`](DESIGN.md) — Vibrant Academic tokens and 3D states.
3. [`COPY_STYLE.md`](COPY_STYLE.md) — reps/warmup vocabulary.
4. [`CUJs.md`](CUJs.md) — orbit perf budgets + verification map.
5. Asset pipeline: [`tools/muscle-anatomy/README.md`](../../tools/muscle-anatomy/README.md) — skill **`labs-muscle-anatomy-export`** for export → validate → visual checklist. **Coverage ledger:** `npm run muscle:coverage`, [`tools/muscle-anatomy/ANATOMY_COVERAGE.md`](../../tools/muscle-anatomy/ANATOMY_COVERAGE.md).
6. Canvas perf rule: [`.cursor/rules/muscle-canvas-perf.mdc`](../../.cursor/rules/muscle-canvas-perf.mdc).

## Pitfalls

- **Runtime assets:** Commit `public/muscle/models/` (manifest + GLBs) whenever `src/muscle/` ships — typecheck imports the manifest; CI fails if GLBs are missing locally only. Guardrail: `musclePublicAssetsGuardrails.test.ts`, `npm run muscle:validate-assets` (presubmit when app registered).
- **Layer peel:** `layerDepthView.ts` — four notched stops: full muscle → below surface → deep → skeleton; sidebar **Structure browser** lists nodes by layer. The full-body view (`FullBodyRegionModel.tsx`) is a split-plane écorché: study half (+X) = peelable muscles → skeleton; reference half (−X) = the **complete human** (all muscles + bones), **peel-independent** (`GlbAtlasMirrorMesh` ignores `layerPeelDepth`) as a fixed anchor. The depth slider drives **only the study half**. Both halves are hard-cut at the sagittal plane by a per-material world clip plane (`FullBodyRegionModel` → `clippingPlane` prop; `gl.localClippingEnabled`), so midline-straddling meshes (e.g. the `Diaphragm` atlas fill) can't bleed across into the other half. No skin overlay — muscles and skeleton share the Z-Anatomy source so they register without alignment work. See ADR [`0018`](../../docs/adr/0018-muscle-memory-no-skin-overlay.md).
- **Z-Anatomy bridge:** `curriculum/zAnatomyBridge.ts` + CSV in `tools/muscle-anatomy/`; curriculum API at `curriculum/index.ts`.
- **Gatekeeper:** Active Reps disabled until Fundamentals baseline; do not bypass in UI.
- **Facts vs judgment:** Dexie stores progress; pure functions in `src/muscle/srs/`.
- **Z-Anatomy license:** CC BY-SA 4.0 — keep [`ATTRIBUTION.md`](ATTRIBUTION.md) updated.
- **No skin overlay:** The skin mesh was removed (June 2026) — a swapped-in base mesh could not register to the Z-Anatomy muscle pose, and the Z-Anatomy skin had unfixable hole/blob artifacts. The full-body écorché now splits muscle vs skeleton (both Z-Anatomy, same pose). Do not reintroduce a skin envelope/clip/seal pipeline. Rationale + everything we tried: ADR [`0018`](../../docs/adr/0018-muscle-memory-no-skin-overlay.md).

## Tests

- Unit: `npx vitest run src/muscle`
- Assets: `npm run muscle:validate-assets`
- Full-body muscle/bone inventory (UI completeness): `npm run muscle:inventory`, `fullBodyRuntimeInventory.test.ts`, debug panel missing-landmark list
- Perf guardrails: `canvasPerfGuardrails.test.ts`, `muscleAssetPerfBudget.test.ts`
- Smoke: `muscle-shell.spec.ts`, `muscle-orbit-perf.spec.ts`, `muscle-study-journey.spec.ts`
- Dev e2e seed: `?e2eSeed=1` (see `src/muscle/e2e/muscleE2eSeed.ts`)
- Dev FPS overlay: `/muscle/?perf=1`
- Manual QA checklist: `docs/MUSCLE_QA.md`
