---
paths:
  - 'src/encore/originals/**'
---

<!-- AUTO-GENERATED from .cursor/rules/encore-originals-layout.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> Encore Originals song view scroll and M3 spacing tokens

# Encore Originals layout

Read [`src/encore/theme/encoreM3Layout.ts`](../../src/encore/theme/encoreM3Layout.ts) and [`originals/DEVELOPMENT.md`](../../src/encore/originals/DEVELOPMENT.md) before changing song page or library list layout.

## Song view (read + write)

- **Scroll:** View mode and non-chords write stages use the Encore shell `#main.in-scroll-region` only — **no nested page scrollers** except the chords paint editor inner region.
- **Section spacing:** Stack major blocks with `encorePageSectionGap` (`OriginalsSongViewMode`, song header margin).
- **Surface padding:** Cards and section bodies use `encoreSurfaceContentPad` / `encoreSurfacePadX` from `encoreM3Layout.ts` — do not hard-code one-off pixel gaps.
- **Chords stage:** Integrated page scroll (`display: contents` on workspace) — stepper band, sticky palette, and chart are direct children of `.in-scroll-region`.

## Library table

- MRT table scrolls with the shell; no nested `maxHeight` on the table container.
- Filter chips and row selection live in the list chrome above the table.

## Chord chart paste

- Paste import runs on **Write lyrics**, **Brainstorm**, and routes to **Add chords** when a formatted chart is detected (`pastedChartImport.ts`).
