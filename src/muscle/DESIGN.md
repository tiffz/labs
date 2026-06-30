# Muscle Memory — design

**Vibrant Academic:** classical academy structure with high-energy studio accents.

## Palette

| Token              | Hex       | Use                               |
| ------------------ | --------- | --------------------------------- |
| `--muscle-navy`    | `#1a2744` | Canvas background, primary chrome |
| `--muscle-cream`   | `#f5f0e8` | Workout panel, page background    |
| `--muscle-amber`   | `#d4a017` | Subcutaneous glow, accents        |
| `--muscle-lapis`   | `#2563eb` | Selection / quiz highlight        |
| `--muscle-emerald` | `#059669` | Correct rep flash                 |
| `--muscle-crimson` | `#dc2626` | Incorrect rep flash               |

## Typography

- Headers: Cormorant Garamond (`--muscle-font-serif`)
- UI controls: Roboto (`--muscle-font-ui`)

## Layout

Viewport-locked **60 / 40 split**: 3D canvas (60%) + study panel (40%, scrollable). The figure is mostly vertical, so the panel still has room for glossary and definitions without crowding the model. Mobile stacks canvas first; workout panel is a bottom drawer toggled from the canvas corner.

CSS tokens: `--muscle-canvas-split` (default `60%`), `--muscle-panel-split` (`40%`), `--muscle-panel-min` (`320px`).

## 3D interaction states

| State               | Visual                                                             |
| ------------------- | ------------------------------------------------------------------ |
| Default             | Warm muscle/bone tones                                             |
| Warmup faded        | Low-opacity wireframe context                                      |
| Hover               | White Outlines contour                                             |
| Quiz highlight      | Lapis **Outlines** + subtle emissive (keep muscle/bone base color) |
| Correct / incorrect | Emerald / crimson **Outlines** + emissive flash                    |
| Subcutaneous        | Amber Outlines on landmark bones                                   |

## Robo-Skelly

Toggle swaps organic shading for wireframe primitives to reinforce block-in volumes.
