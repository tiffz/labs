# Artist curriculum manifest

Single source of truth for Muscle Memory study scope, aligned with Proko anatomy basics and Anatomy for Sculptors regional mass-thinking.

## Guided module sequence

| Order | Module id       | Label               | Gate                  |
| ----- | --------------- | ------------------- | --------------------- |
| 1     | `anatomy_terms` | Language of Anatomy | Entry module          |
| 2     | `fundamentals`  | Skeletal landmarks  | Terms baseline        |
| 3     | `torso`         | Torso               | Fundamentals baseline |
| 4     | `shoulder_neck` | Shoulder & neck     | 50% Torso             |
| 5     | `arm`           | Arm                 | 50% Shoulder & neck   |
| 6     | `hand`          | Hand                | 50% Arm               |
| 7     | `leg`           | Leg                 | Fundamentals baseline |
| 8     | `foot`          | Foot                | 50% Leg               |

Full body atlas is reference-only (not in the linear path).

## Granularity rules

- **Multi-member study groups:** standard anatomical muscle groups only (deltoid, quadriceps femoris, hamstrings, gluteal muscles, rotator cuff, thenar muscles, intrinsic muscles of the hand). No regional buckets like “front torso” or “forearm”.
- **Default study deck:** Proko lesson mass or AFS silhouette block (see `artistStudyManifest.ts`).
- **Drill-down:** Individual vertebrae stay atlas-only until the user toggles detail structures.
- **Quiz eligible:** `quizEligible: true` in manifest; atlas fills default to `false`.

## Study vs atlas-only

A node is in a module's study deck unless it sets `atlasOnly: true`
(`curriculum/index.ts` → `getNodesForRegion`). That flag is the only switch.

Atlas-only today: deep hip rotators (piriformis, gemelli, obturator internus,
quadratus femoris), soleus, gracilis, sartorius, splenius capitis, omohyoid,
the head and face nodes, and every generated `atlas_*` fill. All four quadriceps heads and all three
hamstrings are study nodes.

## Retire / merge

- Individual spine vertebrae: never study nodes; use `bone_spine` group (future) or ribcage/pelvis landmarks only.
- Duplicate Latin-only subdivisions without silhouette impact: atlas-only.

## AFS chapter tags

Manual tags for cross-reference (image-heavy books; human-maintained):

- **Understanding the Human Figure:** proportions, masses, contrapposto, regional chapters mirror module order.
- **Form of the Head & Neck:** optional future `head_face` module.
- **Arm and Hand in Motion:** arm/hand module pose notes.

See generated entries in [`artistStudyManifest.ts`](artistStudyManifest.ts).
