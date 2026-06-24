# Muscle Memory — QA checklist

Agent and human verification map for `/muscle/`. Automated coverage is in [`src/muscle/CUJs.md`](../src/muscle/CUJs.md).

## Automated (CI / presubmit)

```bash
npm run muscle:validate-assets
npm run test:fast -- src/muscle
npx playwright test e2e/smoke/muscle-shell.spec.ts e2e/smoke/muscle-orbit-perf.spec.ts e2e/smoke/muscle-study-journey.spec.ts --project=e2e
npm run presubmit
```

## Full-body atlas (Z-Anatomy export)

After changing `atlas_skin`, `atlas_complete`, or skin export predicates — **hard refresh** `/muscle/` then verify:

| Area            | What to check                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Sagittal split  | World +X study muscles; world −X opaque skin shell. Reference anatomy hidden at Full figure + skin on            |
| Skin continuity | No Frankenstein stitch ridges; palm, elbow, knee, neck/shoulder, face, ankles                                    |
| Skin runtime    | Unified `skin_envelope` is X-aligned before study-half clip — regression in `skinEnvelopeClipRegression.test.ts` |
| Eye globes      | Orbital sockets filled (not hollow dark voids)                                                                   |
| Layer peel      | Depth 0 + skin toggle — semi-transparent study skin over muscles                                                 |
| Performance     | ~10 s orbit without sustained judder                                                                             |

Pipeline: skill **`labs-muscle-anatomy-export`** or `npm run muscle:export-pipeline`.

Automated skin seam guard: `npm run muscle:skin-boundary` (boundary edge baseline in `tools/muscle-anatomy/skin-boundary-baseline.json`).

Debug inventory: `/muscle/?debug=1` — bottom dock lists loaded anatomy/skin node ids vs required sets; **Copy bundle** for LLM paste.

## LLM / browser QA protocol

1. **Hard refresh** `/muscle/` (Cmd+Shift+R) after canvas or GLB changes — HMR can hide stale `useGLTF` cache bugs.
2. **Fundamentals skeleton** — HUD shows `12 visible`; model shows bones + joint placeholders (hip/knee procedural until exported).
3. **Warmup panel** — Skull context card on first load with three note sections.
4. **View modes** — Muscles / Full / Skeleton update HUD counts immediately.
5. **Module switch** — Torso loads rib cage + muscle forms; orbit stays smooth (~10 s drag).
6. **Active reps** — `?e2eSeed=1` unlocks tab; quiz choices render; answer advances deck.
7. **Module switch in Active Reps** — deck rebuilds (no empty quiz while tab stays active).
8. **Perf overlay** — `?perf=1` shows FPS; fundamentals orbit p95 ≤ 20 ms (e2e).

## Known limitations (not regressions)

- Region GLB files on disk still contain extra Z-Anatomy meshes; runtime filters to curriculum ids only.
- `joint_hip` / `joint_knee` use procedural placeholders until Blender export adds them to manifest.
- No cloud sync (IndexedDB only).

## When to extend tests

| User-visible change     | Add                                            |
| ----------------------- | ---------------------------------------------- |
| New module or gate rule | `gatekeeper.test.ts` + study journey assertion |
| Canvas perf regression  | `muscle-orbit-perf.spec.ts` region case        |
| New workout mode        | e2e smoke + CUJ row                            |
