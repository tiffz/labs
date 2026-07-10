# Stanza playback invariants

Canonical reference for transport, loop, and skip behavior in the song viewer. Policy code lives under `src/stanza/utils/`; orchestration in `src/stanza/hooks/useStanzaTransportLoop.ts` (extracted from `StanzaWorkspace.tsx`).

Related ADRs: [0003](../docs/adr/0003-stanza-multi-stem-playback.md) (stems), [0004](../docs/adr/0004-stanza-stem-web-audio-mixer.md) (Web Audio mix), [0008](../docs/adr/0008-stanza-section-marker-model-and-metronome-calibration.md) (sections + skip), [0009](../docs/adr/0009-stanza-drums-and-metronome-volume.md) (drums vs metronome time).

## Three clocks

| Clock                | Source                                                              | Used for                                                      |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Live transport**   | YouTube IFrame `getCurrentTime()` or `HTMLMediaElement.currentTime` | Loop RAF, metronome while playing (`getTime()`), skip advance |
| **`timeRef`**        | Mirrored from React + seek writes                                   | Metronome while paused, marker placement helpers              |
| **`playback` state** | `timeupdate` / YouTube poll (40ms merge epsilon)                    | Timeline paint, drums beat index                              |

Display paint may clamp the playhead in **loop selection** mode (`stanzaPlayheadDisplayTime`); audible transport follows live DOM unless programmatically seeked.

## Loop modes

| Mode            | Window          | Wrap boundary                                           |
| --------------- | --------------- | ------------------------------------------------------- |
| `through`       | Full track      | None                                                    |
| `loopAll`       | `[0, duration]` | Playable end (`resolvePlayableWindowAnchors`)           |
| `loopSelection` | Selection span  | Playable end inside span (not marker tail when skipped) |

Wrap triggers (coalesced via `stanzaLoopWrapGuard`):

1. **RAF stall** — `decideStanzaLoopWrap` when transport stops advancing near the playable end (handles duration metadata drift).
2. **`onEnded` / YouTube `ENDED`** — `handleLoopAtMediaEnd` seeks to playable loop start and resumes.

Both paths share the same guard so duplicate seeks do not fire in the same turn.

## Skipped sections

- **Manual seeks** (`userSeekUnified`) may land inside skipped sections; honored until the playhead leaves that section.
- **Forward playback / loop wraps** use `nextNonSkippedTimeForwardPlayback` and `resolvePlayableWindowAnchors`.
- If **no playable section** overlaps the loop window, skip advance returns `null` and transport **pauses once** (no infinite seek loop).

## Duration trust model (local files)

**Source of truth for “how long is this file?”** (highest wins):

1. **Decoded `AudioBuffer.duration`** — `useStanzaLocalDecodedDuration` (PCM length; ignores short HTML5 metadata).
2. **Probed fingerprint duration** — `size:duration` from import (`stanzaFingerprintDurationSec`).
3. **Live element** — `max(HTMLMediaElement.duration, seekable.end)`.
4. **Grown transport** — RAF may extend `durationRef` if the playhead runs past reported metadata.

**Marker / section layout duration is separate** — it may be longer than the local file (YouTube markers on a dual-source song) and must **not** drive loop/play-through end.

**Play-through premature `ended`:** Resume only with **evidence** (longer seekable/buffered, or known horizon from decode/fingerprint). No speculative nudges without evidence. Resume uses `playUnified` so transpose/stems restart.

## Tests

| Layer       | Files                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy      | `stanzaPlaybackLoop.test.ts`, `stanzaSkippedSections.test.ts`, `stanzaLoopWrapDecision.test.ts`, `stanzaLoopWrapGuard.test.ts`, `stanzaMediaDuration.test.ts` |
| Integration | `stanzaTransportLoop.integration.test.ts`, `useStanzaTransportLoop.test.ts`                                                                                   |
| E2e         | `e2e/smoke/stanza-loop-whole-song.spec.ts`, `e2e/smoke/stanza-playthrough-tail.spec.ts`                                                                       |

When changing wrap or skip semantics, update the integration tests first, then the hook.

## Agent checklist

1. Prefer extending **pure utils** + integration tests before editing `StanzaWorkspace.tsx`.
2. Loop wrap must use **playable anchors**, not raw marker span ends, when skips exist.
3. New wrap entry points must go through **`createStanzaLoopWrapGuard`** (or `useStanzaTransportLoop`).
4. Local pause paths must stop **transpose mirror / stem bus** (same as `pauseUnified`).
5. Shell / provider changes → run `npm run presubmit` and scoped e2e (`stanza-loop-whole-song` / `stanza-playthrough-tail` when touching transport).
6. Local duration trust: prefer decoded PCM / fingerprint over HTML5 metadata; never drive play-through end from marker layout duration.
