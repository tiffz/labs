# shared/playback — transport, scheduler, score playback

Look-ahead audio scheduling shared by every playback surface. Never schedule audio reactively from React state/UI events (root cause class `reactive-audio`).

## Map

| Area                               | Files                                                    |
| ---------------------------------- | -------------------------------------------------------- |
| Transport + clock                  | `transport.ts`, `measureClock.ts`                        |
| Look-ahead scheduler               | `scheduler.ts`                                           |
| Score playback (notes + metronome) | `scorePlayback.ts`, `track.ts`                           |
| Instruments                        | `instrumentFactory.ts`, `instruments/`                   |
| AudioContext lifecycle             | `audioContextLifecycle.ts` — resume-on-gesture, teardown |

## Contracts

- **Platform doc:** [`docs/SHARED_AUDIO_PLATFORM.md`](../../../docs/SHARED_AUDIO_PLATFORM.md) is canonical for scheduler behavior and budgets.
- **Hook pattern:** app playback hooks follow [`PLAYBACK_HOOK_PATTERN.md`](../hooks/PLAYBACK_HOOK_PATTERN.md); regressions map in [`PLAYBACK_RENDERING_AUDIT.md`](../music/PLAYBACK_RENDERING_AUDIT.md).
- **Stop during instrument load, stuck notes, highlight drift** are known regression classes — read skill [`labs-playback-bugfix`](../../../.cursor/skills/labs-playback-bugfix/SKILL.md) before fixing.
- Audio hash baselines guard output (`scorePlayback.audio.test.ts`); update only via skill `labs-visual-regression` review rules.
