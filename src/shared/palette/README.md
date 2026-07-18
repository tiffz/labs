# Shared palette tools

Comic color palette model, import/export helpers, and mockup role mapping used by Lyrefly and Scrapboard.

## `LabsPaletteField` (dense hosts)

Closed control is a **swatch strip**; click opens an `AnchoredPopover` with the builder (and optional hex/Coolors paste). Prefer this for side rails (Scrapboard).

```tsx
import { LabsPaletteField } from '../shared/palette';

<LabsPaletteField
  variant="sketchy"
  label="Palette"
  value={palette}
  onApply={setPalette}
  showPaste
/>;
```

## `LabsPaletteBuilder`

Panel body for generating and applying a `ComicPalette` (inline, or inside `LabsPaletteField`):

- **Mood presets** — `PALETTE_MOOD_PRESETS` from `src/shared/color` (vivid, pastel, neon, jewel, earth, muted, mixed…)
- **Regenerate** — reshuffle within the current mood
- **Surprise me** — fully random generate across moods
- **Seed a color** — pick or type a hex, generate harmony proposals from it
- **Upload image** — extract a palette from a photo (`proposePalettesFromImageFiles`)

```tsx
import { LabsPaletteBuilder } from '../shared/palette';

<LabsPaletteBuilder
  variant="lyrefly" // 'sketchy' | 'lyrefly' | 'neutral'
  value={project.colorPalette}
  onApply={(palette) => onPaletteChange(palette)}
/>;
```

No live `/ui` catalog demo yet — wiring a `demoBySymbol` entry in `src/ui/sharedCatalog.config.json` plus a case in `src/ui/App.tsx` is straightforward but non-trivial (that switch is large); the component still appears in the catalog list (generated from JSDoc) via `npm run generate:shared-catalog`. Add the interactive demo in a follow-up if the gallery needs it.

## `applyPaletteToMockup`

Maps a `ComicPalette` onto mockup roles using comic conventions:

- **`background` / `bubble`** — stay neutral paper / white (not palette-washed)
- **`sky` / `ground`** — pastel scene bands inside panels
- **`figure` / `caption` / `sfx`** — darkest / mid accent / highest-chroma
- **`panelFills`** — soft sky-adjacent underfills

Shape stays backward compatible; `sky` / `ground` / `sfx` are additive.

## Other files

- `types.ts` — `ComicPalette`, `PaletteSwatch`, `createPaletteFromHexes`
- `parseCoolorsUrl.ts` — Coolors URL / hex list / CSS var / palettegen paste parsing
- `exportPalette.ts` — CSS vars / JSON / hex row export
