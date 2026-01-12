/**
 * Measure-related utility functions for time/position calculations.
 * Consolidates measure boundary logic used across the beat app.
 */

/**
 * Calculate the duration of one measure in seconds.
 */
export function getMeasureDuration(bpm: number, beatsPerMeasure: number): number {
  const secondsPerBeat = 60 / bpm;
  return secondsPerBeat * beatsPerMeasure;
}

/**
 * Get the 1-indexed measure number for a given time.
 * Returns 0 if the time is before musicStartTime.
 */
export function getMeasureNumber(
  time: number,
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4
): number {
  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart < 0) return 0;
  const secondsPerMeasure = getMeasureDuration(bpm, beatsPerMeasure);
  return Math.floor(timeSinceStart / secondsPerMeasure) + 1;
}

/**
 * Snap a time to the nearest measure boundary (either before or after).
 */
export function snapToMeasureStart(
  time: number,
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4
): number {
  const secondsPerMeasure = getMeasureDuration(bpm, beatsPerMeasure);

  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart <= 0) return musicStartTime;

  // Find the measure number (0-indexed for calculation)
  const measureIndex = timeSinceStart / secondsPerMeasure;
  const floorMeasure = Math.floor(measureIndex);
  const ceilMeasure = Math.ceil(measureIndex);

  const floorTime = musicStartTime + floorMeasure * secondsPerMeasure;
  const ceilTime = musicStartTime + ceilMeasure * secondsPerMeasure;

  // Return the closer one
  return time - floorTime <= ceilTime - time ? floorTime : ceilTime;
}

/**
 * Extend a time to the nearest measure boundary that expands the range.
 * For start times: snap backward (floor)
 * For end times: snap forward (ceil)
 *
 * Uses a small epsilon for floating point comparisons to ensure times
 * that are very close to a boundary are treated as being on that boundary.
 */
export function extendToMeasureBoundary(
  time: number,
  direction: 'start' | 'end',
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4,
  duration?: number
): number {
  const secondsPerMeasure = getMeasureDuration(bpm, beatsPerMeasure);

  const timeSinceStart = time - musicStartTime;
  if (timeSinceStart <= 0) return musicStartTime;

  // Use epsilon for floating point comparison (50ms tolerance)
  const epsilon = 0.05;
  const measureIndex = timeSinceStart / secondsPerMeasure;

  if (direction === 'start') {
    // Snap backward to extend the loop start earlier
    // If we're very close to the next measure, don't include it
    const floorMeasure = Math.floor(measureIndex + epsilon);
    const result = Math.max(musicStartTime, musicStartTime + floorMeasure * secondsPerMeasure);
    // Round to nearest millisecond for consistent comparisons
    return Math.round(result * 1000) / 1000;
  } else {
    // Snap forward to extend the loop end later
    // If we're very close to a measure boundary, go to the next one
    const ceilMeasure = Math.ceil(measureIndex - epsilon);
    // Ensure we always extend to at least the next measure if not exactly on a boundary
    const adjustedCeil =
      measureIndex - Math.floor(measureIndex) > epsilon ? ceilMeasure : Math.floor(measureIndex) + 1;
    const extendedTime = musicStartTime + adjustedCeil * secondsPerMeasure;
    // Round to nearest millisecond
    const roundedTime = Math.round(extendedTime * 1000) / 1000;
    // Don't exceed duration if provided
    return duration !== undefined ? Math.min(roundedTime, duration) : roundedTime;
  }
}

/**
 * Generate a measure-based label for a section (e.g., "M1-8", "M48").
 */
export function generateMeasureLabel(
  startTime: number,
  endTime: number,
  bpm: number,
  musicStartTime: number,
  beatsPerMeasure: number = 4
): string {
  const startMeasure = getMeasureNumber(startTime, bpm, musicStartTime, beatsPerMeasure);
  const endMeasure = getMeasureNumber(endTime - 0.1, bpm, musicStartTime, beatsPerMeasure); // -0.1 to not count the next measure

  if (startMeasure === endMeasure) {
    return `M${startMeasure}`;
  }
  return `M${startMeasure}-${endMeasure}`;
}

