# Count Me In — Architecture

## Overview

Count Me In is a web-based metronome with voice counting, click, and drum sounds. It supports simple (/4) and compound/asymmetric (/8) time signatures with configurable subdivisions, beat groupings, and per-beat muting.

## Core Components

### MetronomeEngine (`engine/MetronomeEngine.ts`)

The audio scheduling core. Runs entirely outside React using the Web Audio API **look-ahead scheduling pattern**: a `requestAnimationFrame` loop schedules audio events ~250ms ahead of the current time, ensuring sample-accurate playback even when the main thread is busy.

**Three independent sound sources**, each with a master gain node:

- **Voice** — pre-recorded human speech samples (counting or takadimi)
- **Click** — shared `click.mp3` sample, rate-shifted for subdivisions
- **Drum** — `dum.wav`/`tak.wav`/`ka.wav` mapped to subdivision hierarchy (dum=beat, tak=off-beat, ka=sub-beat)

**Swing timing**: For `swing8` mode, the engine uses a 3-slot triplet grid where the middle slot is marked `silent`. Each slot is 1/3 of a beat (uniform timing). The silence on the middle slot produces the characteristic long-short swing feel. The BeatDisplay renders all three slots but shows the middle one as visually muted.

**Key design decision**: The engine is fully decoupled from React. It communicates beat positions back to the UI via a callback (`onBeat`), which React uses to drive visual highlighting. This separation avoids React re-render jitter affecting audio timing.

### Subdivision Grid (`engine/gridBuilder.ts`)

Generates a flat array of `SubdivGridEntry` objects representing one measure. Each entry specifies:

- `subdivision` type (accent/quarter/eighth/sixteenth) — determines volume channel routing
- `sampleId` — which voice sample to play
- `isGroupStart`, `groupIndex` — for beat grouping display

The grid is rebuilt whenever the time signature, voice mode, or subdivision level changes.

**Subdivision type assignment** follows a clear hierarchy:

- Position 0 of beat 1 → `accent`
- Position 0 of other beats → `quarter`
- Mid-positions → `eighth` or `sixteenth` depending on the level

### Syllable Map (`engine/syllableMap.ts`)

Maps grid positions to voice sample IDs using two systems:

- **Counting** (1 e + a): Standard Western counting with tables for L=2,3,4,6
- **Takadimi**: Rhythmic solfège with tables for L=1–5, cycle fallback for larger groups

### Types (`engine/types.ts`)

`SubdivisionLevel` is the central type controlling grid density:

- `1` — quarter notes only
- `2` — eighth notes (÷2)
- `3` — triplets (÷3)
- `4` — sixteenth notes (÷4)
- `'swing8'` — swung eighths (3-slot triplet grid, middle slot silent)

For /8 meters, only levels `2` and `4` are available (no swing).

### Volume Architecture

Four volume channels (`SubdivisionVolumes`): `accent`, `quarter`, `eighth`, `sixteenth`. Each grid entry routes through one of these channels.

**Three layers of volume control:**

1. **Channel volume** — slider per subdivision tier (DOWNBEAT, BEAT, OFF-BEAT, SUB-BEAT)
2. **Per-beat volume** — individual beat muting via the beat display
3. **Per-source per-channel mutes** — V/C/D buttons hide/show individual sound sources per channel

The mixer relabels channels using metric hierarchy names (DOWNBEAT, BEAT, OFF-BEAT, SUB-BEAT) rather than note values, since the same grid slot can represent different note values depending on the time signature.

## UI Components

### App.tsx

Root component managing all state. Passes gain values and mute sets down to both the engine (for audio) and the mixer/beat display (for visual state).

### BeatDisplay

Shows one box per grid slot, grouped by beat grouping. Supports click-to-mute per box. For swing8, all three triplet positions are shown (1, +, a) with the middle "+" rendered as a non-interactive muted cell to visually convey the silent beat.

### SubdivisionMixer

Volume sliders + subdivision selector + per-channel V/C/D mute buttons. The V/C/D buttons only appear when their respective global sound source is enabled.

### SubdivisionNoteIcon

SVG icons for each subdivision level. Beamed groups (÷2, ÷3, ÷4) use SVG rectangles for beams and ellipses for noteheads. The swing icon shows two beamed notes under a triplet "3" bracket — this avoids needing an eighth-note flag (which is hard to render well in SVG at small sizes).

## Speech Synthesis Pipeline

### Offline Generation

Voice samples are generated offline using `scripts/generate-pulse-voice-pack.mjs`:

1. **TTS rendering**: Each syllable is embedded in a comma-separated carrier phrase (e.g., `"one, two, three"`) and rendered via macOS `say` (neural TTS, default voice: Samantha) to WAV at 48kHz.
2. **Phrase splitting**: `ffmpeg` silence detection splits the carrier phrase into individual words at the comma pauses, producing one WAV per syllable.
3. **Post-processing** (per sample):
   - High-pass filter at 200Hz to remove low rumble
   - Silence trimming (leading and trailing)
   - Duration cap at 150ms for subdivision syllables
   - Loudness normalization (`loudnorm` at -14 LUFS, peak -3 dBFS)
   - 20ms fade-out to prevent clicks

The phrase-context approach ensures consistent prosody and timbre across samples — isolated word synthesis often produces unnatural inflections.

### How to Regenerate Voice Samples

**Prerequisites** (macOS only):

- macOS with the `say` command (ships with the OS)
- `ffmpeg` — install via `brew install ffmpeg`
- The **Samantha** voice must be installed (or specify a different voice with `--voice`)
  - To install voices: **System Settings → Accessibility → Spoken Content → System Voice → Manage Voices**

**Steps:**

```sh
# 1. Preview what the script will do (no files written)
node scripts/generate-pulse-voice-pack.mjs --dry-run

# 2. Generate all samples with the default voice (Samantha)
node scripts/generate-pulse-voice-pack.mjs

# 3. Or use a different voice
node scripts/generate-pulse-voice-pack.mjs --voice "Ava"
```

The script writes all WAV files and a `manifest.json` to `public/count/voice/`. The manifest is read at runtime by `VoicePackLoader` to discover and load available samples.

**What the script generates:**

- 12 beat-number samples (`beat-1.wav` through `beat-12.wav`) — the spoken numbers "One" through "Twelve"
- 3 counting syllables (`ee.wav`, `and.wav`, `uh.wav`) — for the "1 e + a" subdivision system
- 1 counting extension (`la.wav`) — for swing/extended counting
- 3 triplet syllables (`ta.wav`, `ki.wav`, `da.wav`) — for the Takadimi triplet system
- 3 Takadimi syllables (`di.wav`, `mi.wav`, `ka.wav`) — for the Takadimi sixteenth-note system

**Tuning parameters** (constants at the top of the script):
| Parameter | Default | Purpose |
|---|---|---|
| `SPEECH_RATE` | 250 WPM | TTS speaking speed — higher = shorter, snappier syllables |
| `HIGH_PASS_FREQ` | 200 Hz | Removes low-frequency rumble from TTS output |
| `LOUDNORM_I` | -14 LUFS | Target integrated loudness |
| `SUBDIV_MAX_DURATION_SEC` | 0.15 s | Max duration for subdivision samples (trimmed if longer) |
| `SILENCE_THRESHOLD_DB` | -40 dB | Threshold for silence trimming |

After regeneration, refresh the app — voice samples are loaded on demand and not bundled into the JS build.

### Asset Structure

Generated samples live in `public/count/voice/`:

- `manifest.json` — indexes all WAVs by `id`, `text`, `category`, `duration`
- `*.wav` — individual audio files (48kHz, mono)

Categories: `number` (1–12), `syllable` (e, &, a, ta, la, uh, up), `takadimi` (ta, ka, di, mi, ga, ma).

### Runtime Loading

`VoicePackLoader` (`engine/voicePackLoader.ts`) fetches `manifest.json` and all referenced WAVs into a `Map<id, AudioBuffer>`. Failed samples are silently skipped — the engine omits any sample it cannot find.

### Syllable Mapping

Two mapping systems in `engine/syllableMap.ts`:

- **Counting**: Standard Western (1 e + a). Tables for group lengths L=2, 3, 4, 6. Falls back to numeric indices for L=5, 7+.
- **Takadimi**: Rhythmic solfège. Tables for L=1–5 with cyclic fallback for larger groups.

`gridBuilder.ts` assigns a `sampleId` to each grid slot based on the current voice mode, time signature, and beat grouping. Swing has a special case: position 2 of each triplet group uses the `uh` sample (a neutral syllable for the silent beat, only played when the slot is rendered visually).

### Playback Constraints

- **Rate scaling**: For fast tempos where the slot duration is shorter than the sample's natural length, `playbackRate` is increased up to 1.3x to prevent overlap.
- **Voice suppression**: Slots shorter than 100ms suppress voice entirely — the click and drum carry timing at those speeds.

## Audio Scheduling Architecture

### PreciseScheduler (`shared/audio/preciseScheduler.ts`)

A shared composition utility providing robust Web Audio scheduling infrastructure:

- **rAF loop management** — `startLoop(tick)` / `stopLoop()` with `cancelAnimationFrame`
- **Generation counter** — `beginSession()` / `isSessionValid(token)` for async race protection (prevents stale `start()` calls from running after a `stop()`)
- **Source tracking** — `trackSource(node)` / `stopAllSources()` to cancel look-ahead-scheduled audio on stop
- **Timeout tracking** — `scheduleCallback(delay, fn)` / `clearAllCallbacks()` for UI callback cleanup
- **Gain ramp-down** — `rampDown(ctx, gainNodes)` for click-free cutoff

Used by `MetronomeEngine` (Count) and `RhythmPlayer` (Drums + Words).

### Audio Stop Safety

All audio stop paths must ramp gain to zero before stopping sources to prevent audible clicks/static. The two patterns in use:

- **MetronomeEngine**: Calls `scheduler.rampDown(ctx, gainNodes)` on its master gain nodes before `scheduler.stop()`. Since it manages its own gain routing, the scheduler's `stopAllSources()` only cleans up after the ramp.
- **AudioPlayer** (used by `RhythmPlayer`): The `stopAllSounds()` method performs a 15ms `linearRampToValueAtTime(0)` on each source's individual gain node before scheduling `source.stop()`. This handles both immediate stops (pause button) and scheduled chokes (look-ahead note replacement). Sources scheduled for future stop via `atTime` parameter are not ramped since they stop precisely at the next note onset.

**Rule**: Never call `source.stop()` on a playing source without either (a) ramping its gain to 0 first or (b) scheduling the stop to coincide with a new note onset.

### Loop Boundary Scheduling

The rAF look-ahead loop uses a `scheduledUpToSec` watermark to prevent duplicate scheduling. This watermark is advanced to `ctx.currentTime` each frame. When the loop wraps (restarting from the first note), the watermark **must** be reset to the new loop's start time — otherwise the first note's `audioTime` falls below the watermark and is silently skipped.

### Timing Paradigms

| Engine                | Scheduling                                         | Used By      |
| --------------------- | -------------------------------------------------- | ------------ |
| `MetronomeEngine`     | rAF + AudioContext look-ahead via PreciseScheduler | Count        |
| `RhythmPlayer`        | rAF + AudioContext look-ahead via PreciseScheduler | Drums, Words |
| `ScorePlaybackEngine` | rAF + AudioContext look-ahead (own implementation) | Piano        |
| `MetronomePlayer`     | setTimeout (unused by product apps)                | —            |

### URL State Format

Metronome settings sync to the URL for sharing via a hybrid format:

- **Query params** (human-readable): `?bpm=100&ts=8-8&sub=2&vm=counting&bg=3.3.2`
- **Hash fragment** (compact mixer state): `#g100-50-0.v100-74-59-27.cv5`

The hash uses `.`-separated key-value pairs with `-` for sub-values. Channel mute states are encoded as hex bitmasks (accent=8, quarter=4, eighth=2, sixteenth=1). The hash is omitted entirely when all mixer values are at defaults.

## Caveats and Known Limitations

1. **Voice at fast tempos**: Below 100ms per slot, voice samples are suppressed — the click/drum handles timing at those speeds. Between 100ms and the sample's natural duration, playback rate is increased up to 1.3x.

2. **Beat grouping for /4**: Disabled by design. /4 time signatures always use 1+1+1+... grouping. Only /8 meters support custom beat groupings (e.g., 3+3+2 for 8/8).

3. **No /16 time signatures**: Removed due to UX complexity without proportional value.

4. **Swing only for /4**: Swing subdivision is only available for /4 meters. /8 meters have inherent rhythmic grouping that interacts awkwardly with swing.

5. **Quiet count**: Infrastructure exists (`QuietCountConfig`) for alternating play/silent bars, but is not yet exposed in the UI.
