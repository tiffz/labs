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
