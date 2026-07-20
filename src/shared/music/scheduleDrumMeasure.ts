import { AudioPlayer } from '../audio/audioPlayer';
import { createDrumAudioPlayer } from '../audio/platform/players/createDrumAudioPlayer';
import { secPerSixteenthAtBpm } from '../playback/measureClock';
import { parseRhythm } from '../rhythm/rhythmParser';
import { getSixteenthsPerMeasure } from '../rhythm/timeSignatureUtils';
import type { TimeSignature } from './chordTypes';

/** Hits more than this late are skipped (clamping them to "now" sounds like a stutter burst). */
export const DRUM_HIT_LATE_SKIP_SEC = 0.005;

export type ScheduleDrumMeasureParams = {
  drumPlayer: AudioPlayer;
  pattern: string;
  timeSignature: TimeSignature;
  tempo: number;
  volume: number;
  /**
   * Absolute AudioContext time for beat 0 of this measure on the drum player's clock.
   * When omitted, defaults to `ctx.currentTime + 0.02` (immediate scheduling).
   */
  measureStartTime?: number;
};

/** Schedule one measure of drum pattern at absolute AudioContext times. */
export function scheduleDrumMeasure({
  drumPlayer,
  pattern,
  timeSignature,
  tempo,
  volume,
  measureStartTime,
}: ScheduleDrumMeasureParams): void {
  if (volume <= 0) return;

  const ctx = drumPlayer.getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const parsed = parseRhythm(pattern, timeSignature);
  if (!parsed.isValid || parsed.measures.length === 0) return;

  const measure = parsed.measures[0]!;
  const secPerSixteenth = secPerSixteenthAtBpm(tempo);
  const baseTime = measureStartTime ?? ctx.currentTime + 0.02;
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const now = ctx.currentTime;
  let cursor = 0;

  for (const note of measure.notes) {
    if (note.sound !== 'rest' && note.sound !== 'simile') {
      const hitTime = baseTime + cursor * secPerSixteenth;
      // Skip overdue hits — AudioPlayer clamps late starts to "now", which piles
      // a measure of drums into one audible stutter when scheduling fell behind.
      if (hitTime >= now - DRUM_HIT_LATE_SKIP_SEC) {
        drumPlayer.playNowIfReady(note.sound, volume, undefined, hitTime);
      }
    }
    cursor += note.durationInSixteenths;
    if (cursor >= sixteenthsPerMeasure) break;
  }
}

export function createChartDrumAudioPlayer(): AudioPlayer {
  return createDrumAudioPlayer({ includeClick: false }).underlying;
}
