/** Transpose MIDI pattern so all notes sit inside [low, high] when possible. */

export function transposePatternIntoRange(
  midis: number[],
  low: number,
  high: number,
  margin = 2,
): number[] {
  if (midis.length === 0) return midis;
  const minP = Math.min(...midis);
  const maxP = Math.max(...midis);
  const lo = low + margin;
  const hi = high - margin;
  if (maxP - minP > hi - lo) {
    const center = (minP + maxP) / 2;
    const target = (lo + hi) / 2;
    const rawShift = Math.round(target - center);
    return midis.map((m) => clampMidi(m + rawShift, lo, hi));
  }
  for (let t = -36; t <= 36; t++) {
    const shifted = midis.map((m) => m + t);
    if (Math.min(...shifted) >= lo && Math.max(...shifted) <= hi) {
      return shifted;
    }
  }
  const center = (minP + maxP) / 2;
  const target = (lo + hi) / 2;
  const rawShift = Math.round(target - center);
  return midis.map((m) => clampMidi(m + rawShift, lo, hi));
}

function clampMidi(m: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, m));
}
