import type { TimeSignature } from '../../shared/rhythm/types';
import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import type { TempoRegion } from './tempoRegions';
import { getRegionAtTime, getEffectiveBpm } from './tempoRegions';

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

/**
 * Special beat position indicating no valid beat (during fermata/rubato)
 */
export const NO_BEAT_POSITION: BeatGridPosition = {
  measure: -1,
  beat: -1,
  sixteenth: -1,
  progress: 0,
};

/**
 * Variable tempo beat grid that handles tempo regions (fermatas, tempo changes, etc.)
 *
 * Extends the basic BeatGrid concept to support:
 * - Multiple tempo regions with different BPMs
 * - Fermatas and rubato sections (no beat tracking)
 * - Accelerando/ritardando (interpolated tempo)
 */
export class VariableBeatGrid {
  private regions: TempoRegion[];
  private timeSignature: TimeSignature;
  private globalBpm: number;
  private startOffset: number;
  private sixteenthsPerMeasure: number;
  private beatsPerMeasure: number;

  // Cache of cumulative measures at each region start
  private regionMeasureOffsets: Map<string, number> = new Map();

  constructor(
    regions: TempoRegion[],
    timeSignature: TimeSignature,
    globalBpm: number,
    startOffset: number = 0
  ) {
    this.regions = regions;
    this.timeSignature = timeSignature;
    this.globalBpm = globalBpm;
    this.startOffset = startOffset;
    this.sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    this.beatsPerMeasure = timeSignature.numerator;

    // Pre-calculate measure offsets for each region
    this.calculateMeasureOffsets();
  }

  /**
   * Pre-calculate cumulative measures at each region start
   * This allows proper measure counting across tempo changes
   */
  private calculateMeasureOffsets(): void {
    let cumulativeMeasures = 0;

    for (const region of this.regions) {
      this.regionMeasureOffsets.set(region.id, cumulativeMeasures);

      // Calculate measures in this region (only for steady regions)
      if (region.type === 'steady' && region.bpm !== null) {
        const regionDuration = region.endTime - region.startTime;
        const measureDuration = this.getMeasureDurationForBpm(region.bpm);
        cumulativeMeasures += regionDuration / measureDuration;
      }
      // Fermatas and rubato don't add to measure count
    }
  }

  /**
   * Get measure duration for a specific BPM
   */
  private getMeasureDurationForBpm(bpm: number): number {
    const sixteenthDuration = 60 / bpm / 4;
    return this.sixteenthsPerMeasure * sixteenthDuration;
  }

  /**
   * Get the current tempo region at a specific time
   */
  getRegionAt(timeSeconds: number): TempoRegion | null {
    return getRegionAtTime(timeSeconds, this.regions);
  }

  /**
   * Check if metronome/drums should play at this time
   */
  shouldPlayRhythm(timeSeconds: number): boolean {
    const region = this.getRegionAt(timeSeconds);
    if (!region) return true; // Default to playing if no region
    return region.type === 'steady';
  }

  /**
   * Get the effective BPM at a specific time
   * Returns null during fermata/rubato sections
   */
  getBpmAt(timeSeconds: number): number | null {
    return getEffectiveBpm(timeSeconds, this.regions);
  }

  /**
   * Convert a time position to beat grid position
   * Returns NO_BEAT_POSITION during fermata/rubato sections
   */
  getPosition(timeSeconds: number): BeatGridPosition {
    const region = this.getRegionAt(timeSeconds);

    // If no region found, use global BPM
    if (!region) {
      return this.getPositionWithBpm(timeSeconds, this.globalBpm, 0);
    }

    // During fermata or rubato, return no beat position
    if (region.type === 'fermata' || region.type === 'rubato') {
      return NO_BEAT_POSITION;
    }

    // Get effective BPM (handles accelerando/ritardando interpolation)
    const effectiveBpm = this.getBpmAt(timeSeconds);
    if (effectiveBpm === null) {
      return NO_BEAT_POSITION;
    }

    // Get the measure offset for this region
    const measureOffset = this.regionMeasureOffsets.get(region.id) || 0;

    // Calculate position within this region
    const timeInRegion = timeSeconds - region.startTime;
    const positionInRegion = this.getPositionWithBpm(
      timeInRegion,
      effectiveBpm,
      0 // No offset within region
    );

    // Add measure offset to get global measure number
    return {
      ...positionInRegion,
      measure: Math.floor(measureOffset) + positionInRegion.measure,
    };
  }

  /**
   * Calculate beat position using a specific BPM
   */
  private getPositionWithBpm(
    adjustedTime: number,
    bpm: number,
    offset: number
  ): BeatGridPosition {
    const timeFromOffset = adjustedTime - offset;

    if (timeFromOffset < 0) {
      return { measure: 0, beat: 0, sixteenth: 0, progress: 0 };
    }

    const sixteenthDuration = 60 / bpm / 4;
    const totalSixteenths = timeFromOffset / sixteenthDuration;
    const wholeSixteenths = Math.floor(totalSixteenths);
    const progress = totalSixteenths - wholeSixteenths;

    const measure = Math.floor(wholeSixteenths / this.sixteenthsPerMeasure);
    const positionInMeasure = wholeSixteenths % this.sixteenthsPerMeasure;

    const sixteenthsPerBeat = this.timeSignature.denominator === 4 ? 4 : 2;
    const beat = Math.floor(positionInMeasure / sixteenthsPerBeat);
    const sixteenth = positionInMeasure % sixteenthsPerBeat;

    return { measure, beat, sixteenth, progress };
  }

  /**
   * Check if a position represents no valid beat
   */
  static isNoBeat(position: BeatGridPosition): boolean {
    return position.measure === -1 && position.beat === -1;
  }

  /**
   * Get the time of the next beat (accounting for fermatas)
   * During a fermata, returns null (no next beat until fermata ends)
   */
  getNextBeatTime(currentTime: number): number | null {
    const region = this.getRegionAt(currentTime);

    // During fermata/rubato, return the end of the region (when beat resumes)
    if (region && (region.type === 'fermata' || region.type === 'rubato')) {
      return region.endTime;
    }

    // Otherwise, calculate normally
    const position = this.getPosition(currentTime);
    if (VariableBeatGrid.isNoBeat(position)) {
      return null;
    }

    const effectiveBpm = this.getBpmAt(currentTime);
    if (effectiveBpm === null) {
      return null;
    }

    const beatDuration = 60 / effectiveBpm;
    const nextBeat = position.beat + 1;

    if (nextBeat >= this.beatsPerMeasure) {
      // Check if we'll cross into a fermata region
      const tentativeNextTime = currentTime + beatDuration;
      const nextRegion = this.getRegionAt(tentativeNextTime);
      if (nextRegion && (nextRegion.type === 'fermata' || nextRegion.type === 'rubato')) {
        // Skip to after the fermata
        return nextRegion.endTime;
      }
    }

    // Simple case: next beat is within same region
    return currentTime + (1 - position.progress) * (beatDuration / 4) +
      ((this.beatsPerMeasure - 1 - position.beat) % 1) * beatDuration;
  }

  /**
   * Get all tempo regions
   */
  getRegions(): TempoRegion[] {
    return [...this.regions];
  }

  /**
   * Check if there are any tempo variances (fermatas, tempo changes, etc.)
   */
  hasTempoVariance(): boolean {
    return this.regions.some((r) => r.type !== 'steady');
  }
}
