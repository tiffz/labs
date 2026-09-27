# Maqam Playground — design

Citrus, chosen from a preview gallery of ten and folded into
[`maqam.css`](maqam.css). The gallery, its seeds and the switcher are deleted:
this file is now the only description of the look.

## Palette

Cream ground, deep-green structure, burnt-orange accent.

| Role                            | Value     | Job                            |
| ------------------------------- | --------- | ------------------------------ |
| `--m3-surface`                  | `#fffbe8` | the page                       |
| `--m3-surface-container-lowest` | `#fffef9` | cards — staff, maqam, keyboard |
| `--m3-on-surface`               | `#1d2b1f` | ink                            |
| `--m3-on-surface-variant`       | `#5c6557` | supporting text                |
| `--m3-outline-variant`          | `#cdcdbc` | the 1px card edge              |
| `--m3-primary`                  | `#b4400c` | **the accent**                 |
| `--m3-secondary`                | `#1f5f3f` | structure: black keys, jins 1  |
| `--m3-tertiary`                 | `#8a6d00` | a control that is _on_         |

**The accent has three jobs and no others**: the note that is sounding, the
note that is home, and the Play button. Nothing is coloured for decoration —
not the jins rules, not the Arabic name, not the bracket labels, not the degree
numerals above 1. Eleven palettes were rejected before this one, and the thing
that fixed it was not a hue, it was spending colour on meaning only.

`--maqam-jins-1..3` are the per-cell colours. A jins is the same colour in its
chip, its bracket and its notes; that identity is the whole interaction.

## Shape and type

Citrus is the round one: `4 / 8 / 14 / 20 / 28`. Cards at `--maqam-radius-l`,
controls at `--maqam-radius-s`, chips and Play at `--maqam-radius-pill`.

Type is the M3 scale by role (`--m3-headline-small` … `--m3-label-small`), so a
size is chosen by what the text _is_. Do not pick a rem value at a call site.

## Three cards, one idiom

Staff, maqam, keyboard: white fill, 1px `--m3-outline-variant`, radius 16, **no
shadow**. Depth is the edge, not elevation.

The keyboard's history is worth keeping: it had a saffron slab, then a neutral
tonal step, then a saturated stage — all rejected for outweighing the page —
and then nothing at all, which read as floating. A card is the third instance
of an idiom already on the page rather than a fourth thing.

Keys carry their own `--maqam-key-edge`, derived against what is behind them:
with no slab the silhouette is entirely that hairline, and the card-weight one
measures 1.09:1 against the page.

## Rules that are enforced, not just written

- The page is a single screen **where it fits** (`min-height: 100dvh`) and
  scrolls where it does not. `height` + `overflow: hidden` promised a screen it
  could not keep and overlapped the keyboard by 11px at 1333×693.
- `.maqam-stage` is `flex: 0 0 auto`. Letting it shrink is what spilled its
  cards over the keyboard.
- Membership on the keyboard is a **numeral**, not a tint. Three relative
  models shipped and all three were invisible on Rast, whose seven degrees are
  the seven white keys.
- Ajnas brackets are drawn **only** while a cell is pointed at, and only that
  one. See [`README.md`](README.md) § Design for why.
