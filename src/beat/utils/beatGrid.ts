import type { TimeSignature } from '../../shared/rhythm/types';
import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';

export interface BeatGridPosition {
  measure: number; // 0-indexed measure number
  beat: number; // 0-indexed beat within measure
  sixteenth: number; // 0-indexed sixteenth within beat
  progress: number; // 0-1 progress within the sixteenth
}

/**
 * Beat grid for tracking position in music
 */
export class BeatGrid {
  private bpm: number;
  private timeSignature: TimeSignature;
  private startOffset: number;
  private sixteenthsPerMeasure: number;
  private beatsPerMeasure: number;

  constructor(bpm: number, timeSignature: TimeSignature, startOffset: number = 0) {
    this.bpm = bpm;
    this.timeSignature = timeSignature;
    this.startOffset = startOffset;
    this.sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    this.beatsPerMeasure = timeSignature.numerator;
  }

  /**
   * Get the duration of a sixteenth note in seconds
   */
  get sixteenthDuration(): number {
    // BPM is quarter notes per minute
    // A quarter note = 4 sixteenths
    return 60 / this.bpm / 4;
  }

  /**
   * Get the duration of a beat in seconds
   */
  get beatDuration(): number {
    if (this.timeSignature.denominator === 4) {
      // Quarter note beats
      return 60 / this.bpm;
    } else {
      // Eighth note beats (for /8 time signatures)
      return 60 / this.bpm / 2;
    }
  }

  /**
   * Get the duration of a measure in seconds
   */
  get measureDuration(): number {
    return this.sixteenthsPerMeasure * this.sixteenthDuration;
  }

  /**
   * Convert a time position (in seconds) to beat grid position
   */
  getPosition(timeSeconds: number): BeatGridPosition {
    // Adjust for start offset
    const adjustedTime = timeSeconds - this.startOffset;

    if (adjustedTime < 0) {
      return { measure: 0, beat: 0, sixteenth: 0, progress: 0 };
    }

    // Calculate position in sixteenths
    const totalSixteenths = adjustedTime / this.sixteenthDuration;
    const wholeSixteenths = Math.floor(totalSixteenths);
    const progress = totalSixteenths - wholeSixteenths;

    // Calculate measure
    const measure = Math.floor(wholeSixteenths / this.sixteenthsPerMeasure);

    // Calculate position within measure
    const positionInMeasure = wholeSixteenths % this.sixteenthsPerMeasure;

    // Calculate beat (for /4 time: 4 sixteenths per beat, for /8 time: 2 sixteenths per beat)
    const sixteenthsPerBeat = this.timeSignature.denominator === 4 ? 4 : 2;
    const beat = Math.floor(positionInMeasure / sixteenthsPerBeat);
    const sixteenth = positionInMeasure % sixteenthsPerBeat;

    return {
      measure,
      beat,
      sixteenth,
      progress,
    };
  }

  /**
   * Convert a beat grid position to time in seconds
   */
  getTime(position: BeatGridPosition): number {
    const sixteenthsPerBeat = this.timeSignature.denominator === 4 ? 4 : 2;
    const totalSixteenths =
      position.measure * this.sixteenthsPerMeasure +
      position.beat * sixteenthsPerBeat +
      position.sixteenth +
      position.progress;

    return totalSixteenths * this.sixteenthDuration + this.startOffset;
  }

  /**
   * Get the time of the next beat
   */
  getNextBeatTime(currentTime: number): number {
    const position = this.getPosition(currentTime);
    const nextBeat = position.beat + 1;

    if (nextBeat >= this.beatsPerMeasure) {
      // Next measure
      return this.getTime({ measure: position.measure + 1, beat: 0, sixteenth: 0, progress: 0 });
    }

    return this.getTime({ measure: position.measure, beat: nextBeat, sixteenth: 0, progress: 0 });
  }

  /**
   * Update BPM (returns new BeatGrid instance)
   */
  withBpm(newBpm: number): BeatGrid {
    return new BeatGrid(newBpm, this.timeSignature, this.startOffset);
  }

  /**
   * Update time signature (returns new BeatGrid instance)
   */
  withTimeSignature(newTimeSignature: TimeSignature): BeatGrid {
    return new BeatGrid(this.bpm, newTimeSignature, this.startOffset);
  }
}
