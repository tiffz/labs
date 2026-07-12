# Lyrefly — Riso Cube design

Canonical visual language for Lyrefly. **Read this before changing UI** in `src/lyrefly/`.

Merged from user-selected preview themes **White Cube** (Bauhaus gallery minimalism) and **Riso Alley** (misregistered fluoro print shop).

## Mood

**White walls, back-room riso** — crisp gallery spacing and neutral surfaces with hot pink, teal, and scarlet accents. Feels like a clean white-cube exhibition where the comics were printed downstairs on a misregistered risograph.

**Gallery pride** — the showcase should feel like a place you are happy to see your work: warm floor, soft spotlight, unique riso washes per comic, and real concept-art previews on covers when available.

## Tokens

- TypeScript: [`design/risoCubeTheme.ts`](design/risoCubeTheme.ts)
- CSS fallbacks + layout: [`styles/lyrefly.css`](styles/lyrefly.css)
- MUI mirror: `getAppTheme('lyrefly')` in [`appTheme.ts`](../shared/ui/theme/appTheme.ts)

## Palette

| Role          | Token / value                     | Use                                  |
| ------------- | --------------------------------- | ------------------------------------ |
| Canvas        | `#f7f6f3` `--lyrefly-app-bg`      | Page background (warm gallery white) |
| Surface       | `#ffffff` / `#f3f2ef`             | Paper, side panels                   |
| Gallery floor | `#eceae5` `--lyrefly-gallery-bg`  | Shelf plinth zone                    |
| Ink           | `#171717` `--lyrefly-ink`         | Headings, body                       |
| Muted         | `#737373` `--lyrefly-muted`       | Meta, secondary copy                 |
| Accent        | `#ff2d95` `--lyrefly-accent`      | Primary CTA, links (Riso pink)       |
| Accent soft   | `#00d4aa` `--lyrefly-accent-soft` | Secondary highlights (Riso teal)     |
| Accent cool   | `#dc2626` `--lyrefly-accent-cool` | Scarlet punch (White Cube)           |
| Riso yellow   | `#ffd400`                         | Cover washes only                    |

**Do not** reintroduce the multi-theme preview picker or dark purple museum defaults.

## Typography

- **Display / titles:** System UI stack (`SF Pro Display` on Apple, Inter fallback) — wordmark, comic titles, section headings; weight 500, tight negative tracking
- **UI / body:** System UI stack (`SF Pro Text` on Apple, Inter fallback) — chrome, forms, meta copy
- **Script editor:** IBM Plex Mono (`--lyrefly-script-font`)
- Section eyebrows: 0.6875rem, uppercase, wide letter-spacing

## Shape and depth

- **Border radius:** `2px` (`--lyrefly-radius`) — sharp gallery grid
- **Borders:** Hairline `color-mix` on ink; no nested card shadows on chrome
- **Cover shadows:** Riso misregister offset — pink + teal layers on shelf covers only
- **Cover tilt:** Slight `-0.4deg` rotation on shelf covers; lifts on hover

## Layout (structural)

- **Shell:** 88rem max width, generous gutters
- **Your comics:** Editorial masthead + shelf on warm gallery floor; per-comic riso palette or first concept-art preview on cover; “New comic” as first grid slot
- **Workbench:** Flat chrome (title + stepper + actions); white paper stage; hairline dividers only

## Brand mark

**Feather emoji** (Android 17.0 style) — `public/icons/lyrefly-feather.png` uses the **riso-accent** preset (`#ff2d95`, same as UI accents). Re-tint: `python3 tools/lyrefly/recolor-feather-icon.py <preset-id>` (see `tools/lyrefly/feather_logo_presets.py`).

## Script editor

Nested bullets (Google Docs style). See [`SCRIPT_FORMAT.md`](SCRIPT_FORMAT.md).

## Do / don't

| Do                                        | Don't                                |
| ----------------------------------------- | ------------------------------------ |
| Use `--lyrefly-*` tokens                  | One-off hex in TSX                   |
| Riso offset shadows on **covers** only    | Drop shadows on header/footer chrome |
| One primary CTA per viewport              | Competing header + grid CTAs         |
| Extend `lyrefly.css` under `.lyrefly-app` | New theme switcher                   |

Cursor rule: [`.cursor/rules/lyrefly-riso-cube-design.mdc`](../../.cursor/rules/lyrefly-riso-cube-design.mdc).
