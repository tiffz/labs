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

Viewport-locked split: **35% workout panel** (scrollable) + **65% 3D canvas** (fixed). Mobile stacks canvas first; workout panel is a bottom drawer toggled from the canvas corner.

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
