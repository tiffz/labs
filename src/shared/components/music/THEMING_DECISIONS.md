# Shared Music Inputs Theming Decisions

This document captures the current theming contract for shared music input components:

- `BpmInput`
- `KeyInput`
- `ChordProgressionInput`
- `ChordStyleInput`

For cross-component standards (layering model, default-density rules, and rollout checklist), also see:

- `src/shared/SHARED_UI_CONVENTIONS.md`

## Core decisions

- **Theme by CSS variables, not deep overrides**
  - App-specific styles should prefer token overrides (`--*`) on the component root class and dropdown class.
  - Avoid restyling internal child selectors unless layout or spacing must change.

- **Root control and dropdown are separate surfaces**
  - Popovers are rendered in a portal, so root-class variables do not automatically flow into dropdown content.
  - For dropdown chip colors/states, set variables on the dropdown paper class (for example `words-key-dropdown`, `chords-key-dropdown`, `beat-key-dropdown`).

- **Appearance classes are first-class API**
  - `ChordProgressionInput` root gets `shared-chord-progression-input--{appearance}`.
  - `ChordStyleInput` root gets `shared-chord-style-input--{appearance}`.
  - Keep app themes aligned by using `appearance` plus optional class-level token overrides.

- **State behavior consistency**
  - Hover, focus, active, and disabled states use the same token model across components.
  - Prefer adjusting token values over adding one-off hover/focus selectors per app.

- **Shared scale buckets over local nudges**
  - Shared music inputs should consume bucketized spacing/size variables first.
  - App-specific overrides should set bucket values (or density mode) rather than editing multiple internal paddings and gaps.

## Shared semantic bridge

App themes should map to a common semantic bridge before component-family tokens:

- `--theme-primary`, `--theme-primary-hover`, `--theme-accent`
- `--theme-text`, `--theme-text-secondary`, `--theme-text-muted`
- `--theme-bg`, `--theme-surface`, `--theme-surface-elevated`
- `--theme-border`, `--theme-border-strong`, `--theme-focus-ring`

Shared component tokens (`--bpm-*`, `--key-*`, `--cp-*`, `--cs-*`) should derive from those semantic variables where possible.

## Density and size buckets

Use three density modes:

- `compact` (32px controls)
- `comfortable` (38px controls, default)
- `touch` (44px controls)

Recommended bridge variables:

- `--control-height`
- `--control-radius`
- `--control-inline-gap`
- `--control-padding-x`
- `--control-font-size`

## Component token families

- **Chord progression (`--cp-*`)**
  - Input: `--cp-input-border`, `--cp-input-bg`, `--cp-input-text`
  - Focus: `--cp-focus-border`, `--cp-focus-ring`
  - Surface: `--cp-surface-border`, `--cp-surface-bg`, `--cp-surface-shadow`
  - Preset chips: `--cp-chip-*`
  - Typography: `--cp-title-color`, `--cp-meta-color`

- **Chord style (`--cs-*`)**
  - Input: `--cs-input-border`, `--cs-input-bg`, `--cs-input-text`
  - Focus: `--cs-focus-border`, `--cs-focus-ring`
  - Surface: `--cs-surface-border`, `--cs-surface-bg`, `--cs-surface-shadow`
  - Style chips: `--cs-chip-*`
  - Typography: `--cs-title-color`, `--cs-meta-color`

- **Key input (`--key-*`)**
  - Shell/focus: `--key-bg`, `--key-border`, `--key-focus`, `--key-focus-ring`
  - Controls: `--key-divider`, `--key-control-hover-bg`
  - Dropdown: `--key-dropdown-bg`, `--key-dropdown-border`
  - Layout: `--key-dropdown-padding`, `--key-grid-gap`
  - Grid chips: `--key-chip-*`, `--key-chip-min-height`, `--key-chip-font-size`, `--key-chip-font-weight`

- **BPM input (`--bpm-*`)**
  - Shell/focus: `--bpm-bg`, `--bpm-border`, `--bpm-focus`, `--bpm-focus-ring`
  - Dropdown: `--bpm-dropdown-*`
  - Preset chips: `--bpm-chip-*`
  - Density bridge: `--bpm-shell-height`, `--bpm-shell-radius`, `--bpm-value-padding`

## Practical guidance

- Use both:
  - root class tokens for trigger/input shell
  - dropdown class tokens for portal-rendered menu content
- Keep spacing variants bucketized in app CSS (for example via `--control-height` -> `--bpm-shell-height`) while color/state stays tokenized.
- If adding a new shared input:
  - define token families first
  - add an appearance root class
  - ensure dropdown class hooks exist for portal content
  - add at least one test validating appearance/dropdown class application

## Recent contract updates

- Default shared palette across `BpmInput`, `KeyInput`, `ChordProgressionInput`, and `ChordStyleInput` now uses a balanced indigo-violet baseline.
- Control geometry for progression/style is intentionally aligned (same height, radius, and text density defaults).
- `/ui` now maps to production-facing class hooks for piano BPM (`sb-shared-bpm-input`, `piano-bpm-dropdown`) so gallery previews mirror runtime paths.
- `/ui` now includes drums BPM (`drums-shared-bpm-input`, `drums-bpm-dropdown`, `drums-bpm-slider`) so the drum app's shared BPM contract is visible in gallery parity checks.
- Wrapper-aware gallery bridging is now part of the contract (for example `words-inline-control`, chords option-chip shells, piano tempo label wrappers), preventing "token-only" previews from hiding composition-level style dependencies.
- Duplicate app-level shared-control overrides were reduced in app CSS where the same contract already exists in `appSharedThemes.css`.
