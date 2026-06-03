# Component Decomposition Pattern

A repeatable recipe for breaking up oversized React components (roughly: >600 lines, or a file that holds three-plus visually independent subtrees) in this codebase.

Pilot reference (historical): Find the Beat `PlaybackBar` decomposition (removed with ADR 0013). Current Stanza pilot: `StanzaWorkspace.tsx` with leaves under `src/stanza/components/stanzaWorkspace/`.

## Why a pattern

Without a pattern, decomposition tends to:

- extract too many tiny props components with overlapping state
- create new hook soup that is hard to follow end-to-end
- leave the container essentially unchanged
- break visual regression in subtle ways because a useMemo moves

The steps below have been validated on prior pilots; apply them in order on each hotspot listed below.

## The pattern

1. **Inventory first.** Read the file end-to-end. Identify:
   - Pure helpers (functions that only read their arguments).
   - State-holding subtrees that render into a visually independent region of the DOM (a card, a row, a menu, a toolbar).
   - Stateful behavior that is a candidate for a custom hook (long mouse drag handlers, resize listeners, cached DOM measurements).
2. **Extract pure helpers first.** Move them into a sibling `<componentName>Helpers.ts` file. No React imports. Keep exports small; export types alongside functions when helpers return structured objects. This is the lowest-risk extraction and typically unblocks the rest because it breaks most of the obvious dependency cycles.
3. **Extract leaf components.** Prefer "fully controlled" leaves: inputs come via props, state changes go out via callbacks. No new state owned by the leaf unless it was already strictly local in the original file (e.g., a short-lived draft text field). Put each leaf in a subdirectory named after the container in lowerCamelCase (e.g., `components/stanzaWorkspace/`), one component per file. File name matches the exported component.
4. **Replace inline JSX with the new leaf components** inside the container. Keep prop drilling direct and explicit; do not introduce context or a new store to avoid prop drilling at this step unless the number of props crosses ~8 and the children of a leaf all need the same subset. Prop drilling is fine in this pattern — the point is to shrink the container, not change the data-flow shape.
5. **Promote derived values to `useMemo` in the container** only when they are used by multiple leaves or have non-trivial cost. Do not eagerly wrap every helper call in `useMemo`; prefer calling the pure helper inside the leaf instead.
6. **Defer hook extraction.** Only extract a hook when (a) the behavior is used by more than one component, or (b) it represents a self-contained lifecycle (document-level listeners, subscription + cleanup). For one-off handlers, keep them inline in the container; extracting prematurely creates a new indirection for no readability win.
7. **Name the subtree directory after the container.** Co-location beats a flat `components/` tree once a surface has three or more extracted leaves. Example: `components/stanzaWorkspace/{StanzaLibraryGrid,StanzaPracticeMixSection}.tsx`.
8. **Do not change any externally observable behavior in the decomposition PR.** No new props on the container, no CSS class renames, no prop rename that would break call sites. Rendering output should be byte-identical. This is how you keep visual-regression snapshots unchanged and catch any accidental regression loudly.
9. **Run the container's test file + visual regression.** For Stanza: `npx vitest run src/stanza/components/stanzaWorkspace/` and `e2e/stanza-viewer-layout.spec.ts`. Decomposition with unchanged public behavior should leave both green without snapshot updates.

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

- **`src/piano/store.tsx`** — 1493 → 1257 lines; extracted `storeTypes.ts` (258 lines) for `PianoState`, `Action` union, `ActiveMode`, `ScoreSection`, and `initialState`. Reducer + `PianoProvider` remain in `store.tsx`; splitting those into `reducer.ts` + `PianoProvider.tsx` is the next natural step but requires care because the provider's effect wiring references reducer-internal helpers.
- **`src/words/utils/prosodyEngine.ts`** — 2209 → 2169 lines in the engine + new `prosodyEngineTypes.ts` (86 lines) for types, constants, and small helpers.

### In progress — Stanza workspace (ADR 0013 follow-up)

- **`src/stanza/components/StanzaWorkspace.tsx`** (~3600 lines; was ~4400)
  - Extracted to `components/stanzaWorkspace/`:
    - `stanzaWorkspaceHelpers.ts` — stem reorder, mix label sx, YouTube error copy, practice detection
    - `stanzaPracticeRailConstants.ts` — drums notation footprint + palette
    - `StanzaLibraryGrid`, `StanzaDriveDeepLinkAlerts`, `StanzaPracticePitchSection`, `StanzaPracticeMixSection`
  - Next splits (dedicated PRs): playback transport card, landing hero / import row, viewer header, timeline wiring hooks.

### Deferred to dedicated PRs

These need per-component inventory sessions before splitting. Each already has its external behavior protected by unit + visual regression tests, so the pattern can be applied incrementally without user-visible risk, but the extraction itself requires enough domain knowledge that it should not be batched together.

- **`src/words/App.tsx`** (4270 lines)
  - Expected leaves: prosody controls, lyric editor, export panel, playback rail, sidebar settings.
  - First split target: extract the export panel (visually isolated, prop surface is small).
- **`src/stanza/components/StanzaTimeline.tsx`** (~1150 lines)
  - Expected leaves: marker handles, loop hull overlay, transport toolbar row.
  - First split target: pure timeline math helpers (zero React dependency).
- **`src/stanza/components/StanzaSectionMetronomeRail.tsx`** (~900 lines)
  - Expected leaves: analyze dialog shell, calibration row, tap-tempo affordances (partially in `StanzaTapTempoDialog`).
- **`src/drums/components/VexFlowRenderer.tsx`** (2297 lines)
  - First split target: the pure math helpers — zero React dependency.
- **`src/shared/notation/ScoreDisplay.tsx`** (1720 lines)
  - First split target: extract the legend (pure render) and the header (small state surface).

### Removed from rollout list

- **Find the Beat app** — removed per [ADR 0013](./adr/0013-stanza-subsumes-find-the-beat.md). Shared tempo analysis lives in `src/shared/beat/**`.
- **`src/shared/prosodyEngine.ts`** — the engine lives in `src/words/utils/prosodyEngine.ts`, not `shared`.
- **`src/shared/chordAnalyzer.ts`** — never existed; chord analysis was Beat-only and is not ported to Stanza yet.

## Anti-patterns to avoid

- **Extract-then-reimport a hook as state.** If the container already owned the state, it should keep owning it. A hook that just wraps a `useState` + `useCallback` rarely earns its keep.
- **One big `useBehavior` hook.** Merging five unrelated drag handlers into one hook to "clean up the container" is a specificity loss; the container is now easier to read at the cost of the hook becoming the new mess.
- **Silent prop renames.** If you need to rename a prop, do it in a follow-up PR so it is not buried inside a decomposition diff.
- **Changing `useMemo` dependencies while splitting.** Keep the exact dependency arrays. If a dep seemed wrong, log it as a follow-up.
- **Mixing a visual-regression-heavy refactor with a CSS `!important` trim.** Phase 4 intentionally pairs the two in the same PR, but the component split lands first in the diff, `!important` trim second, with snapshots updated only after visual review.
