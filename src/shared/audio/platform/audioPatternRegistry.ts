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
  stanza: {
    clock: 'media-timeline',
    metronomeScheduler: 'look-ahead-precise',
    drumScheduler: 'look-ahead-precise',
    mixBus: 'labs-audio-mix-bus',
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
