# Palette Generator

Standalone Labs app for building color palettes from scratch — photos, seed colors, and configurable random generation.

## Features

- **Image sampling** — multiple strategies (vivid accents, accent mix, light & shadow, max spread, averaged hues) instead of muddy centroids-only extraction
- **Seed color harmonies** — complementary, triadic, analogous, split complementary, muted bridge
- **Random palettes** — mood presets (vivid, pastel, neon, jewel, earth, muted) with harmony templates
- **Style profiles** — lightness/chroma bounds, sRGB gamut clipping, custom overrides
- **Coolors-style UI** — full-bleed stripes + thumbnail strip navigation
- Export CSS variables, JSON, or hex row

## Shared code

- [`src/shared/color/`](../shared/color/) — Oklch math, profiles, gamut fit, extraction + generation
- [`src/shared/palette/`](../shared/palette/) — palette export helpers

## Dev

```bash
npm run dev
# open /palette/
```
