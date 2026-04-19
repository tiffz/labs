# Pitch

A real-time pitch-detection playground that surfaces the microphone's detected pitch, frequency, and cents-off-from-nearest-note, with visual indicators for musicians to practice intonation.

Route: `/pitch/`.

## Features

- **Live pitch detection** — consumes `src/shared/music/pitch/microphonePitchInput` for YIN-based detection.
- **Device selection** — switch microphones without reloading; selection persists per session.
- **Cent indicator** — shows how flat/sharp the detected pitch is relative to the nearest equal-tempered note.
- **Listen/Stop affordance** — explicit start/stop avoids unexpected audio initialization (important for privacy and to make first use predictable).

## Architecture

```text
src/pitch/
├── App.tsx              # Shell, state, mic lifecycle
├── App.test.tsx         # Unit tests (mocks `listDevices` for JSDOM)
├── e2e/                 # Playwright specs specific to /pitch/
└── styles/              # Pitch-specific CSS
```

## Testing

- Unit: `npx vitest run src/pitch/App.test.tsx`
- E2E smoke: `/pitch/` is covered by `e2e/smoke/app-shells.spec.ts`
- Visual regression: `e2e/visual/apps.visual.spec.ts` includes pitch baselines

### Testing notes

JSDOM does not provide `navigator.mediaDevices`. Unit tests mock `MicrophonePitchInput.listDevices` to return a fixed device list. Any new test that renders `<App />` must do the same or it will throw during mount.

## Shared Dependencies

- `src/shared/music/pitch/microphonePitchInput` — mic permission + YIN pitch detector
- `src/shared/music/pitch/acousticInput` — the shared factory used by Piano and Scales (not currently consumed directly here, but the detector is the same underlying primitive)
- `src/shared/components/` — tooltip and shared layout primitives
