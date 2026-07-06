# Menu and disclosure accessibility

Keyboard and focus patterns for Labs dropdowns, popovers, and settings panels. Canonical human detail: [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § Focus and motion. **Focus ring theming (tokens, inset vs outset, app shells):** [`FOCUS_THEMING.md`](FOCUS_THEMING.md).

**Enforcement:** `.cursor/rules/react-a11y.mdc` · `eslint-plugin-jsx-a11y` · `npm run check:menu-a11y`

## Triggers (buttons that open menus)

Every menu trigger must expose:

- `aria-haspopup="menu"` (or `"dialog"` for large settings panels)
- `aria-expanded={open}`
- `aria-controls={menuId}` pointing at the menu surface

Use [`useLabsDisclosureMenu`](../src/shared/a11y/useLabsDisclosureMenu.ts) for ids + trigger props.

## Menu surfaces

| Type                                                                  | Pattern                                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Option list** (randomize mode, export format)                       | `role="menu"` on list; items as `role="menuitem"` / `menuitemradio`; arrow keys via `handleMenuListKeyDown`                          |
| **Settings panel** (generation, sound)                                | `id` from disclosure hook; `useFocusMenuOnOpen` on open; labelled header (`aria-labelledby` or visible `<strong>`)                   |
| **Shared pickers** (`BpmInput`, `KeyInput`, `PlaybackSoundSelect`, …) | `AnchoredPopover` with **default MUI focus management** — do not set `disableEnforceFocus` / `disableRestoreFocus` unless documented |

## Focus rings

**Canonical doc:** [`FOCUS_THEMING.md`](FOCUS_THEMING.md). This section covers menu-specific patterns only.

### Rules

1. **Never clip outset rings** with `overflow: hidden` on interactive wrappers (split buttons, sticky toolbars, toggle groups). Clip inner hover fills on child halves instead.
2. **Replace suppressed outlines** with `:focus-visible` rules using `--theme-focus-ring` / `--labs-control-focus-ring` / `--metro-focus-ring`.
3. **Sticky / dense toolbars** — add `--labs-focus-ring-bleed` (default `3px`) padding so outset rings fit inside the bar. See `.playback-controls-bar` in Drums.
4. **Tight panels** (metronome settings toggles, segmented controls in popovers) — use **inset** `box-shadow: inset 0 0 0 2px …` so rings stay visible even when ancestors scroll or clip.
5. **Split controls** — `MetronomeSplitControl` wraps with `.labs-focus-ring-host`; shell uses `overflow: visible`; `.labs-split-action-button__half` clips rounded corners.

### Shared utilities (`labsChrome.css`)

| Class / token             | Use                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `--labs-focus-ring-bleed` | Extra padding inside sticky toolbars (default `3px` on `:root`)                    |
| `.labs-focus-ring-host`   | Inline wrapper: visible overflow + bleed padding with compensating negative margin |
| `.labs-btn:focus-visible` | Standard pill button ring via `--labs-control-focus-ring`                          |

### Split action button pattern

```text
.labs-split-action-button          overflow: visible  (focus ring paints outside)
  .labs-split-action-button__half  overflow: hidden + corner radius (clips hover fill)
    button
```

### Metronome-specific

| Surface                | Focus pattern                                                            |
| ---------------------- | ------------------------------------------------------------------------ |
| Split button (toolbar) | Outset `--metro-focus-ring` on `:focus-within` + `.labs-focus-ring-host` |
| Settings toggles       | Inset ring on `:focus-visible` (not clipped by popover)                  |
| Popover shell          | `overflow: visible` on `.labs-metronome-settings-popover`                |

## On open / close

1. **Open:** focus first focusable control inside the menu (`useFocusMenuOnOpen` or MUI Popover auto-focus).
2. **Close (Escape or dismiss):** return focus to the trigger (`returnFocusToTrigger` or MUI restore focus).
3. **Tab:** while open, tab order stays inside the menu (MUI enforce focus) or follows natural DOM order for in-page panels.

## Reference implementation

**Words in Rhythm** — sticky randomize split button, generation/sound panels, `WordsRandomizeMenuPopover`.

**Metronome** — `MetronomeSplitControl` + `metronome-control.css` (split shell + settings panel toggles).

## Audit checklist (new sticky bar or split control)

- [ ] Toolbar / rail has `overflow: visible` and bleed padding if it contains split buttons or icon triggers
- [ ] Split shell does not use `overflow: hidden` (use `__half` children instead)
- [ ] Popover / panel toggles use inset focus or verified visible outset ring
- [ ] No bare `outline: none` without `:focus-visible` replacement
