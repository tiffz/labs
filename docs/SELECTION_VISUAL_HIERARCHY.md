# Selection & visual hierarchy (Labs)

How Labs expresses **what is selected**, **what is primary**, and **what is secondary** so every app reads with the same design language.

**Related:** [`docs/CHROME_UI_CONTRACT.md`](CHROME_UI_CONTRACT.md), [`STYLE_GUIDE.md`](../STYLE_GUIDE.md) § Action color tones, [`docs/UX_AGENT_GUIDE.md`](UX_AGENT_GUIDE.md), [`src/shared/SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md), [`src/shared/components/music/THEMING_DECISIONS.md`](../src/shared/components/music/THEMING_DECISIONS.md).

## Core idea

Users should instantly see **three tiers** without reading labels:

| Tier                    | Role                                                           | Typical surfaces                                                                                          | Visual weight                               |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Primary selection**   | The main on-state or committed choice for the **current task** | Metronome **on**, play/transport active, one contained CTA, primary tab underline                         | Solid brand fill or strong contained button |
| **Secondary selection** | A chosen **option inside** a panel, popover, or chip row       | Metronome settings toggles, BPM/key/style preset chips, filter chips, MUI `ToggleButtonGroup` in settings | Tinted wash + brand text (no solid fill)    |
| **Tertiary / idle**     | Available but not selected                                     | Unselected chips, ghost buttons, menu rows                                                                | Neutral border/surface; hover wash only     |

**Rule:** Popovers and “advanced settings” panels almost always use **secondary selection** for toggles and chips. Reserve **primary selection** for the control that **summarizes** the panel (e.g. metronome split button when audio is on) or the **one** main action in that viewport.

## Shared tokens

Defined on `:root` in [`appSharedThemes.css`](../src/shared/components/music/appSharedThemes.css):

```text
--labs-selection-primary-bg | -fg | -hover-bg
--labs-selection-secondary-bg | -fg | -border | -hover-bg
--labs-selection-secondary-weight   (default 600)
```

Apps remap **brand tint only** (same as `--theme-primary`). Do not add per-toggle hex in app CSS.

**Bridge pattern** — component families alias the tier they need:

| Component / family                              | Selected state token bridge                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metronome settings toggles                      | `--metro-toggle-selected-*` derived from **`--metro-accent`** on appearance wrapper (portal-safe; do not use `:root` `--labs-selection-secondary-*`) |
| BPM / key / style preset chips                  | `--bpm-chip-active-*`, `--key-chip-active-*`, `--cp-chip-active-*`, `--cs-chip-active-*` → secondary (already tinted)                                |
| Metronome split **on**                          | `--metro-primary-active-bg` → primary (solid)                                                                                                        |
| MUI contained CTA                               | `variant="contained"` + `color="primary"`                                                                                                            |
| Drums / Encore floating menu chips `.is-active` | secondary tint (match chip-active)                                                                                                                   |
| Drum pattern edit menu `.preset-btn.active`     | `--labs-selection-secondary-*` on `.drum-pattern-edit-menu` (portaled; Stanza mirrors rose)                                                          |

## Inventory (current patterns)

| Pattern                                        | Location                                             | Tier                                      | Notes                          |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- | ------------------------------ |
| `.labs-btn--primary`                           | `labsChrome.css`                                     | Primary CTA                               | One loud commit per region     |
| Metronome split primary segment `.active`      | `metronome-control.css`, `--metro-primary-active-*`  | Primary                                   | Transport on-state             |
| Metronome settings `ToggleButtonGroup`         | `metronome-control.css`, `--metro-toggle-selected-*` | **Secondary**                             | Advanced settings popover      |
| `--bpm-chip-active-*`                          | `bpmInput.css`, app themes                           | Secondary                                 | Preset / tempo chips           |
| `--key-chip-active-*`                          | `keyInput.css`, app themes                           | Secondary                                 | Key grid selection             |
| `--cp-chip-active-*` / `--cs-chip-active-*`    | chord inputs                                         | Secondary                                 | Progression / style presets    |
| `drums-floating-menu__chip.is-active`          | `drums.css`                                          | Secondary                                 | Menus match BPM chips          |
| `.drum-pattern-edit-menu … .preset-btn.active` | `drumAccompaniment.css` (+ Stanza portal mirror)     | Secondary                                 | Edit dropdown presets          |
| Encore `--bpm-chip-active-*`                   | `encore.css`                                         | Secondary                                 | Repertoire pickers             |
| Stanza playback chips / rose tint              | `stanza.css`                                         | Secondary                                 | Brand via tint, not solid fill |
| MUI `ToggleButton` default (solid purple)      | **Avoid** in settings panels                         | Was primary — migrate to secondary tokens |

When touching a row marked **Avoid** or **Exception**, prefer migrating to `--labs-selection-secondary-*` unless the control is truly a primary transport state.

## Other hierarchy principles (encode alongside selection)

These came from the same class of UX feedback (metronome menus, Encore tables, Drums playback bar):

1. **Popover = secondary chrome** — Shell from `.labs-popover-surface`; **interior** controls use secondary selection and quiet section labels (`CHROME_UI_CONTRACT`).
2. **One primary action per viewport** — Already in `UX_AGENT_GUIDE`; do not stack multiple contained brand buttons above the fold.
3. **Semantic button color ≠ brand color** — `STYLE_GUIDE` § Action color tones; green/red/orange are for state, not “Spotify is green so Sync is green.”
4. **List chrome vs data** — When a screen is mostly a table or master–detail list, **compact header** tokens (`encoreListPagePaddingTop`, `encoreListPageHeaderMb`) so rows get vertical space; filters stay `flexShrink: 0`, data region `flex: 1; minHeight: 0`.
5. **Single scroll owner** — Nested `overflow: auto` fights virtualization (blank MRT rows). Shell `overflow: hidden` + one bounded scroll container for the grid (`encore-main-list-scroll` pattern).
6. **One focus language** — `--labs-control-focus-ring` / `--labs-control-focus-ring-inset` / `--metro-focus-ring`; no second inset ring on the same control; avoid `overflow: hidden` clipping focus rings on toggle groups. Full guide: [`FOCUS_THEMING.md`](FOCUS_THEMING.md).
7. **Parallel surfaces → parallel tiers** — If two chip rows solve the same problem (BPM presets vs rhythm preset chips), they must use the same secondary selection tokens, not one solid and one tint.

## Agent checklist (new or edited selection UI)

- [ ] Classify control: **primary transport**, **secondary option**, or **tertiary idle**.
- [ ] Settings / popover / preset grid → `--labs-selection-secondary-*` (or family chip-active bridge).
- [ ] Map app brand once on shell `:root`; no literal `#7c3aed` on selected states in app CSS.
- [ ] Focus ring uses shared token; toggle group does not clip rings ([`FOCUS_THEMING.md`](FOCUS_THEMING.md))
- [ ] Document app-specific tint overrides in app `DESIGN.md` (one bullet, link here).

## Migration notes

- **Metronome:** `--metro-toggle-selected-*` defaults from **`--metro-accent`** on `.labs-metronome-*--{appearance}` (portaled popovers do not inherit app shell `--theme-primary`). App shells should still map `--theme-primary` for in-page shared controls. Per-app `--metro-accent` lives in `metronome-themes.css`.
- **Chips:** Existing `--*-chip-active-*` already match secondary; align naming in new components to `--labs-selection-secondary-*` or document alias in `THEMING_DECISIONS.md`.
- **New shared control:** Add appearance class + token bridge row to this doc’s inventory table in the same PR.
