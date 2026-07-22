import type { BeatMap } from '../../../playback/scorePlayback';
import type { TimeSignature } from '../../../rhythm/types';
import type { AudioClockSource, BeatPosition } from './AudioClockSource';

/** ScorePlaybackEngine beat position — optional BeatMap for rubato/video sync. */
export class ScoreTransportClock implements AudioClockSource {
  private _startAudioTime = 0;
  private _playing = false;
  private _elapsedSec = 0;

  bpm: number;
  timeSignature: TimeSignature;
  beatMap: BeatMap | null;

  constructor(bpm: number, timeSignature: TimeSignature, beatMap: BeatMap | null = null) {
    this.bpm = bpm;
    this.timeSignature = timeSignature;
    this.beatMap = beatMap;
  }

  get isPlaying(): boolean {
    return this._playing;
  }

  syncStart(startAudioTime: number, bpm: number): void {
    this._startAudioTime = startAudioTime;
    this.bpm = bpm;
    this._elapsedSec = 0;
    this._playing = true;
  }

  updateElapsed(elapsedSec: number): void {
    this._elapsedSec = elapsedSec;
  }

  stop(): void {
    this._playing = false;
  }

  beatAtReferenceTime(referenceTimeSec: number): BeatPosition {
    void referenceTimeSec;
    if (!this._playing) return 0;
    if (this.beatMap) return this.beatMap.timeToBeat(this._elapsedSec);
    return this._elapsedSec * (this.bpm / 60);
  }

  beatToAudioTime(beat: BeatPosition, audioCtx: AudioContext): number {
    void audioCtx;
    if (this.beatMap) {
      const t = this.beatMap.beatToTime(beat);
      return this._startAudioTime + t;
    }
    return this._startAudioTime + (beat * 60) / this.bpm;
  }
}
