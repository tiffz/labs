import type { TimeSignature } from '../../../rhythm/types';
import type { AudioClockSource, BeatPosition } from './AudioClockSource';
import { beatsPerMeasure } from './AudioClockSource';

/** Standalone metronome — AudioContext owns tempo from a fixed start time. */
export class MasterAudioClock implements AudioClockSource {
  private _startAudioTime = 0;
  private _playing = false;

  constructor(
    public bpm: number,
    public timeSignature: TimeSignature,
  ) {}

  get isPlaying(): boolean {
    return this._playing;
  }

  start(audioCtx: AudioContext, atTime?: number): void {
    this._startAudioTime = atTime ?? audioCtx.currentTime;
    this._playing = true;
  }

  stop(): void {
    this._playing = false;
  }

  setTempo(bpm: number): void {
    this.bpm = bpm;
  }

  beatAtReferenceTime(referenceTimeSec: number): BeatPosition {
    if (!this._playing) return 0;
    const elapsed = referenceTimeSec - this._startAudioTime;
    return Math.max(0, elapsed * (this.bpm / 60));
  }

  beatToAudioTime(beat: BeatPosition, audioCtx: AudioContext): number {
    void audioCtx;
    return this._startAudioTime + (beat * 60) / this.bpm;
  }

  measureLengthBeats(): number {
    return beatsPerMeasure(this.timeSignature);
  }
}
