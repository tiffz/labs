# Shared UI Conventions

This document defines default conventions for shared UI so apps stay naturally aligned by default while still supporting app-specific identity.

## Objectives

- Shared controls should be easy to theme and hard to accidentally break.
- App teams should override tokens, not internals.
- Defaults should encode the non-load-bearing UX decisions (spacing, typography scale, state behavior, focus treatment).

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

`AppSlider` remains the older **legacy event-shape** helper for BPM and similar; prefer `AppLinearVolumeSlider` for new **volume / gain** UX.

### Playback volume rows (`PlaybackVolumeRow`)

For **labeled mix rows with mute + 0–100 slider**, use `PlaybackVolumeRow` (`src/shared/components/music/PlaybackVolumeRow.tsx`) instead of hand-rolled `AppSlider` + icon button rows. Used in `ChordPlaybackSettingsPanel`, Words sound settings, and Chords playback popover.

- Volume prop is **0–100** (integer-ish); internally maps to `AppLinearVolumeSlider` 0–1 gain.
- Pair with `ChordPlaybackSettingsPanel` when the surface matches chart/chord playback (style, sound, drums toggle).
- URL state for shareable links: [`docs/URL_STATE_PATTERN.md`](../../docs/URL_STATE_PATTERN.md).

### Inline drum panels (`DrumAccompaniment` + profiles)

Hosts embed [`DrumAccompaniment`](components/music/DrumAccompaniment.tsx) with a **profile** from [`getInlineDrumUxProps`](components/music/inlineDrumUxDefaults.ts) — never hand-roll layout flags unless the host owns the pattern text field.

| Host                           | Profile                                                                | Pattern input      | Darbuka link                             | Audible drums |
| ------------------------------ | ---------------------------------------------------------------------- | ------------------ | ---------------------------------------- | ------------- |
| Encore Originals / Chords      | `settings-panel`                                                       | in panel           | inline icon                              | no            |
| Stanza practice rail           | `practice-rail`                                                        | in panel           | inline icon                              | yes           |
| Piano sidebar                  | `sidebar-compact`                                                      | in panel           | inline icon                              | yes           |
| Words section / sound settings | `settings-panel` + `{ hidePatternInput: true, hideDarbukaLink: true }` | **host `<input>`** | on host field (`DarbukaTrainerIconLink`) | no            |

- **Contract tests:** `inlineDrumUxContract.test.tsx`, `inlineDrumUxDefaults.test.ts`
- **Cursor rule:** `.cursor/rules/inline-drum-ux.mdc`
- **Deprecated:** `below-notation` Darbuka placement — use inline icon only.

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
- **Floating panels + nested menus**: use `playbackFloatingPanelSlotProps` on the outer popover and `playbackFieldSelectPopoverSlotProps` on field selects (`PLAYBACK_FIELD_SELECT_Z_INDEX` keeps menus above the panel). Backdrop wheel events forward to `.in-scroll-region` so the page still scrolls while a menu is open; backdrop clicks close as usual. Pair floating popovers with `usePopoverScrollAnchorSync` + `popoverAnchorEl()` so menus track anchors inside nested scroll regions (Encore `.in-scroll-region`).
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

## Google Drive account menu (Stanza, Learn Your Scales)

Apps that sync `progress.json` to Drive under `Tiff Zhang Labs / <App>` use **`LabsDriveAccountMenu`** ([`src/shared/google/LabsDriveAccountMenu.tsx`](./google/LabsDriveAccountMenu.tsx)) on top of **`LabsAccountMenu`**. It owns the shared UX: back up, **Restore** picker, **Open in Drive**, restore dialog, and optional merge/replace conflict dialog.

Each app implements a hook/context that returns:

- `backup` — {@link LabsAccountBackupSlotProps} (tester gate, busy, messages, scope copy)
- `drive` — {@link LabsDriveBackupUiProps} (restore actions, folder URL, snapshots list)

Wire Stanza via `useStanzaDriveBackup`; Scales via `ScalesDriveBackupProvider` (`driveUi`). Do not duplicate restore dialogs or Drive link rows in app menus.

### Transient success toasts (`LabsFeedbackToast`)

After a blocking job finishes, **brief success copy** (e.g. `Synced from Drive (merged 218 comics).`) belongs in a **bottom-center dismissible toast**, not a banner over the app header or a filled MUI alert in the account menu.

- **Component:** [`LabsFeedbackToast`](./components/LabsFeedbackToast.tsx) — paper panel, severity icon circle, matches [`LabsBlockingJobContext`](./jobs/LabsBlockingJobContext.tsx) elevation and placement.
- **Drive hook:** [`useLabsDriveSyncToastMessage`](./google/useLabsDriveSyncToastMessage.ts) — filters transient sync copy via [`labsDriveSyncMessageIsTransientSuccess`](../drive/labsDriveSyncMessages.ts).
- **Default wiring:** `LabsDriveAccountMenu` renders [`LabsDriveSyncToast`](./google/LabsDriveSyncToast.tsx) (thin wrapper). Apps with sticky headers (Zine Box) set `hideSyncToast` and mount one toast at the **app shell** (see `ZineboxDriveBackupProvider`).
- **Errors / sign-in prompts** stay in the account menu alert slot — do not toast those.
- **Long-running work** still uses the blocking-job snackbar only; do not duplicate progress UI.

## Related Docs

- [Music Input Token Contracts](./components/music/THEMING_DECISIONS.md)
