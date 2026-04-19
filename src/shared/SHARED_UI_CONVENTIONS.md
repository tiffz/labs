# Shared UI Conventions

This document defines default conventions for shared UI so apps stay naturally aligned by default while still supporting app-specific identity.

## Objectives

- Shared controls should be easy to theme and hard to accidentally break.
- App teams should override tokens, not internals.
- Defaults should encode the non-load-bearing UX decisions (spacing, typography scale, state behavior, focus treatment).

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

## Related Docs

- [Music Input Token Contracts](./components/music/THEMING_DECISIONS.md)
