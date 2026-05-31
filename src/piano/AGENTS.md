# Piano — agent context

Nested **`AGENTS.md`** for Piano. Root policy: [`../../AGENTS.md`](../../AGENTS.md).

## Start here

1. [`README.md`](README.md) + [`ARCHITECTURE.md`](ARCHITECTURE.md) — score model, store, practice pipeline.
2. **Shared UI:** [`/ui/`](/ui/) — `BpmInput`, `KeyInput`, `PlaybackSpeedControl`, `AppLinearVolumeSlider`.
3. **Notation:** [`src/shared/notation/`](../shared/notation/) — `ScoreDisplay`, highlight sync via `playbackSvgHighlight.ts`.
4. **Playback:** [`src/shared/hooks/PLAYBACK_HOOK_PATTERN.md`](../shared/hooks/PLAYBACK_HOOK_PATTERN.md).
5. **Copy:** [`docs/USER_COPY_STYLE.md`](../../docs/USER_COPY_STYLE.md).

## Pitfalls

- Score edits go through `storeTypes.ts` + `store.tsx`; keep reducer invariants in `store.test.ts`.
- Lazy-load heavy surfaces (`VideoPlayer`, modals) per `STYLE_GUIDE.md` bundle hygiene.
- Prefer `midiToPitchStringForKey` from `scoreTypes` for VexFlow pitch strings.

## Tests

- Unit: `npm test -- src/piano`
- Store: `src/piano/store.test.ts`
