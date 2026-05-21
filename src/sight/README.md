# Color Sight Trainer

Perceptual color training in Oklch space: comparison drills, contextual value matching, palette bridges, and gamut masking.

Base path: `/sight/`.

## Modules (12 levels)

1. **Compare** (levels 1–4) — Tap which swatch is lighter, darker, or more/less saturated. Level 3 adds cross-hue pairs and tighter chroma gaps; level 4 mixes all axes.
2. **Contextual Matcher** (levels 5–9) — Level 5: target and your swatch side by side on neutral gray (slider alignment intro). Level 6: single target on gray (preview in controls). Levels 7–9 add a contrasting field, then full Oklch control.
3. **Broken Bridge** (levels 10–11) — Fill empty steps between anchor colors along an Oklch interpolation.
4. **Gamut Finder** (levels 12–13) — Align a mask on the color wheel with the gamut used by a procedural landscape.

## Practice flow

- Home shows your level and progress, then **Practice** whenever you are ready. If you are past level 1, use **Practice level** to review any earlier level (review does not change your forward progress). During review, use the **chevrons** beside the level label to move through unlocked levels in one session.
- **No live score while you adjust** sliders or masks (avoids tuning to 100% before submit).
- After **Submit** (or a compare tap), a **reveal** shows how you did: side-by-side swatches, pass/fail, and accuracy % for matches.
- After feedback, the **next question loads automatically** (slightly longer on a miss). Tap the screen or **Continue** to skip the wait.

Profile persists in `localStorage` (`sight:profile`). Saved levels from the older 10-level curriculum are migrated on read.

## Developer sandbox

`/sight/?debug#sandbox`

- Seed, Regen, module picker (including Compare)
- Live metrics visible in sandbox only
- Telemetry panel with ground-truth values

## Development

```bash
npm run dev          # http://localhost:5173/sight/
npx vitest run src/sight
```

See [ARCHITECTURE.md](./ARCHITECTURE.md).
