# Shared UI Conventions

This document defines default conventions for shared UI so apps stay naturally aligned by default while still supporting app-specific identity.

## Objectives

- Shared controls should be easy to theme and hard to accidentally break.
- App teams should override tokens, not internals.
- Defaults should encode the non-load-bearing UX decisions (spacing, typography scale, state behavior, focus treatment).

## Chrome UI (dropdowns, buttons, hovers)

Cross-app **popover surfaces**, **pill buttons**, and **hover rhythm** use the shared chrome contract — not per-app `box-shadow` / `:hover` copies.

**Selection visual hierarchy** (primary vs secondary selected states for toggles, chips, transport): [`docs/SELECTION_VISUAL_HIERARCHY.md`](../../docs/SELECTION_VISUAL_HIERARCHY.md). Tokens: `--labs-selection-primary-*`, `--labs-selection-secondary-*` in `appSharedThemes.css`.

**Focus rings** (tokens, inset vs outset, sticky bar bleed, portal-safe accent): [`docs/FOCUS_THEMING.md`](../../docs/FOCUS_THEMING.md). Utilities: `.labs-focus-ring-host`, `.labs-focus-inset`, `.labs-focus-outset`, `--labs-focus-ring-bleed` in `labsChrome.css`. Menu open/close + split controls: [`docs/A11Y_MENU_PATTERNS.md`](../../docs/A11Y_MENU_PATTERNS.md).

- **Contract:** [`docs/CHROME_UI_CONTRACT.md`](../../docs/CHROME_UI_CONTRACT.md)
- **Primitives:** [`styles/labsChrome.css`](./styles/labsChrome.css) — `.labs-popover-surface`, `.labs-btn` (+ `--primary`, `--ghost`, `--icon`)
- **Tokens:** [`components/music/appSharedThemes.css`](./components/music/appSharedThemes.css) — `--labs-popover-*`, `--labs-control-*`
- **Popovers:** prefer [`AnchoredPopover`](./components/AnchoredPopover.tsx) (applies `.labs-popover-surface`, **MUI elevation 0**, and `--labs-popover-*` sx so portaled pickers match in-app div menus)
- **Reference migration:** Words — remap brand tint on `.words-page` only; layout classes stay app-local

**Do not** add new app-local menu `box-shadow` / backdrop rules. Extend the contract or open a shared primitive PR.

Enforcement: `npm run check:chrome-ui` (presubmit).

## App shell layout

Multi-panel apps (header + scrollable main + optional footer) should use [`layout/AppShellLayout.tsx`](./layout/AppShellLayout.tsx) and [`layout/app-shell-layout.css`](./layout/app-shell-layout.css). Copy [`templates/app-main.starter.tsx`](./templates/app-main.starter.tsx) and [`templates/app-layout.starter.css`](./templates/app-layout.starter.css) for new apps. See [`layout/README.md`](./layout/README.md) and Stanza [`LAYOUT.md`](../stanza/LAYOUT.md).

## Async list loading vs empty

While data is still loading (IndexedDB live query not emitted, fetch in flight, etc.), **do not** show empty-state copy (`Nothing here yet`, `None yet`). Use [`components/LabsListLoadingState.tsx`](./components/LabsListLoadingState.tsx) (spinner + “Loading …” or skeleton rows) until the source exposes a hydrated/ready signal. Empty states belong only after loading completes with zero rows.

## In-app navigation links (SPA)

Hash- and query-routed apps must behave like normal browser links: modifier+click and middle-click open a new tab, right-click can copy the URL, and keyboard users get native link affordances.

**Architecture:** [ADR 0017](../../docs/adr/0017-spa-native-link-navigation.md) — real `href`, shared click helpers, when to use `<button>`.

Shared helpers live in [`navigation/spaLinkClick.ts`](./navigation/spaLinkClick.ts):

| Helper                                      | Use when                                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `isModifiedOrNonPrimaryClick(e)`            | Branching in custom handlers                                                             |
| `handleSpaLinkClick(e, onNavigate)`         | `<a href>` or MUI `component="a"` — plain click SPA-navigates; modifiers use the browser |
| `handleSpaRowActivate(e, href, onNavigate)` | Table/card row click — modifiers open `href` in a new tab                                |
| `openAppLinkInBackgroundTab(href)`          | Programmatic new-tab open (e.g. middle-click on a row)                                   |

**Pattern**

1. Always set a real **`href`** (hash route, query param, or path) that fully identifies the destination.
2. On **`click`**, call `handleSpaLinkClick` (or `handleSpaRowActivate` for whole-row targets) so a plain click does not reload the page.
3. Do **not** call `preventDefault()` before checking modifiers — that blocks Shift/Ctrl/Meta+click.
4. Prefer `<a>` / MUI `component="a"` over `<button onClick={navigate}>` for destinations that have a URL.
5. External URLs: keep `target="_blank"` and `rel="noopener noreferrer"`.

App-specific href builders: Encore [`encoreAppHref`](../encore/routes/encoreAppHash.ts), Stanza [`stanzaSongHref`](../stanza/utils/stanzaDriveUrlParams.ts) + [`resolveStanzaPlaybackUrlParamsForSong`](../stanza/import/beatLibraryImport.ts), Zine Box [`zineboxReadHref`](../zinebox/routes/zineboxHash.ts), Muscle [`muscleModuleHref`](../muscle/routes/muscleAppUrl.ts), Drums [`drumsRhythmHref`](../drums/routes/drumsAppUrl.ts).

## Theme Contract (Default)

All music apps and `/ui` should publish the same semantic contract, then map app identity into these variables:

- **Brand + text**
  - `--theme-primary`, `--theme-primary-hover`, `--theme-accent`
  - `--theme-text`, `--theme-text-secondary`, `--theme-text-muted`
- **Surfaces**
  - `--theme-bg`, `--theme-surface`, `--theme-surface-elevated`
  - `--theme-border`, `--theme-border-strong`, `--theme-focus-ring`
- **Elevation + shape**
  - `--theme-shadow-sm`, `--theme-shadow-md`, `--theme-shadow-lg`
  - `--theme-radius-sm`, `--theme-radius-md`, `--theme-radius-lg`

Legacy app tokens (`--primary`, `--piano-primary`, `--accent-primary`, etc.) can remain, but should alias into the semantic contract during migration.

### Theming bridge (CSS tokens ↔ MUI `getAppTheme()`)

Labs runs two theming stacks: CSS `--theme-*` tokens (shared controls, app chrome) and MUI themes from [`getAppTheme()`](ui/theme/appTheme.ts) (dialogs, menus, MUI-based apps). MUI cannot consume CSS vars in palette augmentation, so `appTheme.ts` mirrors each app's palette as concrete hex values.

Rules:

- **Change both sides together.** A palette change edits the app's `--theme-*` CSS block **and** its `appTheme.ts` entry in the same PR.
- **Partial overrides are banned.** An app overriding `--theme-primary` must override the full core set — enforced by `npm run check:shared-theme-contract`.
- **Divergent stacks are registered.** Apps whose primary theming intentionally diverges (Gesture Linen, Encore/Scales MUI-first, Zinebox) are listed in `scripts/check-shared-theme-contract.mjs` with the rationale documented in the app's `DESIGN.md`/`AGENTS.md`.
- **MUI portals read `--labs-popover-*`** (see Encore's `MuiMenu`/`MuiPopover` overrides) so portaled surfaces match CSS-styled chrome without duplicating values.

## Scale Buckets (Required)

### Spacing scale

Use a 4px base grid:

- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-5: 20px`
- `--space-6: 24px`
- `--space-8: 32px`

### Typography scale

- `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`
- `--font-weight-regular`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`

### Control size buckets

Shared interactive controls should support these buckets:

- `compact`
  - input/button height target: `32px`
  - intended for dense sidebars and chip-heavy flows
- `comfortable` (default)
  - input/button height target: `38px`
  - intended for most pages and gallery defaults
- `touch`
  - input/button height target: `44px`
  - intended for touch-first flows

Bucket-specific values should be expressed via variables, not one-off per-component pixel overrides.

## Grid and Layout Conventions

- Prefer responsive grids with `minmax()` and tokenized gaps:
  - `gap: var(--space-3)` / `var(--space-4)`
  - `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` for demo cards by default
- Prefer tokenized max widths for control groups (`--control-max-width`) rather than repeating literal widths across apps.
- Avoid 1-2px local nudges unless there is a measured visual regression that cannot be solved by a bucket variable.
- **Large lists (>50 items):** window virtualizer or viewport-gated media fetch — see `docs/PERFORMANCE.md` (Gesture Collections pattern).
- **Horizontal overflow:** wide tables in `[data-labs-allow-horizontal-scroll]` hosts only — not page shells.
- **Document scroll lock:** `data-labs-scroll-lock-ok` on `html`/`body` when intentional (zen/fullscreen modes).

## Design Principles

- **Parity First**: `/ui` should mirror production component composition, not just token snapshots.
- **Wrapper-Aware Rendering**: when app styling depends on wrapper classes, gallery examples should include those wrappers.
- **Single Source Theme Ownership**: shared-control tokens should live in one owner (`appSharedThemes.css` preferred), with app CSS only for truly local layout needs.
- **Portal Safety by Default**: dropdown/popover visuals must be explicitly themed on paper/root hooks and never rely on parent inheritance.
- **Composable with Guardrails**: components should expose root + dropdown hooks and token families so app identity can vary without brittle deep selector overrides.

## Convention Layers

- **Layer 1: Shared defaults**
  - Shared components ship with complete defaults for spacing, sizing, typography, focus states, and interaction rhythm.
  - A component should look production-ready without any app overrides.

- **Layer 2: App appearance contract**
  - Components that support app profile styling expose an `appearance` prop (for example: `default`, `chords`, `piano`, `words`).
  - Appearance applies broad theme intent and should avoid app-specific one-offs.

- **Layer 3: Token overrides**
  - App code customizes via documented CSS custom properties (token families like `--cp-*`, `--cs-*`, `--key-*`, `--bpm-*`).
  - Portal content (popover/dropdown) must be themed with dropdown class hooks, not root-only selectors.

## Required Theming API for New Shared Components

- Root class for control shell.
- Class hook for portal/dropdown/popup surface.
- Token family with at least:
  - input/shell tokens,
  - focus tokens,
  - surface tokens,
  - interactive item/chip state tokens.
- Optional `appearance` prop when the component is reused across multiple app families.

## Override Rules

- Prefer tokens first.
- Use class hooks second.
- Avoid deep selector overrides unless changing layout structure.
- If deep selector override is unavoidable, document why near the override and in this file's changelog section.
- Choose one owner per app override path (`appSharedThemes.css` or app stylesheet), and avoid duplicating the same selector contract in both.

## Density and Typography Defaults

- Shared controls should default to:
  - `comfortable` density,
  - consistent line-height and click target sizing,
  - medium emphasis on selected labels and clear hierarchy for title/meta text.
- App overrides can tune density (`compact` / `comfortable` / `touch`), but should preserve legibility and interaction affordances.

## UI Gallery Requirement

- Every shared UI component should have a `/ui` gallery example that includes:
  - default state,
  - disabled or constrained state when relevant,
  - app appearance variants (if supported),
  - at least one edge-state demo (compact width, long content, or mobile viewport).

## Test Requirement

- For each shared UI component family, add at least one UI-focused integration test path.
- Appearance and dropdown class API hooks must be covered by tests.

## New Shared Component Checklist

- [ ] `/ui` gallery examples added for component states and appearance variants.
- [ ] Token family documented.
- [ ] Root and dropdown class hooks exposed.
- [ ] Size bucket behavior documented (`compact` / `comfortable` / `touch`).
- [ ] Appearance behavior documented (if applicable).
- [ ] Snapshot or integration coverage added.
- [ ] README/dev docs updated with usage notes.

## Linear volume slider (0–1)

For **mix rails and other linear 0–1 gain** controls, use `AppLinearVolumeSlider` (`src/shared/components/AppLinearVolumeSlider.tsx`) instead of raw MUI `Slider` copies. It wraps MUI with defaults (`min={0}`, `max={1}`, `step={0.02}`, `size="small"`) and **keeps vertical padding** on the Slider root so **clicks on the middle of the visible rail** still hit MUI’s input (zeroing `py` in dense layouts commonly breaks rail jumps).

`AppSlider` remains the older **legacy event-shape** helper for BPM, bias, and non-volume ranges; **do not** use it for labeled volume/mute rows.

Enforcement: `npm run check:volume-slider` (Words reference panel + shared primitives).

### Playback volume rows (`PlaybackVolumeRow`)

For **labeled mix rows with mute + 0–100 slider**, use `PlaybackVolumeRow` (`src/shared/components/music/PlaybackVolumeRow.tsx`) instead of hand-rolled `AppSlider` + icon button rows. Used in `ChordPlaybackSettingsPanel`, Words sound settings, metronome advanced settings, and Chords playback popover.

- Volume prop is **0–100** (integer-ish); internally maps to `AppLinearVolumeSlider` 0–1 gain.
- **Shared geometry** — `labsVolumeSlider.css` (imported via `labsChrome.css`) defines thumb size, rail opacity, and focus ring for `.shared-playback-volume-row` and `.labs-volume-slider`. Remap `--labs-volume-track` on the app shell or menu for brand tint.
- Theme sliders via host CSS targeting `.shared-playback-volume-row .MuiSlider-root` (see Words `word-rhythm.css`).
- Pair with `ChordPlaybackSettingsPanel` when the surface matches chart/chord playback (style, sound, drums toggle).
- URL state for shareable links: [`docs/URL_STATE_PATTERN.md`](../../docs/URL_STATE_PATTERN.md).

### Inline drum panels (`DrumAccompaniment` + profiles)

Hosts embed [`DrumAccompaniment`](components/music/DrumAccompaniment.tsx) with a **profile** from [`getInlineDrumUxProps`](components/music/inlineDrumUxDefaults.ts) — never hand-roll layout flags unless the host owns the pattern text field.

**Dense menu editing is the default** for every profile: show notation first; **Edit** (or click the staff) opens an `AnchoredPopover` with a **live notation preview**, preset chips (secondary selection), **variation prev/next** when the active preset has multiple variations, and the pattern field. Pass `readOnly` for view-only surfaces (no Edit). Do not use always-expanded `patternEditing: 'inline'` for new hosts. Portaled menu chrome uses `--theme-*` / `--labs-selection-secondary-*`; hosts that theme outside `:root` (Stanza) must mirror tokens onto `.drum-pattern-edit-menu`.

#### Nested Edit menu checklist (`portal styling`)

When `DrumAccompaniment` Edit opens from inside a host floating panel (Words section/sound settings, Encore section playback):

1. **Click-outside allowlist** — host document `mousedown` handlers must treat the portaled editor as in-panel via [`isDrumPatternEditMenuTarget`](components/music/drumPatternEditMenu.ts) (paper class **and** modal root). Mirror the existing `isPlaybackFieldSelectPopoverTarget` pattern.
2. **Text-node targets** — resolve with [`resolveEventTargetElement`](dom/resolveEventTargetElement.ts) before `.closest()`; chip label clicks often set `event.target` to a Text node.
3. **Stable position** — freeze with `anchorReference="anchorPosition"` at open; reserve a fixed variations row in the menu so single↔multi-variation preset switches do not resize the paper. MUI Popover repositions on every render when `anchorEl` moves. Stage may show variation prev/next; do **not** add a bare preset-name header in dense mode.
4. **Hover tips** — dice tooltips must use `DRUM_PATTERN_EDIT_TIP_Z_INDEX` (above the menu) and prefer placement above the control while the menu is open.
5. **Host content under the menu** — while open, `DrumAccompaniment` sets body class `labs-drum-pattern-edit-menu-open`. Chart/canvas hosts (Encore) should set `pointer-events: none` on underlying interactive tokens so hover labels cannot bleed through. Keep the edit paper **opaque** (`background-color: #fff`; no frosted `backdrop-filter` on `.drum-pattern-edit-menu`).
6. **`hidePatternInput`** — hides the outer/inline field only; the Edit menu still shows the notation string (Words host-input profile).

| Host                           | Profile                                                                | Pattern input                       | Darbuka link                             | Audible drums |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------- | ------------- |
| Encore Originals / Chords      | `settings-panel`                                                       | in Edit menu                        | inline icon in menu                      | no            |
| Stanza practice rail           | `practice-rail`                                                        | in Edit menu                        | inline icon in menu                      | yes           |
| Piano sidebar                  | `sidebar-compact`                                                      | in Edit menu                        | inline icon in menu                      | yes           |
| Words section / sound settings | `settings-panel` + `{ hidePatternInput: true, hideDarbukaLink: true }` | **host `<input>`**; presets in menu | on host field (`DarbukaTrainerIconLink`) | no            |

- **Contract tests:** `inlineDrumUxContract.test.tsx`, `inlineDrumUxDefaults.test.ts`
- **Cursor rule:** `.cursor/rules/inline-drum-ux.mdc`
- **Deprecated:** `below-notation` Darbuka placement; `patternEditing: 'inline'` / `'popover'` (alias of `menu`)

### AppSlider value labels (thumb tooltips)

When using `valueLabelDisplay="auto"` or `"on"`:

- **Do not** override Slider root `padding` with a shorthand like `padding: 6px 0` — it removes the top space MUI needs and clips the tooltip. `AppSlider` adds `app-slider--with-value-label` automatically; keep that class effective (do not strip it in `className` overrides).
- **Do not** set `overflow: hidden` on ancestors of the slider inside `shared-bpm-dropdown` / `shared-bpm-slider-wrap`. Shared `bpmInput.css` sets `overflow: visible` on dropdowns that contain `.shared-bpm-slider-wrap`; avoid app CSS that reintroduces clipping on the portaled paper.
- For custom popover papers, include `shared-bpm-dropdown` (and `shared-bpm-dropdown--speed` for playback speed) on the paper `className` so shared overflow rules apply.

`PlaybackSpeedControl` and `BpmInput` already follow this; new menus with labeled sliders should use `AppSlider` + the shared dropdown shell classes.

### BPM / playback-speed inputs (`bpmInput.css`)

- Sidebar playback speed shows values like `0.75×` in the stepper field — use the shared `shared-bpm-stepper--playback-speed` width tokens (`5.5ch`); do not cap the value field with a tight `max-width` in app CSS.
- Milestone labels under the speed slider are positioned by rate (`left: %`), not `space-between`; do not re-center them in app overrides.
- Use `SliderMilestoneLabels` + `buildSliderMilestones` from `sliderMilestoneUtils.ts` for any new slider dropdown; do not render raw `<span>` lists inside `.shared-bpm-milestones`.

### Playback field selects (`playbackFieldSelect.css`)

Closed playback pickers (sound, chord style trigger, similar single-choice fields) share one trigger + menu shell so apps stay visually aligned.

- **`PlaybackFieldSelectTrigger`** — closed `<button>` chrome; pass `appearance="default" | "encore"` and optional `triggerClassName` for app tweaks.
- **`PlaybackSoundSelect`** — sound picker built on the shared trigger + list popover; pass the same `appearance` as adjacent pickers (`words`, `chords`, `piano`, …). Inside floating panels with document-level click-outside handlers, treat `.shared-playback-field-select-popover` as in-panel via `isPlaybackFieldSelectPopoverTarget`.
- **Audio regression tests** — `src/shared/playback/audioContextLifecycle.test.ts`, `scorePlayback.audio.test.ts`, `chordInstrumentSession.test.ts`, `scheduleStyledChordMeasure.test.ts`, and `playbackFieldSelect.test.ts` guard silent-playback failures (suspended context, zero-velocity schedule, portaled menu dismissal).
- **`ChordStyleInput`** — uses the shared trigger for its closed state; maps `appearance="encore"` (and host skins like `piano` / `words` / `chords`) onto shared `--pfs-*` CSS variables for the trigger while keeping its grid menu for rich style cards.
- **Helpers** (`playbackFieldSelect.ts`): `PlaybackFieldSelectAppearance`, `playbackFieldSelectPopoverSlotProps`, `playbackFloatingPanelSlotProps`, `forwardWheelToPageScroller`, `resolvePlaybackFieldSelectAppearance`.
- **Floating panels + nested menus**: use `playbackFloatingPanelSlotProps` on the outer popover and `playbackFieldSelectPopoverSlotProps` on field selects (`PLAYBACK_FIELD_SELECT_Z_INDEX` keeps menus above the panel). Backdrop wheel events forward to `.in-scroll-region` so the page still scrolls while a menu is open; backdrop clicks close as usual. Pair floating popovers with `usePopoverScrollAnchorSync` + `popoverAnchorEl()` so menus track anchors inside nested scroll regions (Encore `.in-scroll-region`). Nested **drum Edit** menus also need the [Nested Edit menu checklist](#nested-edit-menu-checklist-portal-styling) above (`isDrumPatternEditMenuTarget`, frozen `anchorPosition`).
- **Custom menus**: reuse `playbackFieldSelectPopoverSlotProps(appearance)` on MUI `Popover` `slotProps` and put options in `.shared-playback-field-select__menu-list` / `.shared-playback-field-select__option` when you need a simple list; override `--pfs-*` on a parent selector for app tint without forking the trigger markup.

#### Portaled appearance checklist

Trigger skin and portaled menu skin **must match**. A closed trigger with Words teal but a `default` (purple) menu paper is a common regression.

When wiring `appearance="words|chords|piano|encore"` on `PlaybackSoundSelect`, `ChordStyleInput`, or a custom list popover:

1. **Closed trigger** — root uses `shared-playback-field-select--{appearance}` (via `playbackFieldSelectRootClass` or `PlaybackFieldSelectTrigger`).
2. **Portaled menu paper** — `playbackFieldSelectPopoverSlotProps(appearance)` so `resolvePlaybackFieldSelectMenuAppearance()` maps to `shared-playback-field-select__menu--{appearance}` on the MUI `paper` class (not only on the trigger).
3. **Click-outside** — document-level dismiss handlers must allowlist `.shared-playback-field-select-popover` via `isPlaybackFieldSelectPopoverTarget` (Words sound panel is the reference).
4. **Nested z-index** — Words menus inside section dropdowns: pass `menuZIndex={PLAYBACK_FIELD_SELECT_WORDS_Z_INDEX}` when the host panel sits above default popovers.
5. **UI catalog** — demo the **open menu** per skin under `/ui`, not just the closed trigger; `playbackFieldSelect.test.ts` guards the appearance → menu mapping.

### Song key picker (`KeyInput`)

Use shared **`KeyInput`** (`src/shared/components/music/KeyInput.tsx`) for any major/minor song-key control. Do not ship app-local key grids or autocomplete lists.

- **Default** — 12-key grid + **major / minor** toggle; `modeFormat="short"` emits `C` / `Cm`, `modeFormat="long"` emits `C major` / `C minor` (Encore repertoire, Stanza pitch rail).
- **`clearable`** — optional clear control for nullable fields (Encore `performanceKey`).
- **App theming** — pass `className` + `dropdownClassName` (see `stanza-key-dropdown`, `encore-repertoire-key-dropdown`, `words-key-dropdown` in app CSS).
- **Transpose helpers** — `transposeSongKey` / `formatSongKeyDisplay` in `songKeyFormat.ts` preserve quality when shifting pitch.

### Comic palette field (`LabsPaletteField`)

Dense hosts (Scrapboard rail) use [`LabsPaletteField`](palette/LabsPaletteField.tsx): closed **swatch strip** → `AnchoredPopover` with [`LabsPaletteBuilder`](palette/LabsPaletteBuilder.tsx) (+ optional paste). Keep Lyrefly/workbench inline `LabsPaletteBuilder` when the stage already budgets vertical space for the full panel. See [`palette/README.md`](palette/README.md).

### Wikimedia image field (`LabsWikimediaImageField`)

Dense hosts use [`LabsWikimediaImageField`](media/LabsWikimediaImageField.tsx): closed **thumbnail + title** trigger → `AnchoredPopover` with [`LabsWikimediaImageSearch`](media/LabsWikimediaImageSearch.tsx). Prefer this over always-inline search lists in side rails. Keep inline `LabsWikimediaImageSearch` only when the surface already budgets vertical space for results.

## Interaction patterns (pickers vs editors)

See [`docs/CHROME_UI_CONTRACT.md`](../../docs/CHROME_UI_CONTRACT.md) for chrome profiles and the full matrix.

| UI need                                | Use                                                        |
| -------------------------------------- | ---------------------------------------------------------- |
| Compact anchored picker                | `AnchoredPopover` + portaled token mirror on paper class   |
| Comic palette in a dense side rail     | `LabsPaletteField` (swatch trigger → builder menu)         |
| Wikimedia photo in a dense side rail   | `LabsWikimediaImageField` (thumb trigger → search menu)    |
| Multi-row editor inside scrolling rail | Inline disclosure (Edit/Done) — **not** a portaled popover |
| Full app shell on portaled node        | **Never** — mirror tokens on dropdown root only            |

## Popover Primitive

Apps historically re-specified MUI `Popover`'s `anchorOrigin`, `transformOrigin`, and `slotProps.paper.className` at every call site, which drifted over time. Use `AnchoredPopover` (`src/shared/components/AnchoredPopover.tsx`) for any new popover or menu surface.

```tsx
<AnchoredPopover
  open={open}
  anchorEl={anchorEl}
  onClose={onClose}
  placement="bottom-end"
  paperClassName="mixer-popover"
>
  {children}
</AnchoredPopover>
```

Migrate existing MUI `Popover` usages opportunistically (i.e. when touching the surrounding code). `SharedExportPopover` should eventually adopt this primitive as well; it remains on direct `Popover` usage for now because it carries its own theming contract.

## LabsDebugDock (URL-gated debug chrome)

For local-only debug surfaces (e.g. practice timelines), wrap app-specific content in `LabsDebugDock` from [`src/shared/components/LabsDebugDock.tsx`](./components/LabsDebugDock.tsx). It provides a consistent bottom dock, collapse affordance, and **Copy bundle** (JSON for bug reports / LLM paste).

While mounted, the dock sets `--labs-debug-dock-height` on `:root` (and mirrors `--debug-panel-height` for Scales). **Each full-viewport app shell should always use** `height: calc(100dvh - var(--labs-debug-dock-height, 0px))` in its own CSS (see Scales, Sight, Gesture). The variable defaults to `0px` when the dock is absent so **non-debug layout is unchanged**. [`public/styles/shared.css`](../../public/styles/shared.css) also applies the same calc under `html:has(.labs-debug-dock)` as a backstop — do not rely on `:has()` alone without the always-on app rule.

## App-specific shared primitives

Some primitives live under `src/<app>/ui/` because their data shapes are app-specific. **Encore:** see [`src/encore/UI_PRIMITIVES.md`](../encore/UI_PRIMITIVES.md) (do not hand-roll media rows, integration cards, or Spotify sync panels).

## Metronome split control and mix bus

- **`MetronomeSplitControl`** — primary metronome toggle + chevron for `MetronomeAdvancedSettingsPanel`. Import from `src/shared/audio/platform/metronome`.
- **`appearance` contract** — pass `appearance="drums|words|piano|chords|stanza|midi"` (typed `MetronomeAppearance`). Split shell + portaled settings panel share `--metro-*` tokens via `metronome-themes.css` (mirror `PlaybackFieldSelect`).
- **`LabsSplitActionButton`** — generic split button; prefer `MetronomeSplitControl` for metronome UX.
- **Portaled controls near playback bar** — Darbuka selection uses `isDrumsSelectionProtectedTarget()` so BPM/metronome/settings popovers do not clear note selection. Metronome settings popover class: `.labs-metronome-settings-popover`.
- **`DrumAccentSettingsPanel`** — accent volume sliders; bind via `useAudioMixBus().channels.accent`.
- **`useAudioMixBus`** / **`useMetronomePreferences`** — see [`docs/SHARED_AUDIO_PLATFORM.md`](../../docs/SHARED_AUDIO_PLATFORM.md).

## Google Drive account menu (Stanza, Learn Your Scales)

Apps that sync `progress.json` to Drive under `Tiff Zhang Labs / <App>` use **`LabsDriveAccountMenu`** ([`src/shared/google/LabsDriveAccountMenu.tsx`](./google/LabsDriveAccountMenu.tsx)) on top of **`LabsAccountMenu`**. It owns the shared UX: back up, **Restore** picker, **Open in Drive**, restore dialog, and optional merge/replace conflict dialog.

Each app implements a hook/context that returns:

- `backup` — {@link LabsAccountBackupSlotProps} (tester gate, busy, messages, scope copy)
- `drive` — {@link LabsDriveBackupUiProps} (restore actions, folder URL, snapshots list)

Wire Stanza via `useStanzaDriveBackup`; Scales via `ScalesDriveBackupProvider` (`driveUi`). Do not duplicate restore dialogs or Drive link rows in app menus.

### Account menu hierarchy + extension slots

One hierarchy for every app's account menu: **identity → sync status/actions → integrations → footer**. When an app needs more than the default menu, extend `LabsAccountMenu` through its slots instead of forking (Encore is the reference consumer — `EncoreAccountMenu`):

- **`renderTrigger`** — custom trigger element (e.g. Encore's labeled "Hi, name" button). Spread the provided `triggerProps` onto the clickable element.
- **`identitySlot`** — replaces the default email line. For guest-facing identity use [`LabsAccountDisplayNameSection`](./google/LabsAccountDisplayNameSection.tsx) (view/edit display name, provider-name fallback).
- **`integrationsSlot`** — app-specific connection cards rendered full-bleed between identity and footer. Build each card with [`LabsAccountIntegrationCard`](./google/LabsAccountIntegrationCard.tsx) (brand icon + title + [`LabsStatusPill`](./components/LabsStatusPill.tsx) status, identity, description, utility icon row, primary/secondary/disconnect actions, alert, footnote) — **required** for new integrations so all cards share one layout. The function form receives `{ close }` for actions that should dismiss the menu.
- **`footer`** — replaces the default "Labs site / Privacy policy" footer region (Encore keeps its own privacy one-liner).
- **`backup`** is now optional — omit it for apps that render sync state inside an integration card instead of the portfolio backup block.
- **`alwaysShowMenu`** — render the full menu even without a persisted Google identity (for menus that carry signed-out content); **`onOpenChange`** — lazy-load integration data (e.g. Spotify profile summary) only while open.

Guardrail: `e2e/smoke/encore-account-menu.spec.ts` asserts Encore's menu keeps Spotify connect + display-name editing on top of the shared menu.

### Transient success toasts (`LabsFeedbackToast`)

After a blocking job finishes, **brief success copy** (e.g. `Synced from Drive (merged 218 comics).`) belongs in a **bottom-center dismissible toast**, not a banner over the app header or a filled MUI alert in the account menu.

- **Component:** [`LabsFeedbackToast`](./components/LabsFeedbackToast.tsx) — paper panel, severity icon circle, matches [`LabsBlockingJobContext`](./jobs/LabsBlockingJobContext.tsx) elevation and placement.
- **Drive hook:** [`useLabsDriveSyncToastMessage`](./google/useLabsDriveSyncToastMessage.ts) — filters transient sync copy via [`labsDriveSyncMessageIsTransientSuccess`](drive/labsDriveSyncMessages.ts).
- **Default wiring:** `LabsDriveAccountMenu` renders [`LabsDriveSyncToast`](./google/LabsDriveSyncToast.tsx) (thin wrapper). Apps with sticky headers (Zine Box) set `hideSyncToast` and mount one toast at the **app shell** (see `ZineboxDriveBackupProvider`).
- **Errors / sign-in prompts** stay in the account menu alert slot — do not toast those.
- **Long-running work** still uses the blocking-job snackbar only; do not duplicate progress UI.
- **Optional inline action:** pass `action={{ label, onClick }}` to add one button (e.g. `Open`) between the message and the dismiss button. Because the click is a direct user gesture, an `onClick` that opens a new tab is **not** blocked by popup blockers — prefer this over auto-opening a tab after an async export (see Encore practice-exercise Google Doc export). Keep it to a single short verb; the toast is not a place for multiple actions.

## Related Docs

- [Music Input Token Contracts](./components/music/THEMING_DECISIONS.md)
