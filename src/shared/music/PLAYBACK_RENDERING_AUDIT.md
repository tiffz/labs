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

### Piano (`src/piano`)

- **Primary renderer**: `components/ScoreDisplay.tsx`
- **Key capabilities**: grand staff, ties/tuplets/beams, practice-note states, playback note coloring, repeat/navigation symbols.
- **Playback coupling**: app-specific score model and practice state.
- **Current risk**: tightly app-shaped data model makes direct renderer sharing high-risk.

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

1. **Unify duration conversion helpers** used by drums/chords/words.
2. **Unify pitch conversion helpers** used by chords/piano previews.
3. **Converge symbol drawing** on shared notation symbol helpers (remove duplicated inline path definitions).
4. **Extract reusable highlight sync helper** pattern for renderers that mutate SVG post-draw.
5. **Only after stabilization** evaluate partial renderer composition; avoid full renderer unification.

## Regression prevention checklist

- Any renderer that rebuilds SVG on layout changes must re-apply playback highlight state immediately after redraw.
- Auto-follow must target a single, explicit scroll owner per screen region.
- New playback rendering features should add focused tests for:
  - redraw + highlight persistence,
  - scroll-owner selection behavior,
  - active-note cleanup when moving between notes/measures.
