import { AudioPlayer } from '../audio/audioPlayer';
import { DRUM_SAMPLE_URLS } from '../audio/drumSampleUrls';
import { parseRhythm } from '../rhythm/rhythmParser';
import type { TimeSignature } from './chordTypes';

export type ScheduleDrumMeasureParams = {
  drumPlayer: AudioPlayer;
  pattern: string;
  timeSignature: TimeSignature;
  tempo: number;
  volume: number;
};

function sixteenthsPerMeasure(timeSignature: TimeSignature): number {
  return Math.max(4, Math.round((timeSignature.numerator * 16) / timeSignature.denominator));
}

/** Schedule one measure of drum pattern at absolute AudioContext times. */
export function scheduleDrumMeasure({
  drumPlayer,
  pattern,
  timeSignature,
  tempo,
  volume,
}: ScheduleDrumMeasureParams): void {
  if (volume <= 0) return;

  const ctx = drumPlayer.getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const parsed = parseRhythm(pattern, timeSignature);
  if (!parsed.isValid || parsed.measures.length === 0) return;

  const measure = parsed.measures[0]!;
  const secPerSixteenth = 60 / tempo / 4;
  // Always anchor to the drum player's clock — callers may pass a start time from
  // a different AudioContext (e.g. chord instrument), which would clamp later hits to "now".
  const baseTime = ctx.currentTime + 0.02;
  let cursor = 0;

  for (const note of measure.notes) {
    if (note.sound !== 'rest' && note.sound !== 'simile') {
      const hitTime = baseTime + cursor * secPerSixteenth;
      drumPlayer.playNowIfReady(note.sound, volume, undefined, hitTime);
    }
    cursor += note.durationInSixteenths;
    if (cursor >= sixteenthsPerMeasure(timeSignature)) break;
  }
}

export function createChartDrumAudioPlayer(): AudioPlayer {
  return new AudioPlayer({
    soundUrls: { ...DRUM_SAMPLE_URLS },
    enableReverb: false,
  });
}
