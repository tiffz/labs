import type { TimeSignature } from '../../../rhythm/types';
import type { AudioClockSource, BeatPosition } from './AudioClockSource';

/** rhythmPlayer loop anchor — beats relative to loop start on AudioContext timeline. */
export class LoopTransportClock implements AudioClockSource {
  private _audioStartTimeSec = 0;
  private _playing = false;

  constructor(
    public bpm: number,
    public timeSignature: TimeSignature,
    public loopDurationBeats: number,
  ) {}

  get isPlaying(): boolean {
    return this._playing;
  }

  syncLoopStart(audioStartTimeSec: number, bpm: number): void {
    this._audioStartTimeSec = audioStartTimeSec;
    this.bpm = bpm;
    this._playing = true;
  }

  stop(): void {
    this._playing = false;
  }

  beatAtReferenceTime(referenceTimeSec: number): BeatPosition {
    if (!this._playing) return 0;
    const elapsed = referenceTimeSec - this._audioStartTimeSec;
    const beat = elapsed * (this.bpm / 60);
    if (this.loopDurationBeats <= 0) return Math.max(0, beat);
    return ((beat % this.loopDurationBeats) + this.loopDurationBeats) % this.loopDurationBeats;
  }

  beatToAudioTime(beat: BeatPosition, audioCtx: AudioContext): number {
    void audioCtx;
    return this._audioStartTimeSec + (beat * 60) / this.bpm;
  }
}
