import type { AudioPlayer } from '../audio/audioPlayer';
import type { Instrument } from '../playback/instruments';
import { scheduleDrumMeasure } from './scheduleDrumMeasure';
import { scheduleStyledChordMeasure } from './scheduleStyledChordMeasure';
import type { ChordStyleId } from './chordStyleOptions';
import type { TimeSignature } from './chordTypes';

/**
 * How late a measure's start may fall behind the shared clock before the whole
 * measure is dropped. One measure being a few ms late is inaudible; beyond this we
 * skip it wholesale rather than clamp it to "now" and fire it late.
 */
export const CHART_MEASURE_LATE_SKIP_SEC = 0.02;

export type ScheduleChartMeasureParams = {
  /** The single shared AudioContext (ADR 0025) — one clock for chord AND drum. */
  ctx: AudioContext;
  /** Absolute time (on `ctx`) for beat 0 of this measure, computed once. */
  measureStartTime: number;
  // Chord
  instrument: Instrument;
  chordSymbol: string;
  chordStyleId: ChordStyleId;
  chordVelocity: number;
  measureDurationSec: number;
  timeSignature: TimeSignature;
  // Drum
  drumPlayer: AudioPlayer | null;
  drumPattern: string;
  drumVolume: number;
  tempo: number;
  /**
   * Async-stop guard checked between the chord and drum schedule. When it returns
   * false the chord voices are cut and the drum is not scheduled (a stop landed
   * mid-measure). Optional so callers without a generation counter can omit it.
   */
  shouldContinue?: () => boolean;
};

export type ChartMeasureScheduleResult = 'scheduled' | 'skipped-late';

/**
 * Schedule one chart measure — chord and drums together on one clock (ADR 0025).
 *
 * The **single late gate**: chord and drum share one context and one decision. If
 * the measure start is overdue past {@link CHART_MEASURE_LATE_SKIP_SEC}, the whole
 * measure is SKIPPED — never clamped to `currentTime`, never fired late. This is the
 * structural fix for the long-play crash (a suspended/backlogged clock used to clamp
 * every overdue note to "now" and blast a pile of voices on resume) and what makes a
 * wide background look-ahead safe: a frozen-clock backlog is dropped, not replayed.
 *
 * Replaces the old divergent handling — the chord path clamped overdue notes (so a
 * late measure still sounded) while the drum path skipped overdue hits (so it went
 * silent). Now both paths make the identical schedule-or-skip decision.
 */
export function scheduleChartMeasure(params: ScheduleChartMeasureParams): ChartMeasureScheduleResult {
  const {
    ctx,
    measureStartTime,
    instrument,
    chordSymbol,
    chordStyleId,
    chordVelocity,
    measureDurationSec,
    timeSignature,
    drumPlayer,
    drumPattern,
    drumVolume,
    tempo,
    shouldContinue,
  } = params;

  if (measureStartTime < ctx.currentTime - CHART_MEASURE_LATE_SKIP_SEC) {
    return 'skipped-late';
  }

  if (chordVelocity > 0) {
    scheduleStyledChordMeasure({
      symbol: chordSymbol,
      styleId: chordStyleId,
      instrument,
      measureStartTime,
      measureDurationSec,
      timeSignature,
      velocity: chordVelocity,
    });
  }

  // A stop can land between the chord and drum schedule — cut the chord voices we
  // just queued and drop the drum rather than leave chord-without-drum ringing.
  if (shouldContinue && !shouldContinue()) {
    instrument.stopAll(0);
    return 'scheduled';
  }

  if (drumVolume > 0 && drumPlayer) {
    scheduleDrumMeasure({
      drumPlayer,
      pattern: drumPattern,
      timeSignature,
      tempo,
      volume: drumVolume,
      measureStartTime,
    });
  }

  return 'scheduled';
}
