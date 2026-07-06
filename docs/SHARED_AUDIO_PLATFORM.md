# Shared Audio Platform

Single entry for Labs music-app audio: clocks, look-ahead scheduling, mix bus, drums, and metronome.

**Module:** [`src/shared/audio/platform/`](../src/shared/audio/platform/) · **ADR:** [0021](adr/0021-shared-audio-platform.md), [0022](adr/0022-advanced-metronome-preferences.md)

## When to read this

- Adding or changing **metronome**, **darbuka/drum accompaniment**, or **volume mix** in any music app
- Fixing **timing drift** or **reactive audio** (beat detected in React → play now)
- Choosing which **clock** owns tempo for a new feature

## Decision tree — clock owner

```text
Who owns time for this feature?
├─ App starts/stops transport on AudioContext (Count, Midi loop)
│  └─ MasterAudioClock / MetronomeEngine as master
├─ Looping rhythm pattern (Drums, Words main playback)
│  └─ LoopTransportClock + rhythmPlayer anchor
├─ Notated score with optional rubato (Piano, Scales)
│  └─ ScoreTransportClock + BeatMap
├─ HTML media element (Stanza practice)
│  └─ MediaTimelineClock — slave to getMediaTime() + anchor
└─ Chart measure boundaries only (Encore) — documented exception
   └─ measure look-ahead; see PROCESS_BACKLOG for setInterval migration
```

## Decision tree — scheduling

```text
Grid-aligned hit (click, dum/tak, pattern note)?
├─ YES → LookAheadAudioScheduler / PreciseScheduler on ctx.currentTime
│         Use scheduleDrumPatternWindow for darbuka patterns
└─ NO (one-shot preview, user gesture) → AudioPlayer.play() OK
```

**Forbidden for new code:** `playClickSampleAt(ctx, sample, ctx.currentTime)` on beat crossings; Words backing beat reactive `useEffect`; Stanza rAF immediate clicks.

## Decision tree — mix

```text
Need master × channel gain?
└─ useAudioMixBus() — bind existing sliders; do not duplicate math
   Channels: master, drums, metronome, backing, accent
```

## Decision tree — metronome UI

```text
Power-user subdivisions / vocal / takadimi?
└─ MetronomeSplitControl (toggle + chevron panel)
   Default prefs → legacy click path (zero regression)
   Non-default → MetronomeRuntimeCoordinator + MetronomeEngine
```

Count Me In keeps its full-screen SubdivisionMixer; other apps use the split control popover.

## App registry

See [`audioPatternRegistry.ts`](../src/shared/audio/platform/audioPatternRegistry.ts) — enforced by `audioPatternRegistry.test.ts`.

| App    | Clock        | Metronome  | Drums                | Mix         |
| ------ | ------------ | ---------- | -------------------- | ----------- |
| Count  | master       | engine     | engine subdiv        | local mixer |
| Midi   | master       | engine     | —                    | —           |
| Drums  | loop         | look-ahead | look-ahead           | mix bus     |
| Words  | loop         | look-ahead | look-ahead + backing | mix bus     |
| Piano  | score        | look-ahead | look-ahead           | mix bus     |
| Chords | transport    | look-ahead | —                    | mix bus     |
| Stanza | media        | look-ahead | look-ahead           | mix bus     |
| Encore | wall-clock\* | —          | measure              | mix bus     |

\*Encore chart `setInterval` — backlog item; do not copy.

## Exceptions (documented, not templates)

- **Agility** — `singInTimeClock` oscillators; out of scope
- **Midi loop notes** — reactive; backlog
- **Encore chart transport** — measure interval; migrate when touching charts

## Tests to run when touching platform code

```bash
npm test -- src/shared/audio/platform
npm run test:changed-apps
```

E2E: `e2e/smoke/metronome-advanced-settings.spec.ts`

## Related docs

- [`PLAYBACK_HOOK_PATTERN.md`](../src/shared/hooks/PLAYBACK_HOOK_PATTERN.md)
- [`SHARED_UI_CONVENTIONS.md`](../src/shared/SHARED_UI_CONVENTIONS.md) — MetronomeSplitControl, DrumAccentSettingsPanel
- [`STANZA_PLAYBACK.md`](STANZA_PLAYBACK.md)
- [`GESTURE_MEDIA_STABILITY.md`](GESTURE_MEDIA_STABILITY.md) — not this platform; media tiers for Gesture
