# Chrome UI contract (Labs)

How Labs keeps **dropdowns, buttons, hovers, and shadows** aligned across micro-apps without whack-a-mole CSS fixes.

**Reference app:** [Words in Rhythm](../src/words/README.md) — first full migration; copy its patterns when touching another app.

**Related:** [`src/shared/SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md), [`STYLE_GUIDE.md`](../STYLE_GUIDE.md), [`docs/SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md), [`docs/FOCUS_THEMING.md`](FOCUS_THEMING.md), `/ui/` catalog.

## Problem

Each app historically styled MUI popovers and local buttons with app-specific `box-shadow`, `transition`, and `:hover` rules. The result: the same “settings menu” feels different in every rail, sometimes within one screen.

## Architecture (three layers)

| Layer                     | Owns                                                       | Apps may…                                                     |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| **1 — Chrome primitives** | Structure, shadow, radius, hover timing, **focus rings**   | Import and use class names                                    |
| **2 — Semantic tokens**   | `--labs-popover-*`, `--labs-control-*`, `--theme-shadow-*` | Remap brand tint on `:root` or app shell                      |
| **3 — Layout modifiers**  | Width, padding, grid, positioning                          | Keep app-specific classes (e.g. `.words-dropdown-generation`) |

**Rule:** Popover **shell** chrome (border, shadow, radius, backdrop) lives only on `.labs-popover-surface` (via `AnchoredPopover` or explicit class). Component classes (`shared-bpm-dropdown`, `shared-key-dropdown`, `__menu`, etc.) are **layout and interior only** — no duplicate `box-shadow` / `border` on the same Paper.

**Interior selection:** toggles, chips, and preset rows inside popovers use **secondary selection** tokens (`--labs-selection-secondary-*`), not solid primary fill. See [`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md).

Apps must not add new raw `box-shadow` / hover `transform` for chrome controls. Extend tokens or open a PR to the shared contract.

## Chrome primitives (use these first)

| Primitive                  | Class / component                                                                           | When                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Popover / dropdown surface | `.labs-popover-surface` + [`AnchoredPopover`](../src/shared/components/AnchoredPopover.tsx) | Any floating panel anchored to a button — **disables MUI grey elevation** |
| Secondary pill button      | `.labs-btn`                                                                                 | Default toolbar / header actions                                          |
| Primary CTA                | `.labs-btn.labs-btn--primary`                                                               | One main action per region                                                |
| Ghost / menu row           | `.labs-btn.labs-btn--ghost`                                                                 | Options inside popovers                                                   |
| Icon control               | `.labs-btn.labs-btn--icon`                                                                  | Gear, randomize, metronome toggles (when not a dedicated shared control)  |
| BPM / key / style          | `BpmInput`, `PlaybackFieldSelect*`, `ChordStyleInput`                                       | Playback rails — already shared                                           |
| Volume / mix               | `AppLinearVolumeSlider`, `PlaybackVolumeRow`                                                | Settings panels                                                           |
| Export                     | `SharedExportPopover`                                                                       | Download / export flows                                                   |

New chrome → add to [`labsChrome.css`](../src/shared/styles/labsChrome.css) + `/ui` demo before shipping in an app.

## Token families

Defined in [`appSharedThemes.css`](../src/shared/components/music/appSharedThemes.css):

```text
--theme-shadow-sm | md | lg | popover
--labs-popover-border | radius | bg | shadow | backdrop
--labs-control-transition | hover-translate | hover-shadow | focus-ring | focus-ring-inset | focus-ring-bleed
--labs-btn-* (optional per-app brand mapping)
```

Apps remap **brand tint only**, e.g. Words:

```css
.words-page {
  --labs-popover-shadow: 0 8px 16px rgba(2, 132, 199, 0.12);
  --labs-control-hover-shadow: 0 6px 12px rgba(10, 138, 143, 0.22);
}
```

## Migration checklist (per app)

1. Import `appSharedThemes.css` then `labsChrome.css` in `main.tsx` (Words already imports themes).
2. Add `labs-popover-surface` to every dropdown / menu surface (or use `AnchoredPopover`, which applies it automatically).
3. Delete duplicate `border` / `box-shadow` / `backdrop-filter` from app menu classes — keep layout only (width, position, padding).
4. Point legacy app tokens (`--words-dropdown-surface-shadow`, etc.) at `--labs-popover-*` aliases until callers are removed.
5. Wire button hovers through `--labs-control-*` tokens (or adopt `.labs-btn` on new/edited controls).
6. Map `--theme-focus-ring` on app shell; portaled pickers duplicate on dropdown class. See [`FOCUS_THEMING.md`](FOCUS_THEMING.md).
7. Document app shell token overrides in app `DESIGN.md` or README.

## Chrome profiles

Apps remap **brand tint only** on their shell class. Pick a **profile** so structure stays shared while mood stays app-specific:

| Profile      | Popover shadow                                               | Use when                                                                     |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **standard** | `--labs-popover-shadow` (default from `appSharedThemes.css`) | Words, Stanza, Encore, Piano, most playback apps                             |
| **flat**     | `--labs-popover-shadow: none` + inset hairline border        | Gesture Linen, Muscle, Zinebox (no drop shadows on chrome per app DESIGN.md) |

Example flat profile (Gesture):

```css
.gesture-app {
  --labs-popover-shadow: none;
  --labs-popover-border: 1px solid var(--gesture-border, rgba(47, 51, 44, 0.12));
  --labs-popover-bg: var(--gesture-card-bg, #f7f5f1);
  --labs-popover-radius: var(--gesture-radius-md, 12px);
  --theme-focus-ring: 0 0 0 2px
    color-mix(in srgb, var(--gesture-accent) 35%, transparent);
}
```

## Interaction pattern matrix

Pick the **smallest** pattern that fits — do not portaled-popover a multi-control editor in a scrolling rail.

| UI need                             | Pattern                                                                                                                    | Example                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Compact picker (≤12 options)        | [`AnchoredPopover`](../src/shared/components/AnchoredPopover.tsx) + `playbackFieldSelectPopoverSlotProps` / dropdown class | BPM, sound, style, preset menu                                             |
| Multi-control editor in scroll rail | **Inline disclosure** (Edit/Done), no portal                                                                               | Stanza drum pattern ([`PRACTICE_RAIL.md`](../src/stanza/PRACTICE_RAIL.md)) |
| Never                               | Custom MUI `Popover` + `pointer-events: none` on modal root                                                                | —                                                                          |
| Never                               | Portaled paper with full app shell class (e.g. `.stanza-app`)                                                              | Blanks viewport — use portal-safe token mirror on dropdown root class only |

## Portal-safe checklist

Portaled pickers render under `document.body` and **cannot** inherit app shell tokens.

1. Add dropdown root class on portaled paper (e.g. `.stanza-bpm-dropdown`, `.shared-playback-field-select-popover`).
2. Duplicate on that class: `--labs-popover-*`, `--labs-selection-secondary-*`, focus ring tokens, and any `--bpm-*` / `--key-*` bridges the picker reads.
3. Trigger + portaled menu must share the same `appearance="stanza|words|…"`.
4. Use `usePopoverScrollAnchorSync` + `popoverAnchorEl()` when anchor lives inside nested scroll regions.

See [`SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md) § Portaled playback pickers.

## Per-app migration exit criteria

An app is **chrome-complete** when:

- [ ] `main.tsx` imports `appSharedThemes.css` then `labsChrome.css`
- [ ] App shell remaps `--labs-popover-*` (standard or flat profile)
- [ ] Floating menus use `AnchoredPopover` or `.labs-popover-surface` (no raw MUI grey elevation)
- [ ] App menu CSS is layout-only (no duplicate shell `box-shadow` / `border` on dropdown papers)
- [ ] Portaled pickers have token mirror block on root class
- [ ] `DESIGN.md` or README documents chrome profile + overrides
- [ ] App listed in `scripts/check-chrome-ui-contract.mjs`

## Enforcement

- `npm run check:chrome-ui` — contract files + reference app import (presubmit).
- Agents: [`.cursor/rules/shared-ui-first.mdc`](../.cursor/rules/shared-ui-first.mdc) + “no new app-local shadow” policy.

## Rollout order (suggested)

| App        | Profile  | Status       |
| ---------- | -------- | ------------ |
| Words      | standard | ✅ reference |
| Drums      | standard | ✅           |
| Chords     | standard | ✅           |
| Encore     | standard | ✅           |
| Stanza     | standard | ✅           |
| Piano      | standard | ✅           |
| Midi       | standard | ✅           |
| Scales     | standard | ✅           |
| Pitch      | standard | ✅           |
| UI catalog | standard | ✅           |
| Melodia    | standard | ✅           |
| Gesture    | flat     | ✅           |
| Muscle     | flat     | ✅           |
| Zinebox    | flat     | ✅           |
| Sight      | flat     | ✅           |
| Count      | standard | ✅           |
| Cats       | standard | ✅           |
| Agility    | standard | ✅           |
| Corp       | standard | ✅           |
| Forms      | standard | ✅           |
| Story      | standard | ✅           |
| Zines      | standard | ✅           |

Legacy list (same order):

1. **Words** — reference migration ✅
2. **Drums** — playback bar, rhythm presets, metronome tokens ✅
3. **Chords** — chrome import + settings popover a11y ✅
4. **Stanza** — chrome import + portaled BPM/key mirrors ✅
5. **Piano / Midi / Scales** — chrome import + `--labs-popover-*` on shell
6. **Encore** — chrome import + `--labs-popover-*` on `.encore-app-shell` ✅
7. **Remaining apps** — chrome import + profile tokens + `AnchoredPopover` where floating UI exists
