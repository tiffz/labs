# Muscle Memory

Proko-aligned anatomy training for artists: 3D spatial study, guided modules, and spaced-repetition active reps.

Base path: `/muscle/`.

## Curriculum (guided path)

| Order | Module                  | Focus                                                       |
| ----- | ----------------------- | ----------------------------------------------------------- |
| 1     | **Language of Anatomy** | Planes, directional terms, movement vocabulary (gatekeeper) |
| 2     | **Skeletal landmarks**  | Regional bones and joint types                              |
| 3     | **Torso**               | Chest, abs, back surface forms                              |
| 4     | **Shoulder & neck**     | Deltoids, girdle, rotator cuff                              |
| 5     | **Arm**                 | Upper arm and forearm masses                                |
| 6     | **Hand**                | Palm architecture and tendons                               |
| 7     | **Leg**                 | Thigh, glutes, knee, calf                                   |
| 8     | **Foot**                | Heel, arch, dorsal foot                                     |
| —     | **Full body**           | Atlas reference with optional detail drill-down             |

Canonical curriculum manifest: [`curriculum/ARTIST_CURRICULUM.md`](curriculum/ARTIST_CURRICULUM.md).

Progress persists in IndexedDB (`muscle-memory` Dexie database). Session UI state uses Zustand.

## Modes

- **Warmup** — explore structures; definition cards with verified Wikipedia links; hierarchical study groups.
- **Active Reps** — quiz modes: name-the-highlight or find-by-name; SM-2 schedules reviews.

Modules stay locked until anatomy terms and skeletal landmarks hit baseline reps. See `src/muscle/srs/gatekeeper.ts`.

## 3D assets

Region GLBs live under `public/muscle/models/` (lazy-loaded per module). Pipeline: [`tools/muscle-anatomy/README.md`](../../tools/muscle-anatomy/README.md).

## Development

```bash
npm run dev          # http://localhost:5173/muscle/
npx vitest run src/muscle
node scripts/verify-anatomy-links.mjs
npm run muscle:validate-assets
npm run presubmit
```

Attribution: [`ATTRIBUTION.md`](ATTRIBUTION.md).
