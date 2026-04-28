# Find Your Pitch — visual design spec

This app ships **one** layout (internally codenamed **Fountain Proof** during exploration). Do **not** reintroduce theme switchers, `data-pitch-concept` attributes, or parallel CSS skins. Extend this system instead.

## Brand

- **Product name:** Find Your Pitch (matches `index.html` title and primary `<h1>`).
- **Voice:** Friendly practice tool, not a pro audio suite. Short labels, plain language.

## Palette (CSS tokens)

Prefer `src/pitch/styles/pitch.css` `:root` variables so MUI and surfaces stay aligned. These match **Fountain Proof** (`sodaRisoFusion`): Riso Smash–style pastels on the shell, **white** `#ffffff` reading panels on cards.

| Role              | Hex                                           | Notes                                       |
| ----------------- | --------------------------------------------- | ------------------------------------------- |
| Primary (teal)    | `#0f766e`                                     | Borders, meter frame, `h1` fill             |
| Secondary (pink)  | `#db2777`                                     | **Single** card slab shadow (`6px 8px 0`)   |
| Tertiary (violet) | `#7c3aed`                                     | Halftone dot pass + purple copy accents     |
| Body paper        | `#fce7f3`                                     | `body` only (flat); no halftone on `body`   |
| Shell gradient    | `#fff5f7` → `#fdf4ff` → `#ecfeff` → `#ffe4e6` | `.pitch-app` wash under halftone            |
| Content panels    | `#ffffff`                                     | Card fill; do not tint card bodies          |
| Tag / chrome copy | `#553c8c`, `#5b21b6`                          | Tagline, labels, mic status (not body gray) |
| Ink               | `#1e1033`                                     | `var(--md-on-surface)`                      |

Shared theme entry: `src/shared/ui/theme/appTheme.ts` (`pitch` key) should stay consistent with these hues.

## Layout and depth

- **Shell:** `.pitch-shell` is a max-width column; no faux device bezel.
- **Cards:** White fill, **one** offset “slab” shadow (e.g. `5px 5px 0 rgba(219, 39, 119, 0.22)`), **no** stacked multi-layer glow cards.
- **Radii:** Nearly square “print” feel — use `--pitch-card-radius` / `--pitch-control-radius` (about `6px`), not pills for cards. The cents meter uses a **short** radius (not a capsule) so it matches the print stack.
- **Borders:** Prefer a **2px** teal-tinted border on cards and on the on-screen piano (`shared-pk-*`) so the keyboard feels materially thick.

## Background texture

- **Halftone on `.pitch-app` only:** three offset dot grids (pink, teal, violet) at **8px / 8px / 10px** registration over the shell gradient. This is the main “Riso” read; keep opacities in the same ballpark as `pitch.css` so it stays visible but not muddy.
- **`body`** stays flat `#fce7f3` so the pattern does not fight the shell.
- Under `prefers-reduced-motion: reduce`, halftone layers drop to the gradient only.
- Do not paste high-frequency noise PNGs unless they are optimized and tested at 1× DPR.

## Typography

- System / Roboto stack from `--pitch-font-body`. Display weight on `h1`; avoid decorative webfonts unless the whole app moves together.

## Favicon and labs tile

- **Favicon** (`public/icons/favicon-pitch.svg`): **Geometric mic** on a **shell-style paper gradient** (`#fff5f7` → `#fdf4ff` → `#cffafe`): **frame** `#0f766e`, **mic ink** `#115e59` (darker for contrast), **grille** `#db2777` with a thin white ring; slightly heavier strokes for 16px.
- **Labs directory** (`.app-icon.pitch` in `public/styles/index.css`): Same **three-pass** halftone + shell gradient as `.pitch-app`, softer slab shadow than cards, mic emoji centered.

## Accessibility

- Maintain `:focus-visible` rings (`--md-focus`); never remove focus styles for aesthetic reasons.
- Respect `prefers-reduced-motion` if adding any new motion (current shell is essentially static).

## Anti-patterns

- Multiple competing themes on `documentElement`.
- Rose-tinted **card** gradients that fight white “paper” panels.
- Pill-shaped meters with heavy inner glow on this layout.
- Thin 1px-only piano borders on the reference keyboard.

When in doubt, match the existing `pitch.css` after reading this file and run visual checks under `/pitch/` and the labs index tile.
