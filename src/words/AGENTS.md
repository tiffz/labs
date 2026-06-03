# Words — agent context

Nested **`AGENTS.md`** for Words. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — sections, prosody, playback integration.
2. **Shared UI:** [`../shared/SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md) § Playback field selects — use `PlaybackSoundSelect`, `BpmInput`, `ChordStyleInput`, `ChordProgressionInput` with matching `appearance`.
3. **Copy:** [`../docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).
4. **Catalog:** `/ui/` — search before building a new control.

## Pitfalls

- **Playback / notation:** `.cursor/rules/playback-ui-regressions.mdc` + skill `labs-playback-bugfix` (do not duplicate cross-app playback rules here).
- **Words-specific:** routes through shared drums stack — extend in-app for lyric/section semantics only; do not fork scheduling/lifecycle.
- **Notation redraw:** re-apply highlight state immediately after SVG rebuild (`VexLyricScore`).

## Tests

- Unit: `npm test -- src/words`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
