# Stanza design tokens & CSS conventions

Stanza uses warm paper surfaces, delicate ink, and a single rose accent (`--stanza-rose`). This doc covers **practice rail** styling and shared music inputs — not the full app shell (see `stanza.css` §1–6) or viewer grid (`stanza-viewer-layout.css`, `LAYOUT.md`).

## File map

| File                       | Scope                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `stanza.css`               | App shell, library, playback strip, scrub/selection, MUI overrides    |
| `stanza-viewer-layout.css` | Viewer grid, rail slot, notation column                               |
| `stanza-practice-rail.css` | Metronome strip, pitch/mix/drums rail sections                        |
| `appSharedThemes.css`      | `appearance="stanza"` on `KeyInput` / `BpmInput` + portaled dropdowns |

## Rail density tokens

Set on `.stanza-practice-rail--dense` (see `stanza-practice-rail.css`):

| Token                          | Role                                    |
| ------------------------------ | --------------------------------------- |
| `--stanza-rail-control-height` | Shared control height (2rem)            |
| `--stanza-rail-control-radius` | Chip radius for inset fields            |
| `--stanza-rail-control-border` | Hairline border on rail controls        |
| `--stanza-rail-control-bg`     | Tonal inset background (not pure white) |
| `--stanza-rail-section-gap`    | Vertical padding between rail sections  |
| `--key-shell-height`           | Bridges to `KeyInput` shell             |
| `--bpm-shell-height`           | Bridges to `BpmInput` / stepper shells  |
| `--bpm-stepper-min-width`      | Min width for value + ▲▼ arrows         |

## Selection tiers

Per `docs/SELECTION_VISUAL_HIERARCHY.md`:

- **Primary** — transport on, active loop region (`--labs-selection-primary-*`).
- **Secondary** — chips, presets, playback key pill, metronome beat highlights (`--labs-selection-secondary-*`, rose-tinted).

Portaled pickers (`.stanza-key-dropdown`, `.stanza-bpm-dropdown`) duplicate rose + selection tokens because they render under `document.body` outside `.stanza-app`.

## Shared music inputs — use `appearance`, not deep selectors

Prefer:

```tsx
<KeyInput appearance="stanza" dropdownClassName="stanza-key-dropdown" />
<BpmInput appearance="stanza" dropdownClassName="stanza-bpm-dropdown" />
```

Avoid new rules like `.stanza-app .stanza-rail-section--pitch .shared-key-shell { … }` when the token belongs on the shared component skin. Rail-specific **layout** (grid columns, chip placement) stays in `stanza-practice-rail.css`; **chrome** stays in `appSharedThemes.css` under `.shared-key-input--stanza` / `.shared-bpm-input--stanza`.

Pitch shift uses `NumericStepperField` inside a manual `.shared-bpm-shell` (not `BpmInput`); rail layout rules target `.stanza-rail-section--pitch .shared-bpm-shell`.

## Pitch row layout (single line)

Two columns at ~392px rail width:

1. **Original Key** — compact `KeyInput` (~5.75rem).
2. **Shift** — stepper with ▲▼ + reset; **playback chip inline** at the end of the shift row (gestalt: result of shift, no separate “Playback” label). Full key + semitones in tooltip only.

Grid: `minmax(0, 5.75rem) minmax(0, 1fr)`.

## Layout primitives

- `StanzaRailField` — label + control column (`stanza-rail-field-label`, optional `--inline`).
- `StanzaRailGridRow` — `variant="pitch"` → `.stanza-rail-pitch-row`; `variant="calibration"` → `.stanza-rail-calibration-grid`.

## CSS imports

`stanza-practice-rail.css` must be `@import`ed **at the top** of `stanza.css` (with `stanza-viewer-layout.css`). Mid-file `@import` is ignored by browsers and breaks the entire practice rail.

## Phase B/C (deferred)

- Playwright smoke for metronome strip + mix rows at rail width (pitch row covered by `e2e/smoke/stanza-practice-rail.spec.ts`).
- Remaining rail `sx` in stem inline-edit rows (`StanzaPracticeMixSection`).

## Scope inheritance (breadcrumb)

Song-vs-section scope for tempo + drums uses a **breadcrumb** control at the top of the groove panel: `Whole song › {section}`. Styles: `stanza-scope-inheritance.css`; component: `StanzaScopeInheritanceControl.tsx`.

- **Active crumb** — elevated pill with hairline border.
- **Inactive crumb** — muted text; hover lightens.
- **Meta chips** — parent always shows song BPM when calibrated; section shows its BPM only when it differs (rose tint on the section chip).
