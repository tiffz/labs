# Palette Generator

Standalone Labs app for building color palettes from scratch — photos, seed colors, and configurable random generation.

## Features

- **Image sampling** — multiple strategies (vivid accents, accent mix, light & shadow, max spread, averaged hues) instead of muddy centroids-only extraction
- **Seed color harmonies** — complementary, triadic, analogous, split complementary, muted bridge
- **Random palettes** — mood presets (vivid, pastel, neon, jewel, earth, muted) with harmony templates
- **Style profiles** — lightness/chroma bounds, sRGB gamut clipping, custom overrides
- **Coolors-style UI** — full-bleed stripes + thumbnail strip navigation
- **Share link** — toolbar share icon copies a normalized `/palette/?colors=…` URL (image-sourced palettes share colors only; source images stay local)
- Export CSS variables, JSON, or hex row

## URL params

Synced via [`usePalettegenUrlState`](./hooks/usePalettegenUrlState.ts) ([URL state pattern](../../docs/URL_STATE_PATTERN.md)):

| Param    | Meaning                                                         |
| -------- | --------------------------------------------------------------- |
| `colors` | Comma-separated lowercase hex without `#` (required for shares) |
| `mode`   | Only `seed` is written; image/random are omitted                |
| `seed`   | Seed hex when `mode=seed`                                       |

Legacy links with `mode=image` still load the `colors` row and ignore the mode.

## Shared code

- [`src/shared/color/`](../shared/color/) — Oklch math, profiles, gamut fit, extraction + generation
- [`src/shared/palette/`](../shared/palette/) — palette export helpers

## Dev

```bash
npm run dev
# open /palette/
```
