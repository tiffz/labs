# 3D mannequin spike — go/no-go

**Date:** 2026-07-12  
**Context:** Lyrefly Thumbs fill picker — optional 3D pose reference for panel mockups.

## Question

Can Labs ship a usable 3D mannequin pose picker without significant manual rigging/art cleanup?

## Findings

- Scrapboard MVP uses **2D stick poses + silhouettes** in `src/shared/comic/stickFigures.ts` — zero asset labor, good enough for layout mockups.
- A web-based mannequin (Three.js GLB) needs: rigged model, pose library, camera framing per panel aspect, and performance budget on mid-tier laptops.
- Pose-matching finished comic art is **out of scope** for mockups; Thumbs mockups are explicitly non–load-bearing.

## Recommendation

**No-go for v1.** Stick/silhouette fills cover the Thumbs CUJ. Revisit only if users ask for pose refs after Scrapboard standalone validation.

## If revisiting later

1. One-week spike: single GLB + 6 preset poses + screenshot export into panel fill.
2. Feasibility gate per `feasibility-first.mdc` — flag manual pose cleanup if source rig does not match stick-figure semantics.
