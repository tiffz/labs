# Stanza practice rail — iteration notes

Local checklist for the right-hand **Practice** rail (metronome, tap tempo, drums, mix). Link here from PRs that touch `StanzaWorkspace`, `components/stanzaWorkspace/*`, `StanzaSectionMetronomeRail`, or `StanzaTapTempoDialog` instead of re-explaining these pitfalls in review threads.

## Viewer layout

Full layer table: **[`LAYOUT.md`](./LAYOUT.md)**. CSS in **`stanza-viewer-layout.css`**; shell in **`StanzaViewerLayout`**. Do not reintroduce viewer width/gap/padding in `StanzaWorkspace` `sx`.

| Layer          | Class                      | Role                                                                                                   |
| -------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Page shell     | `.stanza-viewer-column`    | Max width + horizontal gutter (`--stanza-viewer-gutter`)                                               |
| Content block  | `.stanza-viewer-workbench` | **Fixed** width `--stanza-viewer-content-width` (media + rail + gap) — not `width: 100%` + `max-width` |
| Scroll region  | `.stanza-viewer-scroll`    | `overflow: auto`, `scrollbar-gutter: stable`                                                           |
| Main grid      | `.stanza-viewer-body-grid` | `main` (video + playback) / `rail` — desktop: single row; playback stays under video                   |
| Library footer | `.stanza-library-panel`    | Inside workbench; `width: 100%` via layout CSS                                                         |

**Pitfalls**

- Do not put `mx: auto` on the grid alone — it centers while siblings stay flush left.
- Do not cap video with arbitrary `dvh` (causes letterboxing); video height uses `--stanza-viewer-media-height`.
- On desktop, the **practice rail sits beside the main column** (video + playback); a tall rail scrolls internally and must not stretch space between video and playback (see [`LAYOUT.md`](./LAYOUT.md)).
- Tokens (`--stanza-viewer-*`) are the single source of truth; avoid duplicate pixel constants in TS.

## Before you ship

1. **Browser pass at rail width** — Open `/stanza/` with a song, enable metronome + drums, and scroll the rail at ~320–360px width. Clipping and nested scrollbars often only show up in the real layout, not in `/ui/` demos.
2. **`npm run presubmit`** — Knip scans the whole repo; new unused CSS classes from rail experiments fail even when ESLint is clean.
3. **Drive merge fields** — New persisted song fields need all three: `stanzaDb.ts`, `stanzaDriveMerge.ts`, `stanzaSongMetadataMerge.ts`. Mirror `metronomeMuted` / `drumsMuted` patterns.
4. **ADR 0009** — Drums/metronome volume and mute behavior lives there; update when changing Mix affordances or schema.

## Drums + `DrumNotationMini`

- **Layout math** — `computeMiniNotationLayout()` keeps a fixed staff height and grows `renderHeight` when adding top/bottom headroom. Do not shrink `staveHeight` inside a fixed host height (that clips noteheads).
- **Scroll host** — Wide patterns scroll on `.drum-notation-mini-x-scroll`, not on `.drum-notation-mini` (the SVG host). `overflow-x: auto` on the same node as the SVG forces `overflow-y: auto` and a nested vertical scrollbar; the shared wrapper sets `overflow-y: hidden`. See `notationMini.css`.
- **Stanza frame CSS** — `.stanza-drums-notation-frame` uses `overflow: visible` and `flex-shrink: 0`. Avoid `min-height: 0` on the notation frame (flex shrink clips the staff).
- **Constants** — `STANZA_DRUMS_NOTATION_WIDTH` / `HEIGHT` in `components/stanzaWorkspace/stanzaPracticeRailConstants.ts` (currently 236×68); host height is a minimum — SVG may grow slightly for stems. Dense patterns widen via `estimateMiniNotationRenderWidth()` + horizontal scroll. Stanza uses `INLINE_DRUM_PANEL_UX` + `presetLayout="compact"` (picker menu, no pattern field / Darbuka link).

## Tap tempo

- **Audio gates** — `onMetronomeTapActiveChange` (count-in + tapping) mutes metronome clicks **and** drums (`stanzaTapMetronomeTapActive` in `StanzaWorkspace`). Preview phase enables metronome via `onTapMetronomePreviewChange` only.
- **Dialog UX** — Prefer MUI `Stack` spacing (3–4 between steps), centered hero header, tonal hint card; avoid step connector lines and nested tinted row boxes. Primary action in `DialogActions` with generous padding (`maxWidth="xs"`). Do **not** use viewport `sm:` row breakpoints inside this dialog — the paper is already `xs` width, so side-by-side rows squeeze caption text beside playback buttons. Stack preview fields and play actions vertically; put helper copy on its own line below buttons.

## Mix row

- **Inline in the practice rail** — Mix lives in `.stanza-rail-section--mix` (not a volume popover). The rail scrolls when content exceeds the grid cell height.
- **Icon alignment** — Metronome, Drums, and Main rows share the same structure: drag spacer → `IconButton` mute → label → `AppLinearVolumeSlider` → trail spacer. Never use a decorative icon `Box` in the mute slot (Drums was misaligned until it matched Metronome).
- **Mute vs enable** — `drumsEnabled` / metronome toggle = master on/off. `drumsMuted` / `metronomeMuted` = Mix mute (level preserved, slider dims). Drums share BPM + Beat 1 calibration with the metronome but do **not** require the metronome toggle to be on. Tap-tempo tap gate is separate and temporary.

## Tests worth adding when touching this area

| Surface                     | Suggestion                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `computeMiniNotationLayout` | Already unit-tested; extend when changing padding budgets.                                  |
| Song merge                  | Small vitest for `drumsMuted` / `metronomeMuted` threading in `stanzaSongMetadataMerge.ts`. |
| Tap tempo phases            | Component test that `onMetronomeTapActiveChange(true)` fires during countdown/tapping only. |
| Visual                      | Optional Playwright smoke on drums notation frame if regressions recur.                     |

## Related

- [ADR 0009](../../docs/adr/0009-stanza-drums-and-metronome-volume.md)
- [`DrumNotationMini.tsx`](../shared/notation/DrumNotationMini.tsx) + [`notationMini.css`](../shared/notation/notationMini.css)
- [`COPY_STYLE.md`](./COPY_STYLE.md) — Mix row labels ("Metronome", "Drums", "Main")
