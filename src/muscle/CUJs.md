# Critical user journeys — Muscle Memory

Durable workflows for manual checks, agent verification, and performance benchmarks.  
Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Orbit and explore 3D anatomy

**Primary goal:** Rotate and zoom the model smoothly while studying structures.  
**Persona:** Artist learning Proko-aligned surface anatomy; expects game-like 60 FPS orbit.

### Steps

1. Open `/muscle/` → **Warmup** (default).
2. Confirm the 3D canvas loads the active module GLB.
3. Drag to orbit and scroll to zoom for ~10 s.
4. Toggle **Muscles / Full / Skeleton** — model visibility changes immediately.
5. Hover or tap a structure — HUD label updates without stutter.

### Success criteria

- Orbit feels smooth (no sustained judder) on a 2020+ laptop.
- View-mode toggle hides/shows the correct structure types.
- Hover label appears within one frame of settling on a mesh.

### Performance budgets

Dev server, hard refresh, `fundamentals` module (smallest GLB) unless noted.

| Step                | Metric                              | Budget (p95)      | Verification                                    |
| ------------------- | ----------------------------------- | ----------------- | ----------------------------------------------- |
| Canvas orbit drag   | rAF frame gap during simulated drag | ≤ 20 ms           | `e2e/smoke/muscle-orbit-perf.spec.ts`           |
| View mode toggle    | click → HUD count updates           | ≤ 400 ms          | `e2e/smoke/muscle-shell.spec.ts`                |
| Structure hover     | pointer settle → HUD label          | ≤ 50 ms perceived | manual                                          |
| Module switch       | select module → new GLB visible     | ≤ 3 s             | manual                                          |
| Torso orbit (heavy) | rAF p95 during drag                 | ≤ 20 ms           | `muscle-orbit-perf` torso case (presubmit:push) |

### Known traps

- `render-cascade` — parent canvas subscribing to hover/quiz → all meshes re-render each pointer move.
- `main-thread-jank` — raycasting dense GLBs without BVH on every pointer move.
- `gpu-fill` — >80k triangles/region with PBR materials → cannot hit 60 FPS without decimation.
- `hmr false confidence` — hard refresh after canvas/store wiring changes.

### Automation

| Type              | Artifact                                   |
| ----------------- | ------------------------------------------ |
| Shell smoke       | `e2e/smoke/muscle-shell.spec.ts`           |
| Orbit perf smoke  | `e2e/smoke/muscle-orbit-perf.spec.ts`      |
| Triangle budgets  | `src/muscle/muscleAssetPerfBudget.test.ts` |
| Canvas guardrails | `src/muscle/canvasPerfGuardrails.test.ts`  |
| Asset validate    | `npm run muscle:validate-assets`           |

### Manual trace protocol

1. Hard refresh `/muscle/?module=torso` (or select Torso in module picker).
2. Chrome DevTools → **Performance** → record 10 s orbit.
3. Check **GPU** + **Scripting**; long tasks should stay under 50 ms.
4. Optional: add `?perf=1` for live FPS overlay in dev.

---

## CUJ-002: Warmup study cycle

**Primary goal:** Select a structure and read drawing notes without friction.  
**Persona:** Artist warming up before active reps; expects canvas + panel to stay in sync.

### Steps

1. Open `/muscle/` → **Warmup** (default) → Fundamentals module.
2. Confirm context card shows the first structure (Skull) with Proko-style notes.
3. Toggle **Skeleton** view → HUD reports **12 visible** (full fundamentals gate set).
4. Hover a structure → HUD label updates; context card follows selection on click.
5. Switch module via picker or `?module=torso` → new GLB loads; view counts match curriculum.

### Success criteria

- Context card never empty on first load (first node auto-selected).
- Visible counts reflect **curriculum** nodes, not raw GLB mesh inventory.
- Missing GLB nodes (e.g. hip/knee joints) still appear via procedural placeholders.

### Automation

| Type                 | Artifact                                        |
| -------------------- | ----------------------------------------------- |
| Study journey smoke  | `e2e/smoke/muscle-study-journey.spec.ts`        |
| Active reps (seeded) | same spec with `?e2eSeed=1`                     |
| Region coverage      | `src/muscle/utils/muscleRegionCoverage.test.ts` |

---

## CUJ-003: Active reps quiz loop

**Primary goal:** Answer quiz cards, persist progress, unlock modules via gatekeeper.

### Steps

1. Seed or earn Fundamentals baseline (8 gate nodes × 3 reps).
2. Switch to **Active Reps** → multiple-choice + canvas highlight appear.
3. Answer a card → feedback → auto-advance to next target.
4. Switch module while in Active Reps → deck rebuilds for new module.

### Automation

| Type                       | Artifact                                                |
| -------------------------- | ------------------------------------------------------- |
| Seeded unlock + deck start | `e2e/smoke/muscle-study-journey.spec.ts` (`?e2eSeed=1`) |
| Gatekeeper unit tests      | `src/muscle/srs/gatekeeper.test.ts`                     |
