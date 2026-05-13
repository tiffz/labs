import type {
  StanzaSegmentMetronomeCalibration,
  StanzaSegmentMetronomeSource,
} from '../db/stanzaDb';

/** Minimum section length (seconds) before automatic beat analysis is offered. */
export const STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC = 6;

export const STANZA_METRONOME_TAP_COUNT = 8;

/** Effective anchor in media seconds (supports legacy rows with only {@link StanzaSegmentMetronomeCalibration.anchorMediaTime}). */
export function calibrationEffectiveAnchorMediaTime(
  segmentStart: number,
  cal: StanzaSegmentMetronomeCalibration,
): number {
  if (typeof cal.firstBeatOffsetSec === 'number' && Number.isFinite(cal.firstBeatOffsetSec)) {
    return segmentStart + cal.firstBeatOffsetSec;
  }
  return cal.anchorMediaTime;
}

/**
 * When a section has no override, align to the whole-song grid: first downbeat at or after
 * `segmentStart` (seconds from section start to beat 1).
 */
export function inheritedFirstBeatOffsetSecFromSongCalibration(
  segmentStart: number,
  songCal: StanzaSegmentMetronomeCalibration,
): number {
  const anchor0 = calibrationEffectiveAnchorMediaTime(0, songCal);
  const period = 60 / songCal.bpm;
  const rel = segmentStart - anchor0;
  const k = Math.ceil(rel / period - 1e-9);
  const firstBeatAtOrAfter = anchor0 + k * period;
  return firstBeatAtOrAfter - segmentStart;
}

export function buildStanzaSegmentCalibration(input: {
  segmentStart: number;
  bpm: number;
  firstBeatOffsetSec: number;
  source: StanzaSegmentMetronomeSource;
  confidence?: number;
  analyzedAt?: number;
}): StanzaSegmentMetronomeCalibration {
  const bpm = Math.round(Math.max(40, Math.min(280, input.bpm)) * 10) / 10;
  let offset = input.firstBeatOffsetSec;
  if (!Number.isFinite(offset)) offset = 0;
  return {
    bpm,
    firstBeatOffsetSec: offset,
    anchorMediaTime: input.segmentStart + offset,
    source: input.source,
    confidence: input.confidence,
    analyzedAt: input.analyzedAt,
  };
}

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
