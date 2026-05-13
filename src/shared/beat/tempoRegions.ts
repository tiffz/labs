/**
 * Tempo Region Types
 *
 * Data model for variable tempo support in musical theater and classical music.
 * Supports fermatas, tempo changes, rubato sections, and gradual tempo changes.
 */

/**
 * Type of tempo region
 * - 'steady': Consistent tempo throughout the region
 * - 'fermata': Brief held note/pause (typically < 2 measures)
 * - 'rubato': Free tempo section with no clear beat
 * - 'accelerando': Gradually speeding up
 * - 'ritardando': Gradually slowing down
 */
export type TempoType = 'steady' | 'fermata' | 'rubato' | 'accelerando' | 'ritardando';

/**
 * A region of audio with specific tempo characteristics
 */
export interface TempoRegion {
  /** Unique identifier for this region */
  id: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Type of tempo behavior in this region */
  type: TempoType;
  /** BPM for steady regions, starting BPM for accelerando/ritardando, null for rubato/fermata */
  bpm: number | null;
  /** Target BPM for accelerando/ritardando regions */
  targetBpm?: number;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Human-readable description (e.g., "Fermata on V chord", "Tempo change to 92 BPM") */
  description?: string;
}

/**
 * Result of tempo analysis including all detected regions
 */
export interface TempoAnalysisResult {
  /** Primary/most common tempo (weighted by duration) */
  globalBpm: number;
  /** All detected tempo regions, in chronological order */
  regions: TempoRegion[];
  /** Whether the track has any non-steady tempo regions */
  hasTempoVariance: boolean;
  /** Warnings about detection quality */
  warnings: string[];
}

export interface SteadyRegionOptions {
  id?: string;
  startTime: number;
  endTime: number;
  bpm: number;
  confidence?: number;
  description?: string;
}

/**
 * Get the tempo region at a specific time
 */
export function getRegionAtTime(time: number, regions: TempoRegion[]): TempoRegion | null {
  for (const region of regions) {
    if (time >= region.startTime && time < region.endTime) {
      return region;
    }
  }
  return null;
}

/**
 * Get the effective BPM at a specific time
 * For steady regions, returns the region's BPM
 * For accelerando/ritardando, interpolates between start and target BPM
 * For rubato/fermata, returns null
 */
export function getEffectiveBpm(time: number, regions: TempoRegion[]): number | null {
  const region = getRegionAtTime(time, regions);
  if (!region) return null;

  switch (region.type) {
    case 'steady':
      return region.bpm;

    case 'accelerando':
    case 'ritardando':
      if (region.bpm !== null && region.targetBpm !== undefined) {
        // Linear interpolation between start and target BPM
        const progress = (time - region.startTime) / (region.endTime - region.startTime);
        return region.bpm + (region.targetBpm - region.bpm) * progress;
      }
      return region.bpm;

    case 'fermata':
    case 'rubato':
      return null;

    default:
      return region.bpm;
  }
}

/**
 * Create a default steady region for the entire track
 */
export function createDefaultRegion(bpm: number, duration: number): TempoRegion {
  return createSteadyRegion({
    id: 'region-0',
    startTime: 0,
    endTime: duration,
    bpm,
    confidence: 1.0,
  });
}

/**
 * Generate unique ID for a tempo region
 */
export function generateRegionId(index: number, type: TempoType): string {
  return `${type}-${index}-${Date.now().toString(36)}`;
}

/**
 * Create a steady tempo region with consistent defaults.
 */
export function createSteadyRegion(options: SteadyRegionOptions): TempoRegion {
  const { id, startTime, endTime, bpm, confidence = 1.0, description } = options;
  return {
    id: id ?? generateRegionId(0, 'steady'),
    startTime,
    endTime,
    type: 'steady',
    bpm,
    confidence,
    description,
  };
}

/**
 * Find the BPM at a given time from tempo regions.
 */
export function findBpmForTime(time: number, regions: TempoRegion[]): number | null {
  for (const region of regions) {
    if (time >= region.startTime && time < region.endTime && region.bpm !== null) {
      return region.bpm;
    }
  }
  const lastRegion = regions[regions.length - 1];
  if (lastRegion && time >= lastRegion.startTime && lastRegion.bpm !== null) {
    return lastRegion.bpm;
  }
  return null;
}
