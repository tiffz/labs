# Encore — agent context

Nested **`AGENTS.md`** for Project Encore. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — entry, env/ops, product constraints (link out for depth).
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — Dexie/Drive/sync contracts only (read when changing sync/data).
3. [`CUJs.md`](CUJs.md) — journeys + budgets only (no architecture walkthroughs).
4. **Originals chord paint:** [`originals/DEVELOPMENT.md`](originals/DEVELOPMENT.md) + `.cursor/rules/encore-originals-chord-paint.mdc`.
5. **Performance UX:** [`PERFORMANCE_UX.md`](PERFORMANCE_UX.md).
6. **Copy / UI primitives:** [`COPY_STYLE.md`](COPY_STYLE.md), [`UI_PRIMITIVES.md`](UI_PRIMITIVES.md).
7. **Undo:** [`../shared/undo/README.md`](../shared/undo/README.md).
8. **Practice resource DnD:** `practiceResourceOrder.ts` — click suppression **post-drop only**; never swap link DOM mid-drag.

## Entry & routing

- App URL: `/encore/` with hash routes (`#/library`, `#/originals`, `#/originals/:id`, …).
- E2E must click **Continue without Google** when the access gate appears.

## High-churn pitfalls

- **Originals selection:** by `ChordMarker.id`, not `charIndex` (multiple chords per word).
- **Loading vs missing:** `activeSong = draft ?? live.song`; spinner until `live.status === 'missing'`.
- **Playback settings popover** can cover Play/Stop — E2E uses `{ force: true }` or open settings after play starts.
- **Document `pointerdown` dismiss:** use `resolveEventTargetElement` before `.closest()` (text nodes break move-to-word).
- **Stanza deep links:** user-facing labels say **Stanza** only (never “Segno”). MusicXML segno glyphs elsewhere are unrelated — see `docs/USER_COPY_STYLE.md` § Cross-app product names.

## Tests

- Navigation: `e2e/encore-originals-navigation.spec.ts`
- Chord paint: `e2e/encore-originals-chord-paint.spec.ts`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
- Performance routes: `e2e/smoke/encore-performance-routes.spec.ts` (via `npm run test:e2e:smoke`)
- Library tab latency: `e2e/smoke/encore-library-interaction.spec.ts`, `e2e/smoke/encore-tab-navigation-interaction.spec.ts` (CUJ-001)
- Performance video UX (unit): `components/performance/*.test.tsx`, `utils/performanceVideoModel.test.ts`, `utils/performancePlaybackTarget.test.ts`, `drive/guestSnapshotLoadError.test.ts`
- Practice resource DnD: `repertoire/practiceResourceOrder.test.ts`, `repertoire/practiceResourceDragIds.test.ts`, `components/song/practiceResourceDragContext.test.ts`, `e2e/smoke/encore-practice-resource-dnd.spec.ts`
