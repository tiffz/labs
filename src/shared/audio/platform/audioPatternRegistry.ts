/**
 * Approved audio patterns per music app — keep in sync with docs/SHARED_AUDIO_PLATFORM.md.
 * Guardrail: audioPatternRegistry.test.ts
 */

export type ClockPattern =
  | 'master-audio'
  | 'loop-transport'
  | 'score-transport'
  | 'media-timeline'
  | 'transport-interval'
  | 'wall-clock-exception';

export type SchedulerPattern =
  | 'look-ahead-precise'
  | 'look-ahead-score'
  | 'measure-look-ahead'
  /**
   * Media-slaved poll: reads the element clock each tick and schedules a short window ahead.
   * Not forbidden — it is the honest description of Stanza's drum and metronome drivers, which
   * are NOT built on the shared `LookAheadAudioScheduler`. Recorded so the divergence is visible
   * rather than mislabelled as look-ahead.
   */
  | 'reactive-poll'
  | 'reactive-forbidden';

export type AppAudioPattern = {
  clock: ClockPattern;
  metronomeScheduler: SchedulerPattern | 'none';
  drumScheduler: SchedulerPattern | 'none' | 'metronome-engine-subdiv';
  mixBus: 'labs-audio-mix-bus' | 'legacy-local';
};

export const AUDIO_PATTERN_REGISTRY: Record<string, AppAudioPattern> = {
  count: {
    clock: 'master-audio',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'metronome-engine-subdiv',
    mixBus: 'legacy-local',
  },
  midi: {
    clock: 'master-audio',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'none',
    mixBus: 'legacy-local',
  },
  drums: {
    clock: 'loop-transport',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'look-ahead-precise',
    mixBus: 'labs-audio-mix-bus',
  },
  words: {
    clock: 'loop-transport',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'look-ahead-precise',
    mixBus: 'labs-audio-mix-bus',
  },
  piano: {
    clock: 'score-transport',
    metronomeScheduler: 'look-ahead-score',
    drumScheduler: 'look-ahead-score',
    mixBus: 'labs-audio-mix-bus',
  },
  scales: {
    clock: 'score-transport',
    metronomeScheduler: 'look-ahead-score',
    drumScheduler: 'none',
    mixBus: 'legacy-local',
  },
  chords: {
    clock: 'transport-interval',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'none',
    mixBus: 'labs-audio-mix-bus',
  },
  // Corrected to reality 2026-08. These rows previously claimed 'look-ahead-precise' and
  // 'labs-audio-mix-bus'; Stanza uses neither. Because the guardrail test compares these string
  // literals to string literals, it certified the claim and the divergence was invisible to CI —
  // which is how a cluster of audio bugs shipped without a single test noticing. Do not "fix" a
  // row by editing it back; fix the code, then update the row.
  stanza: {
    clock: 'media-timeline',
    // Media-slaved rAF/timer poll, not the shared LookAheadAudioScheduler.
    metronomeScheduler: 'reactive-poll',
    drumScheduler: 'reactive-poll',
    // No LabsAudioMixBus usage anywhere under src/stanza — gains are applied per-layer.
    mixBus: 'legacy-local',
  },
  encore: {
    clock: 'transport-interval',
    metronomeScheduler: 'none',
    drumScheduler: 'measure-look-ahead',
    mixBus: 'labs-audio-mix-bus',
  },
  agility: {
    clock: 'wall-clock-exception',
    metronomeScheduler: 'wall-clock-exception' as SchedulerPattern,
    drumScheduler: 'none',
    mixBus: 'legacy-local',
  },
};

/** Patterns that must not appear in new grid-aligned audio code. */
export const FORBIDDEN_REACTIVE_PATTERNS = [
  'playClickSampleAt(ctx, sample, ctx.currentTime',
] as const;

/**
 * Files migrated off wall-clock note scheduling. New grid-aligned audio must
 * use the look-ahead scheduler — never setTimeout/setInterval note clocks.
 * Guardrail: audioPatternRegistry.test.ts scans these files for regressions.
 */
export const WALL_CLOCK_FORBIDDEN_FILES = [
  { file: 'shared/hooks/useChartChordPlayback.ts', patterns: ['setInterval(', 'setTimeout('] },
  { file: 'midi/store.tsx', patterns: ['setInterval(', 'setTimeout('] },
] as const;
