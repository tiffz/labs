# Critical user journeys — Stanza

Durable workflows for manual checks, agent verification, and performance benchmarks.  
UX sketch skill: [`labs-ux-journey`](../../.cursor/skills/labs-ux-journey/SKILL.md). Index: [`docs/CRITICAL_USER_JOURNEYS.md`](../../docs/CRITICAL_USER_JOURNEYS.md).

---

## CUJ-001: Land on library and open account menu

**Primary goal:** Confirm Stanza boots to the landing hero with library entry points and Drive account menu available.  
**Persona:** Returning user checking sync status before pasting a YouTube link.

### Steps

1. Open `/stanza/` → landing hero with Stanza title.
2. Confirm **Paste a YouTube link** field is visible.
3. Open **Account** menu (top right).

### Success criteria

- Hero and account menu render without a blank shell.
- Account menu opens (sign-in or backup row visible).

### Automation

| Type      | Artifact                                    |
| --------- | ------------------------------------------- |
| Smoke     | `e2e/smoke/stanza-library.spec.ts`          |
| App shell | `e2e/smoke/app-shells.spec.ts` (`/stanza/`) |

---

## CUJ-002: Drive backup and merge

**Primary goal:** Keep song library and section markers synced across devices.  
**Persona:** Multi-device user with `silent_union` merge policy (ADR 0020).

### Steps

1. Sign in via account menu.
2. Manual backup or wait for auto-sync after library edit.
3. Non-overlapping edits merge silently. Only true same-song conflicts open the row review dialog.

### Success criteria

- Local library survives refresh; routine divergence does not show a modal.
- Undo last sync available after a pull.

### Automation

| Type       | Artifact                                                             |
| ---------- | -------------------------------------------------------------------- |
| Unit       | `src/stanza/drive/stanzaDriveConflict.test.ts`                       |
| Guardrails | `labsPortfolioDriveHookGuardrails.test.ts` (allowlisted custom hook) |

### Known traps

- Custom `useStanzaDriveBackup` — do not copy into new apps without ADR; use factory when possible (`labs-drive-backup` skill).

---

## CUJ-003: Loop whole song without clipping the tail

**Primary goal:** Practice with **Loop whole song** enabled; playback reaches the natural end and wraps to the start.  
**Persona:** Singer looping a backing track for repetition.

### Steps

1. Open a local-audio song in the viewer.
2. Enable **Loop whole song** (repeat icon in transport).
3. Play through at least one full cycle.

### Success criteria

- Audio plays through the outro (no early cutoff from stale duration metadata).
- Transport wraps to the start and continues playing.

### Automation

| Type  | Artifact                                                                             |
| ----- | ------------------------------------------------------------------------------------ |
| Smoke | `e2e/smoke/stanza-loop-whole-song.spec.ts`, `e2e/smoke/stanza-playback-soak.spec.ts` |
| Unit  | `stanzaTransportLoop.integration.test.ts`, `stanzaMediaDuration.test.ts`             |

See [`docs/STANZA_PLAYBACK.md`](../../docs/STANZA_PLAYBACK.md) for transport invariants.

---

## CUJ-003b: Play through without premature stop

**Primary goal:** With **Play through** (loop off), local audio reaches the real file end — not a short metadata `ended`.  
**Persona:** Singer listening once end-to-end.

### Success criteria

- Timeline duration uses decoded PCM / fingerprint when HTML5 metadata is short.
- If HTML5 fires `ended` early while a known horizon still extends, playback resumes past that point.
- No speculative resume without evidence (decode, fingerprint, or longer seekable/buffered).

### Automation

| Type  | Artifact                                    |
| ----- | ------------------------------------------- |
| Smoke | `e2e/smoke/stanza-playthrough-tail.spec.ts` |
| Unit  | `stanzaMediaDuration.test.ts`               |

See [`docs/STANZA_PLAYBACK.md`](../../docs/STANZA_PLAYBACK.md) § Duration trust model.

---

## CUJ-004: Practice rail pitch row at desktop rail width

**Primary goal:** Calibrate pitch (original key, shift, playback result) in one dense row without control overlap.  
**Persona:** Singer adjusting transpose while watching the video.

### Success criteria

- Original key, shift stepper, and playback chip share one row at ~392px rail width.
- Controls do not horizontally overlap.

### Automation

| Type  | Artifact                                   |
| ----- | ------------------------------------------ |
| Smoke | `e2e/smoke/stanza-practice-rail.spec.ts`   |
| Unit  | — (layout asserted in Playwright geometry) |

---

## CUJ-005: Practice a song with metronome and drums

**Primary goal:** Play a song with a click and a drum layer that stay locked to the recording.
**Persona:** The owner practising a song she is learning — the app's single most-used journey.

### Steps

1. Open a song with a calibrated BPM + Beat 1 anchor.
2. Enable the metronome; enable **Add drums**.
3. Play. Let it run for at least a full section.

### Success criteria

- The click and the drum layer are **audible from the first beat**, not after a delay.
- Both stay in phase with the recording for the whole section — no cumulative drift.
- The drum highlight in the notation matches what you hear.
- Enabling drums on a song that has **never been calibrated** still produces sound
  (falls back to `STANZA_DRUMS_DEFAULT_BPM`, anchor 0).

### Automation

| Type       | Artifact                                                         |
| ---------- | ---------------------------------------------------------------- |
| Unit       | `src/shared/audio/platform/hooks/drumSchedulerLifetime.test.ts`  |
| Guardrails | `src/shared/audio/platform/backgroundPlaybackGuardrails.test.ts` |

### Known traps

- The drum scheduler must **not** be gated on `drumsHasGrid` — the fallback values exist
  precisely so an uncalibrated song still plays.
- Never `await` an asset load inside the scheduling tick; warm samples before the clock starts,
  and skip a not-ready tick **without** advancing the scheduled cursor or the opening beats are
  dropped silently with no retry.

---

## CUJ-006: Keep practising while the tab is in the background

**Primary goal:** Put on a practice track and multitask without the accompaniment dropping out.
**Persona:** The owner working in another tab with a track running.

### Steps

1. Start playback with metronome and/or drums enabled.
2. Switch to another browser tab for at least 30 seconds.
3. Switch back.

### Success criteria

- **All** audio layers keep playing while hidden — not just the `<audio>` element.
- On return, the click and drums are still in phase with the recording.
- No burst of backlogged audio on resume.

### Automation

| Type       | Artifact                                                         |
| ---------- | ---------------------------------------------------------------- |
| Guardrails | `src/shared/audio/platform/backgroundPlaybackGuardrails.test.ts` |

### Known traps

- A hidden tab pauses `requestAnimationFrame` entirely but keeps a media element playing. Any
  rAF-only driver silently desyncs. Drivers need a `document.hidden`-gated timer **and** a wider
  look-ahead horizon, since timers throttle to ~1 Hz when hidden.

---

## CUJ-007: Loop a section for a long practice sitting

**Primary goal:** Loop one section repeatedly for many minutes without the app degrading.
**Persona:** The owner drilling a hard passage.

### Steps

1. Select a section loop.
2. Let it wrap continuously for 10+ minutes.

### Success criteria

- Audio quality and timing are identical at minute 10 and minute 1.
- The tab does not crash, and memory does not grow without bound.
- The metronome and drums do not go silent partway through.

### Automation

| Type | Artifact                                                                |
| ---- | ----------------------------------------------------------------------- |
| Unit | `src/shared/audio/platform/hooks/drumSchedulerLifetime.test.ts`         |
| Unit | `src/shared/audio/platform/hooks/platformMetronomeAudioContext.test.ts` |

### Known traps

- `playUnified` re-runs on **every** loop wrap. Anything it allocates — an `AudioContext`, an
  `AudioPlayer`, decoded samples, listeners — leaks once per wrap unless it is reused or released.
  Two such leaks caused crashes after extended looping; browsers cap AudioContexts per document
  and then throw, so aux audio goes permanently silent before the tab dies.
- This is the same failure shape as the Encore playback OOM behind
  [ADR 0025](../../docs/adr/0025-chart-playback-single-transport.md).

---

## CUJ-008: Detect a song's tempo

**Primary goal:** Get a BPM and beat grid that the metronome and drums can lock to.
**Persona:** The owner adding a new song to practise.

### Steps

1. Open a song with local audio.
2. Run tempo analysis.

### Success criteria

- The detected BPM is correct within ±2% (a 2% error drifts ~5 seconds over 4 minutes).
- The result is **identical regardless of the output device's sample rate**.
- Analysis does not freeze the UI.

### Automation

| Type | Artifact                                           |
| ---- | -------------------------------------------------- |
| Unit | `src/shared/beat/beatAnalysisSampleRate.test.ts`   |
| Unit | `src/shared/beat/shortClipBpm.integration.test.ts` |

### Known traps

- Essentia's rhythm algorithms have **no sample-rate parameter** — 44.1 kHz is fixed inside the
  algorithm. Decoding through the live playback `AudioContext` (48 kHz on most Macs and every
  Bluetooth device) scaled every tempo by 0.91875 with no error and no drop in confidence. Route
  analysis audio through `toBeatAnalysisBuffer` and keep the fail-closed rate asserts.
- Every synthetic fixture is generated at exactly 44100, so the suite was structurally blind to
  this. Parametrise new tempo tests over both rates.
- Known limitation: octave errors (half/double time) are **not** reliably solvable automatically.
  Measured five policies — a ~120 BPM perceptual prior, three half-time lifts, and a loop-estimator
  tie-break — and every one scored _worse_ overall than no policy at all. The product answer is a
  x2 / ÷2 control, not a smarter heuristic.
