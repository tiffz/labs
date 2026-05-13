/**
 * Compensate pitch shift induced by playback-rate changes on an `AudioBufferSourceNode`.
 *
 * `AudioBufferSourceNode.detune` is in cents; changing `playbackRate` also shifts perceived pitch
 * by `1200 * log2(rate)` cents. This returns the detune value so net pitch matches `transposeSemitones`
 * at the given playback rate (same formula as Find the Beat / `useBeatSync`).
 */
export function getCompensatedDetune(transposeSemitones: number, playbackRate: number): number {
  const desiredCents = transposeSemitones * 100;
  const playbackRatePitchShift = 1200 * Math.log2(playbackRate);
  return desiredCents - playbackRatePitchShift;
}
