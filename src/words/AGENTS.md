# Words — agent context

Nested **`AGENTS.md`** for Words. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) — sections, prosody, playback integration.
2. **Shared UI:** [`../shared/SHARED_UI_CONVENTIONS.md`](../shared/SHARED_UI_CONVENTIONS.md) § Playback field selects — use `PlaybackSoundSelect`, `BpmInput`, `ChordStyleInput`, `ChordProgressionInput` with matching `appearance`.
3. **Playback hooks:** [`../shared/hooks/PLAYBACK_HOOK_PATTERN.md`](../shared/hooks/PLAYBACK_HOOK_PATTERN.md), [`../shared/music/PLAYBACK_RENDERING_AUDIT.md`](../shared/music/PLAYBACK_RENDERING_AUDIT.md).
4. **Copy:** [`../docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).
5. **Catalog:** `/ui/` — search before building a new control.

## Pitfalls

- **Stable props:** memoize rhythm/style objects passed to `DrumNotationMini` and VexFlow surfaces; no inline `{}`.
- **Portal skins:** sound/style pickers need `appearance` on trigger **and** menu; allowlist `.shared-playback-field-select-popover` on document click-outside.
- **Playback:** routes through shared drums stack — extend in-app for lyric/section semantics only; do not fork scheduling/lifecycle.
- **Notation redraw:** re-apply highlight state immediately after SVG rebuild (`VexLyricScore`).

## Tests

- Unit: `npm test -- src/words`
- Playback UI: `e2e/playback-ui-regressions.spec.ts`
