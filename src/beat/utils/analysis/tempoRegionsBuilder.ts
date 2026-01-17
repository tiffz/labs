/**
 * Tempo region builders for combining steady and fermata regions.
 */

import type { TempoRegion } from '../tempoRegions';
import { createDefaultRegion, createSteadyRegion, generateRegionId } from '../tempoRegions';

export interface TempoRegionsResult {
  regions: TempoRegion[];
  hasTempoVariance: boolean;
}

/**
 * Build tempo regions by interleaving fermatas with steady regions.
 */
export function buildTempoRegionsFromFermatas(
  fermatas: TempoRegion[],
  bpm: number,
  duration: number
): TempoRegionsResult {
  if (!fermatas || fermatas.length === 0) {
    return {
      regions: [createDefaultRegion(bpm, duration)],
      hasTempoVariance: false,
    };
  }

  const regions: TempoRegion[] = [];
  let currentTime = 0;

  const sortedFermatas = [...fermatas].sort((a, b) => a.startTime - b.startTime);

  for (const fermata of sortedFermatas) {
    if (fermata.startTime > currentTime + 0.1) {
      regions.push(createSteadyRegion({
        id: generateRegionId(regions.length, 'steady'),
        startTime: currentTime,
        endTime: fermata.startTime,
        bpm,
        confidence: 1.0,
      }));
    }

    regions.push(fermata);
    currentTime = fermata.endTime;
  }

  if (currentTime < duration - 0.1) {
    regions.push(createSteadyRegion({
      id: generateRegionId(regions.length, 'steady'),
      startTime: currentTime,
      endTime: duration,
      bpm,
      confidence: 1.0,
    }));
  }

  return {
    regions,
    hasTempoVariance: true,
  };
}
