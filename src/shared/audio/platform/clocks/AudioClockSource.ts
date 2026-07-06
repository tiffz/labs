import type { TimeSignature } from '../../../rhythm/types';

/** Beat position in fractional beats from pattern/score start. */
export type BeatPosition = number;

/**
 * Pluggable clock for slave-clock apps (loop transport, score, media timeline).
 * Master-clock apps (Count/Midi standalone) use MetronomeEngine directly.
 */
export interface AudioClockSource {
  readonly bpm: number;
  readonly timeSignature: TimeSignature;
  /** Whether transport is actively advancing. */
  readonly isPlaying: boolean;
  /** Current beat index (fractional) at the clock's reference time. */
  beatAtReferenceTime(referenceTimeSec: number): BeatPosition;
  /** Map a beat position to absolute AudioContext time. */
  beatToAudioTime(beat: BeatPosition, audioCtx: AudioContext): number;
  /** Called when seek backward — coordinator resyncs without catch-up burst. */
  onSeekBackward?(fromBeat: BeatPosition, toBeat: BeatPosition): void;
}

export function beatsPerMeasure(ts: TimeSignature): number {
  return ts.numerator * (4 / ts.denominator);
}
