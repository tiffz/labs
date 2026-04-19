# Component Decomposition Pattern

A repeatable recipe for breaking up oversized React components (roughly: >600 lines, or a file that holds three-plus visually independent subtrees) in this codebase.

Pilot reference: `src/beat/components/PlaybackBar.tsx` (1058 → 727 lines) plus `src/beat/components/playbackBar/` (4 focused leaves).

## Why a pattern

Without a pattern, decomposition tends to:

- extract too many tiny props components with overlapping state
- create new hook soup that is hard to follow end-to-end
- leave the container essentially unchanged
- break visual regression in subtle ways because a useMemo moves

The steps below have been validated on the PlaybackBar pilot; apply them in order on each hotspot listed below.

## The pattern

1. **Inventory first.** Read the file end-to-end. Identify:
   - Pure helpers (functions that only read their arguments).
   - State-holding subtrees that render into a visually independent region of the DOM (a card, a row, a menu, a toolbar).
   - Stateful behavior that is a candidate for a custom hook (long mouse drag handlers, resize listeners, cached DOM measurements).
2. **Extract pure helpers first.** Move them into a sibling `<componentName>Helpers.ts` file. No React imports. Keep exports small; export types alongside functions when helpers return structured objects. This is the lowest-risk extraction and typically unblocks the rest because it breaks most of the obvious dependency cycles.
3. **Extract leaf components.** Prefer "fully controlled" leaves: inputs come via props, state changes go out via callbacks. No new state owned by the leaf unless it was already strictly local in the original file (e.g., a short-lived draft text field). Put each leaf in a subdirectory named after the container in lowerCamelCase (e.g., `components/playbackBar/`), one component per file. File name matches the exported component.
4. **Replace inline JSX with the new leaf components** inside the container. Keep prop drilling direct and explicit; do not introduce context or a new store to avoid prop drilling at this step unless the number of props crosses ~8 and the children of a leaf all need the same subset. Prop drilling is fine in this pattern — the point is to shrink the container, not change the data-flow shape.
5. **Promote derived values to `useMemo` in the container** only when they are used by multiple leaves or have non-trivial cost. Do not eagerly wrap every helper call in `useMemo`; prefer calling the pure helper inside the leaf instead.
6. **Defer hook extraction.** Only extract a hook when (a) the behavior is used by more than one component, or (b) it represents a self-contained lifecycle (document-level listeners, subscription + cleanup). For one-off handlers, keep them inline in the container; extracting prematurely creates a new indirection for no readability win.
7. **Name the subtree directory after the container.** Co-location beats a flat `components/` tree once a surface has three or more extracted leaves. Example: `components/playbackBar/{LaneMenu,SectionControlsRow,SectionHoverCard}.tsx`.
8. **Do not change any externally observable behavior in the decomposition PR.** No new props on the container, no CSS class renames, no prop rename that would break call sites. Rendering output should be byte-identical. This is how you keep visual-regression snapshots unchanged and catch any accidental regression loudly.
9. **Run the container's test file + visual regression.** For the pilot: `npx vitest run src/beat/components/PlaybackBar.test.tsx` and the `e2e/visual/` specs that cover the surface. Decomposition with unchanged public behavior should leave both green without snapshot updates.

## Container-level checklist

Apply to each hotspot before calling the split "done":

- [ ] Container file is below 600 lines.
- [ ] Each extracted leaf is under 200 lines. If not, recurse — the leaf is probably hiding its own subcomponents.
- [ ] Helpers file has no React import.
- [ ] No leaf owns state that another leaf also needs to read (the container is the single owner).
- [ ] No new props added to the container's public prop surface.
- [ ] Existing unit tests pass without modification.
- [ ] `npm run typecheck` and `npx eslint <touched files>` are clean.
- [ ] Knip is clean after the split (new shared helpers aren't dead code).
- [ ] Visual-regression snapshots unchanged.

## Per-hotspot notes (Phase 4 rollout targets)

These are the files flagged in the engineering audit as over-size and ripe for this pattern. Notes capture current status and intent for each.

### Completed in the Phase 4 rollout PR series

- **`src/beat/components/PlaybackBar.tsx`** — pilot. 1058 → 727 lines; extracted `playbackBarHelpers.ts`, `SectionHoverCard`, `SectionControlsRow`, `LaneMenu` into `components/playbackBar/`.
- **`src/words/utils/prosodyEngine.ts`** — 2209 → 2169 lines in the engine + new `prosodyEngineTypes.ts` (86 lines) for types, constants, and small helpers. Interface `WordRhythmGenerationSettings` and the `DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS` constant intentionally stay in the engine because many internal functions reference the interface fields directly; splitting `parseTemplateTimeline` (~1400 lines) into stages is deferred to a dedicated PR.
- **`src/piano/store.tsx`** — 1493 → 1257 lines; extracted `storeTypes.ts` (258 lines) for `PianoState`, `Action` union, `ActiveMode`, `ScoreSection`, and `initialState`. Reducer + `PianoProvider` remain in `store.tsx`; splitting those into `reducer.ts` + `PianoProvider.tsx` is the next natural step but requires care because the provider's effect wiring references reducer-internal helpers.

### Deferred to dedicated PRs

These need per-component inventory sessions before splitting. Each already has its external behavior protected by unit + visual regression tests, so the pattern can be applied incrementally without user-visible risk, but the extraction itself requires enough domain knowledge that it should not be batched together.

- **`src/words/App.tsx`** (4270 lines)
  - Expected leaves: prosody controls, lyric editor, export panel, playback rail, sidebar settings.
  - Likely helpers files: prosody derivations, lyric splitting, keyboard shortcut router.
  - First split target: extract the export panel (visually isolated, prop surface is small).
- **`src/beat/App.tsx`** (2386 lines; down from 2398 after AnchoredPopover migration)
  - Expected leaves: uploader landing, now-playing header, sidebar settings, mixer (already partially shared via `AnchoredPopover`).
  - Helpers: lane/section routing, persistence adapters.
  - First split target: extract the now-playing header (stable markup, few inputs).
- **`src/drums/components/VexFlowRenderer.tsx`** (2297 lines)
  - Expected leaves: voice builder, section splitter, annotation layer.
  - Helpers: VexFlow stem/beam computations (many pure math functions that can move to a sibling `vexFlowMath.ts`).
  - First split target: the pure math helpers — zero React dependency.
- **`src/shared/notation/ScoreDisplay.tsx`** (1720 lines)
  - Expected leaves: score header, voice legend, interactive overlays.
  - First split target: extract the legend (pure render) and the header (small state surface).
- **`src/beat/utils/chordAnalyzer.ts`** (1232 lines)
  - Currently a single cohesive module with one exported orchestrator (`analyzeChords`) and one export helper (`getChordChangeTimes`). Internal split into `chordDetection.ts` / `keyDetection.ts` is viable but shares many small helpers that would need to move with care.
  - Defer until a second orchestrator needs to reuse the inner stages, at which point the split has a clear payoff. Until then, this module is below the "split pain threshold."

### Removed from rollout list

- **`src/shared/prosodyEngine.ts`** — the engine lives in `src/words/utils/prosodyEngine.ts`, not `shared`. Corrected above.
- **`src/shared/chordAnalyzer.ts`** — the analyzer lives in `src/beat/utils/chordAnalyzer.ts`, not `shared`. Corrected above.

## Anti-patterns to avoid

- **Extract-then-reimport a hook as state.** If the container already owned the state, it should keep owning it. A hook that just wraps a `useState` + `useCallback` rarely earns its keep.
- **One big `useBehavior` hook.** Merging five unrelated drag handlers into one hook to "clean up the container" is a specificity loss; the container is now easier to read at the cost of the hook becoming the new mess.
- **Silent prop renames.** If you need to rename a prop, do it in a follow-up PR so it is not buried inside a decomposition diff.
- **Changing `useMemo` dependencies while splitting.** Keep the exact dependency arrays. If a dep seemed wrong, log it as a follow-up.
- **Mixing a visual-regression-heavy refactor with a CSS `!important` trim.** Phase 4 intentionally pairs the two in the same PR, but the component split lands first in the diff, `!important` trim second, with snapshots updated only after visual review.
