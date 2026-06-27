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
- **Layer peel:** `layerDepthView.ts` — five notched stops: full figure → under skin (all muscles) → below surface → deep → skeleton; sidebar **Structure browser** lists nodes by layer.
- **Z-Anatomy bridge:** `curriculum/zAnatomyBridge.ts` + CSV in `tools/muscle-anatomy/`; curriculum API at `curriculum/index.ts`.
- **Gatekeeper:** Active Reps disabled until Fundamentals baseline; do not bypass in UI.
- **Facts vs judgment:** Dexie stores progress; pure functions in `src/muscle/srs/`.
- **Z-Anatomy license:** CC BY-SA 4.0 — keep [`ATTRIBUTION.md`](ATTRIBUTION.md) updated.
- **Full-body skin staging:** Mirror straddling −X skin onto +X (`alignSkinEnvelopeToStudyHalf`) — **never** translate by `−min.x`. Study vs reference use **different sagittal clips** (`skinHalfClipOptions.ts`): study keeps midline preserve caps; reference uses `minVertexX ≥ 0` so midline bands do not mirror onto world +X as opaque patches. After `atlas_skin` export or runtime weld changes: `npm run muscle:skin-gates`; hard-refresh `#/full_body`.

## Tests

- Unit: `npx vitest run src/muscle`
- Assets: `npm run muscle:validate-assets`
- Skin pipeline (after export or clip/material changes): `npm run muscle:skin-gates` (includes `muscle:skin-runtime` GLTFLoader ear gate)
- Full-body muscle/bone inventory (UI completeness): `npm run muscle:inventory`, `fullBodyRuntimeInventory.test.ts`, debug panel missing-landmark list
- Perf guardrails: `canvasPerfGuardrails.test.ts`, `muscleAssetPerfBudget.test.ts`
- Smoke: `muscle-shell.spec.ts`, `muscle-orbit-perf.spec.ts`, `muscle-study-journey.spec.ts`
- Dev e2e seed: `?e2eSeed=1` (see `src/muscle/e2e/muscleE2eSeed.ts`)
- Dev FPS overlay: `/muscle/?perf=1`
- Manual QA checklist: `docs/MUSCLE_QA.md`
