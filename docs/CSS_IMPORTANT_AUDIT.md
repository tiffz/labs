# CSS `!important` Audit (Phase 3)

Date: 2026-04-18

## Why this exists

Across the labs codebase we have ~258 uses of `!important` in app stylesheets. The vast majority fall into a small number of categories, most of which are a symptom of weak token boundaries or selector specificity wars rather than genuinely necessary overrides. This doc catalogs them, gives the prescribed fix per category, and lists the hotspot files so the Phase 4 split work can trim `!important` in the same PRs that refactor each surface (under visual-snapshot coverage).

## Raw counts by file

Current counts (run with `rg '!important' src --type css -c` to refresh):

| File                                                  | Count |
| ----------------------------------------------------- | ----: |
| `src/beat/styles/beat.css`                            |    65 |
| `src/cats/styles/cats.css`                            |    40 |
| `src/shared/components/music/appSharedThemes.css`     |    25 |
| `src/chords/styles/chords.css`                        |    23 |
| `src/drums/styles/drums.css`                          |    18 |
| `src/piano/styles/piano.css`                          |    17 |
| `src/ui/styles/ui.css`                                |    12 |
| `src/forms/styles/forms.css`                          |    10 |
| `src/zines/styles/zines.css`                          |    10 |
| `src/words/styles/word-rhythm.css`                    |     6 |
| `src/shared/components/appSlider.css`                 |     6 |
| `src/pitch/styles/pitch.css`                          |     2 |
| `src/count/styles/pulse.css`                          |     1 |
| `src/piano/components/inputSources.css`               |     1 |
| `src/shared/ui/icons/materialIcons.css`               |     1 |
| `src/shared/components/music/sharedExportPopover.css` |     1 |

Remaining CSS files have zero.

## Categories and prescribed fixes

### 1. Overriding MUI portal/paper defaults

Symptom: selectors like `.shared-export-popover-words`, `.words-section-style-dropdown`, `.mixer-popover` using `!important` on `background`, `border`, `border-radius`, `box-shadow`, typically pointing at a token (`var(--words-dropdown-surface-bg)`).

Why it happens: MUI `Paper` inlines styles via emotion with its own specificity; apps re-skin it via a `className` on the Paper slot and shout at it.

Prescribed fix:

- Use the shared `AnchoredPopover` primitive (`src/shared/components/AnchoredPopover.tsx`).
- Route app-specific styling through a documented `paperClassName` hook and a token family (see `SHARED_UI_CONVENTIONS.md`).
- When the shared component owns the MUI slot, its stylesheet can target `.shared-export-popover__paper` (app-agnostic) without `!important`.
- If you still need `!important` to beat an inline style from a third-party library, leave it but add a `/* REASON: beats MUI emotion inline styles */` comment.

### 2. Overriding MUI component defaults (Slider, Chip, Button)

Symptom: `appSlider.css`, `beat.css`, `cats.css` bumping MUI defaults with `!important` on `color`, `padding`, `height`, `min-width`.

Prescribed fix:

- Prefer the MUI `sx` / `slotProps` path when tokenizing from JS.
- Where the CSS must stay, increase selector specificity instead of `!important` (e.g., double-class selectors like `.app-root .MuiSlider-root .MuiSlider-thumb`).
- Pull the common overrides into `appSharedThemes.css` with a single semantic selector per token family; delete the per-app copies.

### 3. Beating Tailwind utility classes

Symptom: words/chords/pitch/count stylesheets overriding what a Tailwind `class="text-slate-800 ..."` composition does.

Prescribed fix:

- Either commit to Tailwind for that surface (delete the CSS override), or strip the Tailwind class and lean on the CSS.
- Mixed-mode surfaces are the root cause of most `!important`s in `cats.css` and `pitch.css`.

### 4. Material Symbols / icon fonts

Symptom: `materialIcons.css`, `inputSources.css` single `!important` to force font loading / glyph behavior.

Prescribed fix:

- These are genuinely necessary (the Material Symbols font ships rules the browser needs to override to render at a requested axis). Leave them, but add a comment documenting intent.

### 5. Legacy theme fallbacks

Symptom: `appSharedThemes.css` using `!important` to clamp theme tokens across apps.

Prescribed fix:

- Once each app's root element sets its theme tokens via a single owner (per `SHARED_UI_CONVENTIONS.md`), the fallback layer in `appSharedThemes.css` no longer needs `!important`.
- Schedule removal per-app alongside Phase 4 splits.

## Phase-aligned remediation plan

Phase 3 deliverable (this doc): audit and canonical patterns only. **No CSS edits.** Touching 65 lines of `beat.css` without the surrounding component split risks silent visual regressions that our Playwright baselines catch but that would still churn snapshots.

Phase 4 deliverable: for each component we split (PlaybackBar, words/App, beat/App, drums/VexFlowRenderer, piano/store), include an `!important`-trim pass scoped to the CSS files co-located with that component, run visual regression, and update snapshots once visually verified.

Exit criteria for "audit complete":

- `!important` count in `src/**/*.css` < 40 total.
- All remaining uses have a `/* REASON: ... */` comment immediately above.
- `src/shared/components/music/appSharedThemes.css` has zero `!important`.

## Tracking

Refresh the count table whenever a Phase 4 split lands that touches one of the hotspot files. Mark this doc as complete when the exit criteria are met.
