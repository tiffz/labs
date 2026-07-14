# Scrapboard

Rough comic page mockups: generated panel layouts, composition fills, and print-aware export.

## Features

- **Panel count → layout gallery** — enter 1–12 panels; browse layouts ranked conventional → experimental (grids, splashes, L/T shapes, mosaic, stagger, open bleed)
- **Composition fills** — 21 procedural blob mockups inspired by classic panel vocabulary (big head, profile, down shot, city/nature scenes, reflection, etc.)
- **Text overlays** — caption, dialogue balloon, and SFX independent from composition art
- **Force bubble placement** — dialogue balloons are sized heuristically then placed with a headless fixed-tick `d3-force` collide solver (see [`SPEECH_BUBBLE_VALIDATION.md`](../shared/comic/SPEECH_BUBBLE_VALIDATION.md)); Rough.js / balsamiq stroke skin is deferred
- **Print spec** — trim presets, bleed, DPI (shared `LabsPrintSpec` with Zine Studio / Lyrefly)
- **Randomize** — fills only, or everything (count + layout + compositions + trim)
- Export PNG at chosen DPI

## Asset strategy

Compositions are **procedural SVG blobs** (zero external assets, CC0-safe). Future: optional Humaaans/Open Peeps-style CC0 packs as alternate render tiers.

## Shared code

- [`src/shared/comic/`](../shared/comic/) — layouts, compositions, `PanelMockupSvg`, force bubble placer
- [`src/shared/zine/labsPrintSpec.ts`](../shared/zine/labsPrintSpec.ts) — trim/bleed/DPI helpers

Lyrefly Thumbs embeds `ScrapboardBoardEditor` from this package.

## Dev

```bash
npm run dev
# open /scrapboard/
```

Bubble quality gate:

```bash
npm run test:bubble-quality
```
