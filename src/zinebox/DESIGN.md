# Zine Box — design

**Vibrant accent, quiet field:** warm stone neutrals hold the layout; hot pink (`#ff1493`) appears only on interaction.

## Tokens (`--zinebox-*` in `styles/zinebox.css`)

| Token                          | Value                | Use                                                              |
| ------------------------------ | -------------------- | ---------------------------------------------------------------- |
| `--zinebox-paper`              | `#f8f7f5`            | App background                                                   |
| `--zinebox-surface`            | `#fdfcfb`            | Cards, upload zone                                               |
| `--zinebox-ink`                | `#484440`            | Primary text (warm grey, not black)                              |
| `--zinebox-muted`              | `#9c9691`            | Secondary text, inactive pills                                   |
| `--zinebox-accent`             | `#ff1493`            | Active pills, unread dot, progress bar, focus                    |
| `--zinebox-accent-soft`        | `#fff0f7`            | Hover wash, stack peek edges                                     |
| `--zinebox-border`             | `rgba(72,68,64,0.1)` | Hairline borders                                                 |
| `--zinebox-shadow-subtle`      | light offset shadow  | Search field only (quiet chrome)                                 |
| `--zinebox-shadow-cover`       | cel offset shadow    | Hot Stack covers; Riso uses cyan shelf plate (`4px 2px` on Pulp) |
| `--zinebox-shadow-cover-hover` | lift + ring          | Cover hover                                                      |
| `--zinebox-shadow-pill`        | pill offset          | Filter chip hover                                                |
| `--zinebox-shadow-pill-active` | stronger offset      | Active filter chip                                               |

## Surfaces

- **Covers (Riso):** solid cyan **shelf plate** (`::before` on card, offset right) — box-shadow alone is hidden by grid overlap; shelf uses reserved padding
- **Stacks:** pink-tinted rear pages; **neutral issue-count badge** (layers icon + count, bottom-left)
- **Read status on covers:** unread = pink dot (top-right); in progress = thin pink progress bar (bottom edge); finished = clean cover
- **Filter pills:** ghost inactive; hot pink fill when active; offset shadow on hover/active
- **Search:** quiet `--zinebox-shadow-subtle` — lighter than shelf cards
- **View toggle:** muted until selected → pink text on blush background
- **Upload:** neutral dashed zone; pink copy on drag overlay
- **Reader:** warm charcoal fullscreen; MUI primary drives HUD accents

## Typography

Inter via `appFonts`. Sentence case. Title weight 500. Metadata smaller and muted.

## Design preview (10 themes)

During local dev (or `?designPreview` in production builds), a **Design preview** picker appears at the top of the library. Ten experimental artsy themes swap CSS custom properties on `.zinebox-app`:

| ID            | Label        | Vibe                              |
| ------------- | ------------ | --------------------------------- |
| `hotstack`    | Hot Stack    | Default — quiet shelf, pink punch |
| `risograph`   | Risograph    | Misregistered soy ink layers      |
| `newsprint`   | Newsprint    | Halftone grey tabloid             |
| `xerox`       | Xerox        | Photocopy drift & toner           |
| `neonbodega`  | Neon Bodega  | After-hours bodega glow           |
| `pasteup`     | Paste-Up     | Tape, kraft, collage desk         |
| `letterpress` | Letterpress  | Debossed serif specimen           |
| `dotmatrix`   | Dot Matrix   | Green phosphor fanzine            |
| `candycomic`  | Candy Comic  | Bold ink & ben-day dots           |
| `voidgallery` | Void Gallery | White line on infinite black      |

Theme choice persists in `localStorage` (`zinebox-design-theme-v1`). Definitions: `design/zineboxDesignThemes.ts`, `design/zineboxRisoDesignThemes.ts`; effects: `styles/zinebox-design-themes.css`, `styles/zinebox-design-riso.css`.

### Riso Lab (10 themes)

Variations on misregistered soy ink — grouped under **Riso Lab** in the picker:

| ID             | Label             | Vibe                                   |
| -------------- | ----------------- | -------------------------------------- |
| `risograph`    | Risograph Classic | Original cyan + magenta drift          |
| `risodrift`    | Riso Drift        | Triple ghost, registration lost        |
| `risogold`     | Riso Gold         | Burgundy + brass, limited press        |
| `risofluoro`   | Riso Fluoro       | Highlighter yellow + hot pink          |
| `risomint`     | Riso Mint         | Seafoam + coral print shop             |
| `risomidnight` | Riso Midnight     | Dark stock + orange ink (dark mode)    |
| `risosepia`    | Riso Sepia        | Warm soy grain, nostalgia              |
| `risoastro`    | Riso Astro        | Purple + lime weird indie              |
| `risopulp`     | Riso Pulp         | Magenta + cyan comic rack              |
| `risoluxe`     | Riso Luxe         | Cream + brass whisper, expensive quiet |
