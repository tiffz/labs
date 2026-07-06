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

## Enforcement

- `npm run check:chrome-ui` — contract files + reference app import (presubmit).
- Agents: [`.cursor/rules/shared-ui-first.mdc`](../.cursor/rules/shared-ui-first.mdc) + “no new app-local shadow” policy.

## Rollout order (suggested)

1. **Words** — reference migration ✅
2. **Drums** — playback bar, rhythm presets, metronome tokens ✅
3. **Chords** — chrome import + settings popover a11y ✅
4. **Stanza** — chrome import (tokens in `stanza.css` opportunistically)
5. **Piano / Midi / Scales** — chrome import + `--labs-popover-*` on `:root`
6. **Encore** — chrome import + `--labs-popover-*` on `.encore-app-shell`; MUI Menu/Popover/Tooltip theme overrides; hover cards use shared shell tokens ✅
   - Opportunistic: raw `Popover` surfaces → `AnchoredPopover` or `labs-popover-surface` (queue chip, notes, MRT columns ✅)
7. Remaining apps opportunistically
