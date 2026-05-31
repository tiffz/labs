# Encore — agent context

Nested **`AGENTS.md`** for Project Encore. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — product scope, sync, Originals vs repertoire.
2. [`ARCHITECTURE.md`](ARCHITECTURE.md) — routing, Dexie, Drive layout.
3. **Originals chord paint:** [`originals/DEVELOPMENT.md`](originals/DEVELOPMENT.md) + `.cursor/rules/encore-originals-chord-paint.mdc`.
4. **Copy voice:** [`COPY_STYLE.md`](COPY_STYLE.md).
5. **UI primitives:** [`UI_PRIMITIVES.md`](UI_PRIMITIVES.md) — media rows, integration cards, Spotify sync panels.

## Entry & routing

- App URL: `/encore/` with hash routes (`#/library`, `#/originals`, `#/originals/:id`, …).
- E2E must click **Continue without Google** when the access gate appears.

## High-churn pitfalls

- **Originals selection:** by `ChordMarker.id`, not `charIndex` (multiple chords per word).
- **Loading vs missing:** `activeSong = draft ?? live.song`; spinner until `live.status === 'missing'`.
- **Playback settings popover** can cover Play/Stop — E2E uses `{ force: true }` or open settings after play starts.
- **Document `pointerdown` dismiss:** use `resolveEventTargetElement` before `.closest()` (text nodes break move-to-word).

## Tests

- Navigation: `e2e/encore-originals-navigation.spec.ts`
- Chord paint: `e2e/encore-originals-chord-paint.spec.ts`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
