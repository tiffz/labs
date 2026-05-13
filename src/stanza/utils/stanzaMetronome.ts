import type { StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';

/** Minimum section length (seconds) before automatic beat analysis is offered. */
export const STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC = 6;

export const STANZA_METRONOME_TAP_COUNT = 8;

export function bpmAnchorFromTaps(
  taps: readonly number[],
  nudgeMs: number,
): Pick<StanzaSegmentMetronomeCalibration, 'bpm' | 'anchorMediaTime'> | null {
  if (taps.length < 2) return null;
  const deltas: number[] = [];
  for (let i = 1; i < taps.length; i += 1) {
    const d = taps[i]! - taps[i - 1]!;
    if (d > 0.05) deltas.push(d);
  }
  if (deltas.length === 0) return null;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const bpm = 60 / mean;
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 280) return null;
  const roundedBpm = Math.round(bpm * 10) / 10;
  const anchorMediaTime = taps[0]! + nudgeMs / 1000;
  return { bpm: roundedBpm, anchorMediaTime };
}
