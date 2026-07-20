---
paths:
  - '**/*metronome*'
  - '**/*chip*'
  - '**/bpmInput.css'
  - '**/keyInput.css'
  - '**/chordProgressionInput.css'
  - '**/chordStyleInput.css'
  - '**/metronome-*.css'
  - '**/labsChrome.css'
  - '**/appSharedThemes.css'
---

<!-- AUTO-GENERATED from .cursor/rules/selection-visual-hierarchy.mdc — do not edit directly. Edit the source and run `npm run generate:claude-guidance`. -->

> Primary vs secondary selection styling for toggles, chips, and popover interiors

# Selection visual hierarchy

Read [`docs/SELECTION_VISUAL_HIERARCHY.md`](../../docs/SELECTION_VISUAL_HIERARCHY.md) before editing selected-state styling.

## Rules

1. **Settings popovers / advanced panels** — toggles and chips use **secondary** selection: `--labs-selection-secondary-*` (tint + brand text). Never solid `--theme-primary` fill on MUI `ToggleButtonGroup` in metronome settings.
2. **Transport / main on-state** — metronome split **primary** segment when audio is on, play active, one contained CTA → **primary** selection (`--labs-selection-primary-*` / `--metro-primary-active-*`).
3. **Preset chips** — `--bpm-chip-active-*`, `--key-chip-active-*`, `--cp-chip-active-*` are secondary tier; keep parallel to floating menu `.is-active` chips.
4. **Brand once** — map `--theme-primary` on shell `:root`; component bridges alias tiers. No new per-app `#7c3aed` on selected toggles.
5. **Portaled metronome** — appearance class sets `--metro-accent`; toggles derive from accent, not `:root` `--labs-selection-secondary-*`.
6. **Focus** — one ring language per [`docs/FOCUS_THEMING.md`](../../docs/FOCUS_THEMING.md); do not clip rings with `overflow: hidden` on toggle groups.

## Checklist

- [ ] Classified control tier (primary / secondary / idle)
- [ ] Popover interior ≠ primary solid fill
- [ ] Inventory row updated in `SELECTION_VISUAL_HIERARCHY.md` if adding a new selection pattern
