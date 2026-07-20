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
└─ Chart measure boundaries (Chords, Encore)
   └─ LookAheadAudioScheduler measure transport in useChartChordPlayback
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

| App    | Clock     | Metronome  | Drums                | Mix         |
| ------ | --------- | ---------- | -------------------- | ----------- |
| Count  | master    | engine     | engine subdiv        | local mixer |
| Midi   | master    | engine     | —                    | —           |
| Drums  | loop      | look-ahead | look-ahead           | mix bus     |
| Words  | loop      | look-ahead | look-ahead + backing | mix bus     |
| Piano  | score     | look-ahead | look-ahead           | mix bus     |
| Chords | transport | look-ahead | —                    | mix bus     |
| Stanza | media     | look-ahead | look-ahead           | mix bus     |
| Encore | transport | —          | measure              | mix bus     |

Midi loop capture playback and the Chords/Encore chart transport both run on
`LookAheadAudioScheduler`; the `audioPatternRegistry.test.ts` guardrail fails if
`setTimeout`/`setInterval` note clocks reappear in those files.

## Exceptions (documented, not templates)

- **Agility** — `singInTimeClock` oscillators; out of scope

## Lifecycle

`MetronomeEngine.dispose()` (and `MetronomeRuntimeCoordinator.dispose()`) close the
owned AudioContext. Call from unmount cleanup — `stop()` alone leaves a live audio
thread.

### Tab hide / resume (required for look-ahead transports)

When a tab is backgrounded, Chrome often **suspends `AudioContext`** (`currentTime` freezes)
while `performance.now()` keeps advancing. Mapping perf→audio then clamping overdue notes
to “now” causes a **loud blast on resume**. Long section loops that only mute the bus on
`stopAll` (without stopping voices) also leak AudioNodes until the tab Aw-Snaps.

**Rules:**

1. `LookAheadAudioScheduler` **skips ticks while `document.hidden`** (do not extend look-ahead into a frozen clock).
2. Chart / loop hosts use `attachTransportVisibilityGuard` — flush + invalidate generation on hide; **re-anchor epoch** on show.
3. `BaseInstrument.stopAll` must **hard-stop tracked voices** (not only mute the output bus).
4. Auto-`resume()` of AudioContext only when `document.visibilityState === 'visible'`.

### Stutter / gap hardening (chart + drums)

Audible pauses or “stutter bursts” almost always mean the scheduler fell behind and late
hits were clamped to `AudioContext.currentTime`. Prevent that class of bug:

1. **Warm assets before the transport clock starts** (instrument samples + drum buffers). Do not `await` loads inside the look-ahead tick.
2. **Schedule synchronously on the hot path** once assets are ready.
3. Chart transports use a deeper horizon (`CHART_LOOK_AHEAD_SEC`) than the default 250ms loop tick.
4. **Loop by advancing the epoch** (`epoch += loopDuration`) — never re-anchor to `performance.now()` at wrap (that opens a gap every pass).
5. **Skip** hits that are already late (`DRUM_HIT_LATE_SKIP_SEC`); do not clamp a whole measure to “now”.
6. Throttle React beat/highlight updates so VexFlow work cannot starve the audio rAF tick.

### Screen wake lock (phone practice)

Use `usePlaybackWakeLock(active)` while transport/metronome audio is running so the phone
does not dim mid-practice. Count, Stanza, Words, Drums, Piano, and Encore chart playback
already wire this. Wake lock keeps the **screen** on; locking the phone may still suspend
Web Audio in some mobile browsers.

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
