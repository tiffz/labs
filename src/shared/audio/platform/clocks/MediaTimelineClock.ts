import type { TimeSignature } from '../../../rhythm/types';
import type { AudioClockSource, BeatPosition } from './AudioClockSource';

export type MediaTimelineClockOptions = {
  bpm: number;
  timeSignature: TimeSignature;
  anchorMediaTime: number;
  getMediaTime: () => number;
  /** Latency offset: audioContextTime ≈ getMediaTime() + offset (default 0). */
  mediaToAudioOffsetSec?: number;
};

/**
 * Stanza-style media-slaved clock. Maps media timeline → beats using calibration anchor.
 */
export class MediaTimelineClock implements AudioClockSource {
  private _lastBeatIndex: number | null = null;

  constructor(private opts: MediaTimelineClockOptions) {}

  get bpm(): number {
    return this.opts.bpm;
  }

  get timeSignature(): TimeSignature {
    return this.opts.timeSignature;
  }

  get isPlaying(): boolean {
    return true;
  }

  updateOptions(partial: Partial<MediaTimelineClockOptions>): void {
    this.opts = { ...this.opts, ...partial };
    if (
      partial.anchorMediaTime !== undefined ||
      partial.bpm !== undefined ||
      partial.timeSignature !== undefined
    ) {
      this._lastBeatIndex = null;
    }
  }

  /** Reset beat tracking after seek/loop (no catch-up burst). */
  resyncBeatTracking(): void {
    this._lastBeatIndex = null;
  }

  mediaTimeToBeatIndex(mediaTime: number): number {
    const { anchorMediaTime, bpm } = this.opts;
    const period = 60 / bpm;
    return Math.floor((mediaTime - anchorMediaTime) / period + 1e-9);
  }

  beatIndexToMediaTime(beatIndex: number): number {
    const { anchorMediaTime, bpm } = this.opts;
    return anchorMediaTime + beatIndex * (60 / bpm);
  }

  beatAtReferenceTime(referenceTimeSec: number): BeatPosition {
    const mediaTime = referenceTimeSec - (this.opts.mediaToAudioOffsetSec ?? 0);
    const beatIndex = this.mediaTimeToBeatIndex(mediaTime);
    const { bpm } = this.opts;
    const period = 60 / bpm;
    const beatStartMedia = this.beatIndexToMediaTime(beatIndex);
    const frac = (mediaTime - beatStartMedia) / period;
    return beatIndex + Math.max(0, Math.min(1, frac));
  }

  beatToAudioTime(beat: BeatPosition, audioCtx: AudioContext): number {
    const beatIndex = Math.floor(beat);
    const mediaTime = this.beatIndexToMediaTime(beatIndex);
    const frac = beat - beatIndex;
    const period = 60 / this.opts.bpm;
    return (
      audioCtx.currentTime +
      (mediaTime + frac * period - this.opts.getMediaTime()) +
      (this.opts.mediaToAudioOffsetSec ?? 0)
    );
  }

  /**
   * Returns subdivisions newly crossed since last poll (for look-ahead scheduling).
   * On backward jump, resyncs without emitting catch-up events.
   */
  pollBeatCrossings(getMediaTime: () => number): { beatIndex: number; isDownbeat: boolean }[] {
    const beat = this.mediaTimeToBeatIndex(getMediaTime());
    const crossings: { beatIndex: number; isDownbeat: boolean }[] = [];

    if (this._lastBeatIndex === null) {
      this._lastBeatIndex = beat;
      return crossings;
    }

    if (beat > this._lastBeatIndex) {
      for (let b = this._lastBeatIndex + 1; b <= beat; b++) {
        crossings.push({
          beatIndex: b,
          isDownbeat: b % this.opts.timeSignature.numerator === 0,
        });
      }
      this._lastBeatIndex = beat;
    } else if (beat < this._lastBeatIndex) {
      this._lastBeatIndex = beat;
    }

    return crossings;
  }
}

