# Scrapboard — agent context

Nested **`AGENTS.md`**. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — chrome model (page cast, panel inspector, always-on layout rail).
2. [`CUJs.md`](CUJs.md) — cast + arrangement + Wikimedia journeys.
3. Shared comic: [`../shared/comic/`](../shared/comic/) — cast/arrangements, `PanelMockupSvg` (pass `cast` for Scrapboard sketchy path).

## Pitfalls

- **Character-first:** Scrapboard passes `cast` into `PanelMockupSvg` and skips procedural blob scenery; Lyrefly still uses legacy `PanelCompositionId` when cast is absent — do not break that path.
- **Always-open layout strip** — do not reintroduce collapse-behind-“Change layout” (`UX_AGENT_GUIDE` § Always-available pickers).
- **Horizon / emoji:** panels without a photo need sky/ground; cast uses [Noto Color Emoji](https://fonts.google.com/noto/specimen/Noto+Color+Emoji) (Google Fonts TTF in `index.html`; spaGuardrails allowlist) rasterized to `<image>` with a **solid white outline baked into the PNG** (no wash overlay — it blurred the ring). `characterMarkerBox` clamps paint extent inside `markerLayoutBounds` so feet never clip under the stroke / next grid cell. Fall back to Apple/Segoe only when Noto paints blank. Never cache blank rasters.
- **Randomize locks:** section dice uses shared `DiceIcon`; global Randomize all must skip locked scopes (including `photos` — scenic Wikimedia for panels + page).
- **Story generation:** `copy/scrapboardStoryGenerate.ts` + `scrapboardStoryThemes.ts` — weighted panel counts (favor 4–6), conventionality-weighted layouts (full-bleed rare), theme/scene mad-libs with cast names, panel-budgeted dialogue, scene-continuous Wikimedia queries, uncommon page photo (~12%). Palettes are contrast-polished (WCAG AA ink on balloons). Photo↔dialogue coupling is **keyword queries**, not vision.
- **Portaled popovers:** always set `paperClassName` to include `scrapboard-popover` (plus a feature class). Tokens are on `:root` in `styles/scrapboard.css` so body-portaled menus keep Nunito + ink. Never nest a second `AnchoredPopover` inside a chip menu — use `LabsWikimediaImageField presentation="inline"` (Page photo) or put search in the same surface.
- **Emoji chrome:** every face uses `.scrapboard-emoji` (+ `--sm` / `--md`) and `--scrapboard-emoji-font`. Never `overflow: hidden` on emoji parents (clips ears). Canvas markers: `EMOJI_FONT_STACK` + `emojiRasterize` outline.
- **No Drive persistence** for boards in this app (session-local unless documented elsewhere).

## Tests

- Unit: `src/shared/comic/comicCast.test.ts`, `characterArrangements.test.ts`
- Layout audit: `audits/scrapboardLayoutAudit.test.ts` (100 story pages × hard bubble/character rules) via `npm run test:bubble-quality`
- E2e: `e2e/smoke/scrapboard.spec.ts`, `scrapboard-bubbles.spec.ts`
