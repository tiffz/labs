# ADR 0018: Muscle Memory drops the skin overlay (muscle-vs-skeleton écorché)

## Status

Accepted (June 2026)

## Context

Muscle Memory's full-body view was designed as a vertical split-plane **écorché**: a skin
envelope on one half and the interior anatomy on the other, peelable by a depth slider. The skin
was sourced from the Z-Anatomy atlas (CC BY-SA 4.0), the same source as the bones and muscles.

In practice the Z-Anatomy skin mesh was a low-quality medical scan: blobby surface, missing/broken
geometry around the ears, and thin "slit" holes across the torso, arms, and back. We spent
substantial effort (multiple weeks, many Blender re-export cycles) trying to make it
presentation-quality, then trying to replace it wholesale. Neither path reached the bar without
significant **manual** 3D work, which is explicitly outside the labor budget for this app (see
[`.cursor/rules/feasibility-first.mdc`](../../.cursor/rules/feasibility-first.mdc)).

The core realization: the skin is the **only** layer that has to look like a finished organic
surface. Bones and muscles read as study structures and tolerate atlas-grade geometry; skin does
not. Fighting one flawed layer was jeopardizing an otherwise-working app.

## Decision

**Remove the skin overlay entirely.** The full-body écorché splits a peelable study half against a
fixed reference half:

1. Study half — the full muscle figure, peelable by the depth slider down to the skeleton.
2. Reference half — the **complete human** (every muscle layered over every bone), fixed at full
   depth and **peel-independent** as a constant "what a whole body looks like" anchor.

Both halves come from the **same Z-Anatomy source in the same pose**, so they register without any
alignment/rigging work. The depth slider was reduced to four muscle-focused stops (full muscle →
below surface → deep → skeleton) with no skin stop, and drives **only the study half**.

> **Update (June 2026):** the reference half was originally skeleton-only (`node.layerDepth === 3`).
> Per user direction it now shows the complete human (all muscles + bones, peel-independent) so the
> learner always has a finished figure to compare against. In the same pass the `bone_ribcage` node
> gained the 7 Z-Anatomy **costal cartilages** (`Nth costal cartilage.r` → `bone_ribcage`) so the
> thorax closes at the front (rib → sternum bridge) instead of reading as an open cage.
>
> A later pass added a per-material **sagittal clip plane** to both halves (`gl.localClippingEnabled`;
> `clippingPlane` passed from `FullBodyRegionModel` to `GlbAnatomyMesh`/`GlbAtlasMirrorMesh`). Making
> the reference half peel-independent exposed a midline-bleed bug: the wide `Diaphragm` atlas fill
> straddles the sagittal plane, so it poked across onto the study skeleton and — being a non-interactive
> reference mesh — could not be hovered. The clip plane hard-cuts each half at the midline so no
> straddling mesh bleeds across. Rendering exposure was also rebalanced (lower tone-map exposure + key
> light, deeper muscle base color) to fix an overexposed look.

We will **not reintroduce** a skin envelope / clip / seal / hole-fill pipeline. Rendering quality is
pursued through lighting, shadows, and materials on the muscle+bone layers instead (see ADR Links).

## Alternatives considered (everything we tried)

| Approach                                                          | What we did                                                                                                                                                                       | Why it failed / tradeoff                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-region hole-fill patches**                                  | Many targeted Blender fills for ear holes, torso/arm slits, wrist seams                                                                                                           | Hacks stacked on hacks; each fix exposed new seams. Symptom of the asset being the wrong foundation, not a fixable detail.                                                                                                                                                                                                                                        |
| **Single principled global stitch**                               | Replaced per-region fills with one global stitch pass + protected-region decimation (head/ear/fingers exempt from uniform decimation)                                             | Reduced but did not eliminate artifacts; still blobby and not "human ear" quality.                                                                                                                                                                                                                                                                                |
| **Ear voxel remesh**                                              | Solidify → voxel remesh → smooth on the ear region                                                                                                                                | Produced a watertight ear but still not anatomically convincing; introduced benign micro-seams that regressed some audits.                                                                                                                                                                                                                                        |
| **Sliver cleanup pass**                                           | `dissolve_degenerate` + `beautify_fill` + targeted bmesh dissolve/triangulate + `mesh.validate`; added a dedicated `skinSliverAudit`                                              | Cut bright sliver triangles 126 → 7, but the surface was still low-quality and the audit surface area kept growing.                                                                                                                                                                                                                                               |
| **Swap in Blender Studio Human Base Mesh** (CC0, artist topology) | Scripted import, uniform scale/rotate/translate to encompass the Z-Anatomy interior; bisect + rename to `surface_skin`; preserve original eye globes via a pristine reference GLB | **Decisive failure.** The base mesh and the Z-Anatomy interior are in **different rest poses** (notably the arms). A uniform transform cannot fix a pose/rig mismatch — only manual rigging + skinning could, which is exactly the manual labor we are avoiding. Also baked subdivision modifiers ballooned the export to 41 MB before a `modifiers.clear()` fix. |
| **Drop skin (chosen)**                                            | Delete the skin layer; écorché becomes muscle-vs-skeleton                                                                                                                         | Loses the "skin → interior" reveal, but both layers share one pose so there is **zero** alignment/rigging work and no flawed organic surface to maintain. Net visual quality went **up**.                                                                                                                                                                         |

Key lesson, now codified: a base mesh in a different pose can be falsified as infeasible by a
**one-import + one-screenshot spike** in minutes — we should have probed pose compatibility before
building the swap pipeline.

## Consequences

- Deleted: `SkinEnvelopeLayer`, `atlas_skin.glb` + eye globes, the skin clip/seal/stitch/sliver
  tooling, all `muscle:skin-*` npm scripts, two skin Cursor rules, and the skin e2e/visual specs +
  baselines.
- `FullBodyRegionModel` renders a complete-human reference half (peel-independent — `GlbAtlasMirrorMesh`
  ignores `layerPeelDepth`) and a peelable muscle study half; `layerDepthView.ts` defines four stops
  with no skin layer.
- Both halves are opaque muscle + bone, so they write depth (a stale skin-era `depthWrite=false` was
  removed).
- Coverage/inventory audits (`npm run muscle:coverage`, `npm run muscle:inventory`) no longer track
  skin overlays; the muscle+bone union is complete (0 gaps; only hip/knee capsules waived).
- Anyone tempted to re-add skin must revisit this ADR first.

## Links

- [`src/muscle/AGENTS.md`](../../src/muscle/AGENTS.md) — "No skin overlay" pitfall
- [`docs/AGENT_INVARIANTS.md`](../AGENT_INVARIANTS.md) — muscle-vs-skeleton invariant
- [`.cursor/rules/feasibility-first.mdc`](../../.cursor/rules/feasibility-first.mdc) — manual-labor gate that this episode motivated
- [`docs/CONTINUOUS_PROCESS_IMPROVEMENT.md`](../CONTINUOUS_PROCESS_IMPROVEMENT.md) — `feasibility-misjudged` root-cause class
- ADR [0015](./0015-muscle-memory-local-first-anatomy.md) — original Muscle Memory architecture
