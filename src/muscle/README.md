# Muscle Memory

Proko-aligned anatomy training for artists: 3D spatial study, warmup exploration, and spaced-repetition active reps.

Base path: `/muscle/`.

## Curriculum (7 modules)

| Module          | Focus                              |
| --------------- | ---------------------------------- |
| **Full body**   | Atlas — all regions, layer peel    |
| Fundamentals    | Core bones and joints (gatekeeper) |
| Torso           | Chest, abs, back surface forms     |
| Shoulder & neck | Deltoids, clavicle, scapula, neck  |
| Arm             | Upper arm and forearm masses       |
| Hand            | Palm architecture and tendons      |
| Leg             | Thigh, knee, calf                  |
| Foot            | Heel, arch, dorsal foot            |

Progress persists in IndexedDB (`muscle-memory` Dexie database). Session UI state uses Zustand.

## Modes

- **Warmup** — click structures in the 3D canvas; context card shows Proko-style drawing notes.
- **Active Reps** — quiz highlights a structure (lapis emissive) with multiple-choice or canvas tap; SM-2 schedules reviews.

Modules stay locked until Fundamentals bones/joints hit baseline reps. See `src/muscle/srs/gatekeeper.ts`.

## 3D assets

Region GLBs live under `public/muscle/models/` (lazy-loaded per module). Z-Anatomy exports render real meshes only — curriculum nodes missing from a region GLB (e.g. hip/knee joint capsules) stay in the structure list but do not get procedural placeholder shapes mixed into the scene.

Pipeline: [`tools/muscle-anatomy/README.md`](../../tools/muscle-anatomy/README.md).

### URL params (dev / shareable)

| Param     | Example         | Meaning                                |
| --------- | --------------- | -------------------------------------- |
| `module`  | `?module=torso` | Open a specific training module        |
| `perf`    | `?perf=1`       | FPS overlay on the 3D canvas           |
| `e2eSeed` | `?e2eSeed=1`    | Dev only — seed Dexie progress for e2e |

## Development

```bash
npm run dev          # http://localhost:5173/muscle/
npx vitest run src/muscle
npm run muscle:validate-assets
npm run presubmit
```

Attribution: [`ATTRIBUTION.md`](ATTRIBUTION.md).
