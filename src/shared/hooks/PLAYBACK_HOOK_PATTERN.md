# Playback hook pattern

Template for hooks that drive chart/measure playback with Web Audio and synced notation UI. Reference implementation: [`useChartChordPlayback.ts`](./useChartChordPlayback.ts).

## When to use

- Multi-step chart or measure playback with async instrument setup.
- UI that must stay in sync with audio (drum mini notation, active chord highlight).
- Any hook where **Stop** must feel immediate even when `ensureInstrument` or sample loading is in flight.

## Required pieces

### 1. Generation token (async race guard)

```ts
const playbackGenerationRef = useRef(0);

const stop = useCallback(() => {
  playbackGenerationRef.current += 1;
  // clear timers, set playing false, call instrumentSession.stopAll()
}, []);

async function playMeasure(step: Step, generation: number) {
  await ensureInstrument();
  if (generation !== playbackGenerationRef.current) return;
  scheduleStyledChordMeasure(/* … */);
}
```

Bump generation **before** clearing timers and **before** any `await` in the stop path. Re-check after every `await` in the play path.

### 2. Real stop (not gain duck)

`BaseInstrument.stopAll()` must mute and **swap to a fresh output bus** so already-scheduled notes cannot play after stop. See `src/shared/audio/instrument.ts`.

### 3. Synchronous display state

Derive notation pointer / active step with `useMemo` from elapsed time + sequence, not `useEffect` → `setState` (one-frame lag breaks drum highlight).

Keep props to notation children stable: module-level style constants, memoized rhythm copies.

### 4. Explicit loading / empty states

Consumers should distinguish:

| State              | UI                                               |
| ------------------ | ------------------------------------------------ |
| Query in flight    | Spinner (`aria-busy`, `aria-label="Loading …"`)  |
| Definitive missing | Terminal empty / error copy                      |
| Ready              | Render from `draft ?? live.entity` synchronously |

Do not show “not found” while `status === 'ok'` but local draft is still catching up.

## Tests to add

Copy the cases in [`useChartChordPlayback.test.ts`](./useChartChordPlayback.test.ts):

- Stop during in-flight `ensureInstrument` → no scheduling calls.
- Generation bump invalidates stale `playMeasure` continuations.
- Settings / layout changes while idle do not leak timers.

Instrument-level: [`instrument.test.ts`](../playback/instruments/instrument.test.ts) — `stopAll` abandons scheduled output.

## Related docs

- [`PLAYBACK_RENDERING_AUDIT.md`](../music/PLAYBACK_RENDERING_AUDIT.md) — VexFlow order, highlight persistence.
- [`SHARED_UI_CONVENTIONS.md`](../SHARED_UI_CONVENTIONS.md) — portaled playback picker checklist.
- [`docs/REGRESSION_WORKFLOW.md`](../../../docs/REGRESSION_WORKFLOW.md) — Playwright smokes for cross-app playback UI.
