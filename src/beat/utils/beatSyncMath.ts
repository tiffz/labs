import type { TempoRegion } from './tempoRegions';

/**
 * Compensate pitch shift induced by playback-rate changes.
 */
export function getCompensatedDetune(
  transposeSemitones: number,
  playbackRate: number
): number {
  const desiredCents = transposeSemitones * 100;
  const playbackRatePitchShift = 1200 * Math.log2(playbackRate);
  return desiredCents - playbackRatePitchShift;
}

/**
 * Map playback time to beat-grid time when fermatas/rubato introduce pauses.
 */
export function getAdjustedElapsedTime(
  elapsed: number,
  tempoRegions: TempoRegion[] | undefined,
  bpm: number,
  syncStart: number,
  beatsPerMeasure: number = 4
): number {
  if (!tempoRegions || tempoRegions.length === 0) {
    return elapsed;
  }

  const beatInterval = 60 / bpm;
  const measureDuration = beatInterval * beatsPerMeasure;
  const fermatas = tempoRegions
    .filter((region) => region.type === 'fermata' || region.type === 'rubato')
    .sort((a, b) => a.startTime - b.startTime);

  if (fermatas.length === 0) {
    return elapsed;
  }

  let totalAdjustment = 0;
  let cumulativeFermataDuration = 0;

  for (const fermata of fermatas) {
    const fermataStartInBeatGridTime =
      fermata.startTime - cumulativeFermataDuration;
    const measuresElapsed =
      (fermataStartInBeatGridTime - syncStart) / measureDuration;
    const nextMeasureNumber = Math.ceil(measuresElapsed);
    const measureBoundaryInBeatGridTime =
      syncStart + nextMeasureNumber * measureDuration;
    const measureBoundaryInAudioTime =
      measureBoundaryInBeatGridTime + cumulativeFermataDuration;
    const fermataDuration = fermata.endTime - fermata.startTime;
    const fermataAdjustment =
      fermata.endTime - measureBoundaryInBeatGridTime - cumulativeFermataDuration;

    if (elapsed >= fermata.endTime) {
      totalAdjustment += fermataAdjustment;
      cumulativeFermataDuration += fermataDuration;
    } else if (elapsed >= measureBoundaryInAudioTime) {
      totalAdjustment += elapsed - measureBoundaryInAudioTime;
      break;
    } else if (elapsed > fermata.startTime) {
      break;
    }
  }

  return elapsed - totalAdjustment;
}
