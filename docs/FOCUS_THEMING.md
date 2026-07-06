# Focus theming (Labs)

How Labs keeps **keyboard focus rings** consistent with app brand tint, shared chrome, and selection tiers — without clipped outlines or one-off purple rings in every app.

**Related:** [`CHROME_UI_CONTRACT.md`](CHROME_UI_CONTRACT.md) · [`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md) · [`A11Y_MENU_PATTERNS.md`](A11Y_MENU_PATTERNS.md) (menu open/close + split controls) · [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § Focus and motion · [`THEMING_DECISIONS.md`](../src/shared/components/music/THEMING_DECISIONS.md)

## Core idea

Focus styling is **part of the theme**, not a per-component afterthought:

1. **One token family** — apps remap brand once on the shell; shared controls bridge to component tokens.
2. **Two ring modes** — **outset** (toolbar buttons, split controls) vs **inset** (dense popover toggles, segmented chips inside clipped panels).
3. **Never clip** — sticky bars and split shells use `overflow: visible` + `--labs-focus-ring-bleed`; clip hover fills on inner halves instead.
4. **Never bare `outline: none`** — always pair suppression with a `:focus-visible` replacement using theme tokens.

## Token families

Defined in [`appSharedThemes.css`](../src/shared/components/music/appSharedThemes.css) on `:root`; apps override on shell (`.words-page`, `.stanza-app`, `.encore-app-shell`, …):

```text
--theme-focus-ring                    /* App-level default (box-shadow value) */
--labs-control-focus-ring             /* Outset ring — .labs-btn, ghost links */
--labs-control-focus-ring-inset-color /* Brand tint for inset ring (default: --theme-primary) */
--labs-control-focus-ring-inset       /* Inset box-shadow for popover toggles */
--labs-focus-ring-bleed               /* Extra padding inside sticky toolbars (default 3px) */
```

**Component bridges** (alias the semantic tokens; do not hard-code rgba in app CSS):

| Family                     | Focus tokens                                         | Pattern                                             |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `.labs-btn`                | `--labs-control-focus-ring`                          | Outset on `:focus-visible`                          |
| `BpmInput` shell           | `--bpm-focus`, `--bpm-focus-ring`                    | Inset on `:focus-within`                            |
| `KeyInput`                 | `--key-focus`, `--key-focus-ring`                    | Outset on buttons; shell `:focus-within`            |
| `PlaybackFieldSelect`      | `--pfs-focus-border`, `--pfs-focus-ring`             | Outset on trigger                                   |
| Chord inputs               | `--cp-focus-ring`, `--cs-focus-ring`                 | Match shell focus                                   |
| Metronome split            | `--metro-focus-ring`, `--metro-focus-ring-active`    | Outset on `:focus-within` + `.labs-focus-ring-host` |
| Metronome settings toggles | `--labs-control-focus-ring-inset` + `--metro-accent` | Inset on `:focus-visible`                           |

## Ring modes (when to use which)

| Mode                      | Use when                                                                                         | Implementation                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Outset**                | Toolbar icon buttons, split controls, standalone triggers, library cards                         | `box-shadow: var(--labs-control-focus-ring)` or family `--*-focus-ring` |
| **Inset**                 | Toggle rows inside popovers, BPM shell `:focus-within`, segmented chips in scroll/clipped panels | `box-shadow: var(--labs-control-focus-ring-inset)`                      |
| **Shell `:focus-within`** | Composite inputs (BPM stepper, key shell) where inner buttons suppress their own ring            | Border + inset ring on the shell only                                   |

**Rule:** Do not stack outset and inset rings on the **same** control. Inner buttons inside a `:focus-within` shell should set `box-shadow: none` on `:focus-visible` (see `bpmInput.css`).

## Shared utilities (`labsChrome.css`)

| Class / utility                    | Use                                                              |
| ---------------------------------- | ---------------------------------------------------------------- |
| `.labs-btn:focus-visible`          | Standard pill / ghost button                                     |
| `.labs-focus-ring-host`            | Wrapper for split controls — bleed padding + `overflow: visible` |
| `.labs-focus-inset:focus-visible`  | Opt-in inset ring on custom controls                             |
| `.labs-focus-outset:focus-visible` | Opt-in outset ring on custom controls                            |

Split action pattern (canonical):

```text
.labs-focus-ring-host              padding bleed + overflow visible
  .labs-split-action-button        overflow visible (never hidden)
    .labs-split-action-button__half  overflow hidden — clips hover fill only
      button
```

## App shell strategy

Every app that imports `appSharedThemes.css` + `labsChrome.css` should map **focus once** on its shell:

```css
.my-app-shell {
  --theme-primary: …;
  --theme-focus-ring: 0 0 0 2px
    color-mix(in srgb, var(--theme-primary) 14%, transparent);
  /* --labs-control-focus-ring and --labs-control-focus-ring-inset derive automatically */
}
```

| App                                | Shell selector      | Focus notes                                                                      |
| ---------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| **Words**                          | `.words-page`       | Teal focus; randomize split uses `.labs-focus-ring-host`                         |
| **Drums**                          | `.drums-app`        | Playback bar bleed + visible overflow; metronome `appearance="drums"`            |
| **Stanza**                         | `.stanza-app`       | `--stanza-focus-ring-rose` → `--labs-control-focus-ring`; playback toolbar bleed |
| **Encore**                         | `.encore-app-shell` | MUI theme + repertoire picker tokens                                             |
| **Chords / Piano / Midi / Scales** | app root class      | Map `--theme-focus-ring` on `:root` / shell                                      |

### Portaled surfaces

Popovers, BPM/key dropdowns, and metronome settings render **outside** the app shell. Duplicate brand + focus tokens on the **portal root class** (e.g. `.stanza-bpm-dropdown`, `.labs-metronome-settings-popover--stanza`), not on `:root`. Same rule as selection tiers — see [`SELECTION_VISUAL_HIERARCHY.md`](SELECTION_VISUAL_HIERARCHY.md).

## Sticky toolbar checklist

When adding or editing a playback bar, practice rail, or sticky header with icon buttons:

- [ ] Toolbar wrapper: `overflow: visible`
- [ ] Padding: `calc(base + var(--labs-focus-ring-bleed, 3px))` on the axis that clips rings
- [ ] Split / metronome controls wrapped in `.labs-focus-ring-host`
- [ ] No `overflow: hidden` on `.labs-split-action-button` or settings popover shell
- [ ] Popover interior toggles use **inset** ring

## Shared component inventory

| Component                        | Focus handled in                                  | Status                    |
| -------------------------------- | ------------------------------------------------- | ------------------------- |
| `AnchoredPopover`                | MUI focus trap (do not disable)                   | ✅                        |
| `BpmInput`                       | `bpmInput.css` — shell `:focus-within`            | ✅                        |
| `KeyInput`                       | `keyInput.css` — `--key-focus-ring`               | ✅                        |
| `PlaybackFieldSelect`            | `playbackFieldSelect.css` — `--pfs-focus-ring`    | ✅                        |
| `MetronomeSplitControl`          | `metronome-control.css` + `.labs-focus-ring-host` | ✅                        |
| `MetronomeAdvancedSettingsPanel` | Inset toggles in `metronome-control.css`          | ✅                        |
| `.labs-btn`                      | `labsChrome.css`                                  | ✅                        |
| MUI overrides in apps            | App CSS — use shell tokens, not raw hex           | Migrate opportunistically |

## Agent checklist (new or edited interactive UI)

- [ ] Classify ring mode: outset, inset, or shell `:focus-within`
- [ ] Map `--theme-focus-ring` on app shell (or portal root class if portaled)
- [ ] Use shared utility or family token — no new `rgba(124, 58, 237, …)` focus colors
- [ ] Verify keyboard tab through control — ring visible, not clipped
- [ ] Sticky bar / split control: bleed padding + `overflow: visible`
- [ ] Document app-specific focus override in app `AGENTS.md` or `DESIGN.md` (one bullet)

## Enforcement

- `npm run check:chrome-ui` — focus tokens present in `appSharedThemes.css` + utilities in `labsChrome.css`
- `npm run check:menu-a11y` — split control overflow + `.labs-focus-ring-host` on metronome
- ESLint `jsx-a11y` + rule `react-a11y.mdc`
- Agents: `.cursor/rules/focus-theming.mdc`

## Migration notes

- Legacy app CSS with hand-rolled `outline: 2px solid #e848a0` → alias `--labs-control-focus-ring` or app `--theme-focus-ring`
- MUI `IconButton` in app code: prefer shared primitives; when overriding, use `:focus-visible` + shell token
- Piano solid primary key chips: separate from focus — see selection doc
