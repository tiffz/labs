# Playback Rendering Audit

This document inventories the current playback-rendering systems across Labs music apps and defines shared-library boundaries to reduce regressions.

## Inventory by app

### Words (`src/words`)

- **Primary renderer**: `components/VexLyricScore.tsx`
- **Key capabilities**: lyric-aligned rhythm rendering, chord-system overlay, metronome dots, playback note highlighting, auto-follow scroll.
- **Playback coupling**: consumes playback state from drums playback hooks and rhythm scheduling semantics.
- **Current risk**: renderer redraw and playback-highlight state can drift when SVG nodes are replaced.

### Drums (`src/drums`)

- **Primary renderers**: `components/VexFlowRenderer.tsx`, `components/MiniNotationRenderer.tsx`
- **Key capabilities**: editable rhythm grid, repeat semantics, metronome display, compact notation previews.
- **Playback coupling**: `hooks/usePlayback.ts` + `utils/rhythmPlayer.ts`.
- **Current risk**: some notation helpers and symbol drawing logic are duplicated across renderer variants.

### Chords (`src/chords`)

- **Primary renderer**: `components/ChordScoreRenderer.tsx`
- **Key capabilities**: two-staff chord playback rendering, active-note highlighting.
- **Playback coupling**: `utils/playback/playbackEngine.ts` with shared transport/scheduler primitives.
- **Current risk**: duplicated pitch/duration conversion logic vs. other apps.

### Beat (`src/beat`)

- **Primary renderer usage**: shared `DrumNotationMini` for accompaniment playback preview.
- **Playback coupling**: parent-driven tempo/index state with shared notation component.
- **Current risk**: generally low; mostly consumer of shared notation.

## Shared modules in use today

- `src/shared/playback/*`: scheduler/transport/instrument primitives.
- `src/shared/rhythm/*`: parsing and repeat-preprocessing primitives.
- `src/shared/notation/*`: mini notation and reusable symbol drawing.
- `src/shared/utils/playbackAutoScroll.ts`: cross-app playback auto-follow helper.

## Recommended shared-library boundaries

Do **not** build one monolithic shared renderer. Instead, keep renderer shells app-specific and share lower-level primitives in layers:

1. **Notation timing primitives** (shared)
   - Duration token conversion and beat grouping helpers.
   - Repeat/measure index mapping primitives.
2. **VexFlow utility primitives** (shared)
   - Pitch conversion helpers.
   - Beaming/grouping helpers.
   - Optional shared playback highlight applicator.
3. **Playback orchestration primitives** (shared)
   - Continue extending `src/shared/playback/*` and `src/shared/utils/playbackAutoScroll.ts`.
4. **App renderer shells** (app-owned)
   - Keep Words/Drums/Piano/Chords top-level renderers app-local.

## Extraction roadmap (priority order)

1. ~~**Unify duration conversion helpers** used by drums/chords/words.~~ → `src/shared/notation/vexFlowDuration.ts` (`sixteenthTicksToVexFlowDuration`, `vexFlowDurationToBeats`); chords/drums re-export adapters.
2. ~~**Unify pitch conversion helpers** used by chords/piano previews.~~ → `midiToPitchString` / `midiToPitchStringForKey` in `src/shared/music/scoreTypes.ts`; chords renderers consume shared helpers.
3. ~~**Converge symbol drawing** on shared notation symbol helpers.~~ → `MiniNotationRenderer` uses `drawDrumSymbol` from `src/shared/notation/drumSymbols.ts`.
4. ~~**Extract reusable highlight sync helper**~~ → `src/shared/notation/playbackSvgHighlight.ts` (`setSvgElementColor`, `syncKeyedSvgHighlights`, `reapplyActiveKeyHighlight`, `highlightVexFlowMiniNoteGroup`); Words, Chords, and DrumNotationMini consume shared helpers.
5. ~~**Only after stabilization** evaluate partial renderer composition~~ → **Evaluated (2026-05): keep app renderer shells.** Shared primitives (`vexFlowDuration`, `playbackSvgHighlight`, `drumSymbols`, `playbackAutoScroll`) are the correct composition layer. `DrumNotationMini` and `VexFlowRenderer` stay separate per ADR in `DrumNotationMini.tsx` (read-only mini vs multi-measure editor). Do **not** merge top-level renderers; adopt shared highlight/duration helpers only.

## Regression prevention checklist

- Any renderer that rebuilds SVG on layout changes must re-apply playback highlight state immediately after redraw.
- Auto-follow must target a single, explicit scroll owner per screen region.
- New playback rendering features should add focused tests for:
  - redraw + highlight persistence,
  - scroll-owner selection behavior,
  - active-note cleanup when moving between notes/measures.

## Canonical VexFlow render order

Several stem/beam/highlight bugs came from running steps at the wrong lifecycle point. **Always use this order** for new or refactored VexFlow surfaces; import shared helpers instead of copying ad hoc sequences.

| Step | Action                                   | Shared helper / reference                                                                  |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | Format voices (`Formatter.format`)       | App formatter setup                                                                        |
| 2    | Generate beams                           | `generateChordClefBeams`, `getChordBeamGroups` (`chordNotationBeams.ts`)                   |
| 3    | Draw notes / staves                      | App renderer draw pass                                                                     |
| 4    | Redraw stems if beamed clusters omit SVG | `redrawBeamedStemsIfMissing` (`chordNotationBeams.ts`)                                     |
| 5    | Draw beams                               | `suppressBeamedNoteFlags` then beam `.draw()`                                              |
| 6    | Apply playback highlight                 | Prefer lightweight SVG attribute toggle (`data-highlighted`); avoid full rebuild per frame |

**Do not** generate beams before `Formatter.format()` — beamed chord stems detach in compound meter when order is wrong (`ChordScoreRenderer.tsx`, `ChordStylePreview.tsx`).

For drum mini notation sync (no VexFlow), derive `{ measureIndex, noteIndex }` synchronously from elapsed time (`drumPlaybackNotePointer.ts`); memoize `displayRhythm` passed into `DrumNotationMini`.

## Playback hook and empty-state patterns

Async chart playback, portaled picker skins, and loading UX are documented in:

- [`src/shared/hooks/PLAYBACK_HOOK_PATTERN.md`](../hooks/PLAYBACK_HOOK_PATTERN.md) — generation token, real `stopAll`, stable notation props.
- [`.cursor/rules/playback-ui-regressions.mdc`](../../../.cursor/rules/playback-ui-regressions.mdc) — agent checklist for hot-path edits.
