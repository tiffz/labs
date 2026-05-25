import type {
  StanzaMetronomeTimingScope,
  StanzaSegmentMetronomeCalibration,
  StanzaSegmentMetronomeSource,
} from '../db/stanzaDb';
import { STANZA_TIME_EPS } from './segments';

/** Minimum section length (seconds) before automatic beat analysis is offered. */
export const STANZA_METRONOME_ANALYZE_MIN_SECTION_SEC = 6;

export const STANZA_METRONOME_TAP_COUNT = 8;
/** Minimum taps before the user can finish early or we show a stable estimate. */
export const STANZA_METRONOME_TAP_MIN_COUNT = 4;
/** Count-in before playback starts so the first tap is not rushed. */
export const STANZA_TAP_COUNTDOWN_SEC = 3;

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Ignore intervals outside this band around the median (natural tap jitter). */
function filterTapIntervals(deltas: readonly number[]): number[] {
  if (deltas.length < 3) return [...deltas];
  const med = median(deltas);
  if (!Number.isFinite(med) || med <= 0) return [...deltas];
  const filtered = deltas.filter((d) => d >= med * 0.55 && d <= med * 1.65);
  return filtered.length >= 2 ? filtered : [...deltas];
}

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
    if (d > 0.08 && d < 4) deltas.push(d);
  }
  if (deltas.length === 0) return null;
  const stable = filterTapIntervals(deltas);
  const mean = stable.reduce((a, b) => a + b, 0) / stable.length;
  const bpm = 60 / mean;
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 280) return null;
  const roundedBpm = Math.round(bpm * 10) / 10;
  const anchorMediaTime = taps[0]! + nudgeMs / 1000;
  return { bpm: roundedBpm, anchorMediaTime };
}

/** Live BPM estimate while the user is still tapping (needs at least two intervals). */
export function estimateBpmFromTapTimes(taps: readonly number[]): number | null {
  const r = bpmAnchorFromTaps(taps, 0);
  return r?.bpm ?? null;
}

function clampMediaTime(sec: number, songDurationSec: number): number {
  if (!(songDurationSec > 0)) return Math.max(0, sec);
  return Math.max(0, Math.min(sec, songDurationSec));
}

/**
 * Where tap-tempo playback should begin: the current playhead when it lies in the
 * calibration scope, otherwise the scope start (section start or track start).
 */
export function resolveTapPlaybackStartSec(input: {
  playheadSec: number;
  timingScope: StanzaMetronomeTimingScope;
  segmentStart: number;
  segmentEnd: number;
  songDurationSec: number;
}): { startSec: number; fromPlayhead: boolean } {
  const { playheadSec, timingScope, segmentStart, segmentEnd, songDurationSec } = input;

  if (timingScope === 'section') {
    const inSection =
      playheadSec >= segmentStart - STANZA_TIME_EPS && playheadSec < segmentEnd - STANZA_TIME_EPS;
    if (inSection) {
      return { startSec: clampMediaTime(playheadSec, songDurationSec), fromPlayhead: true };
    }
    return { startSec: segmentStart, fromPlayhead: false };
  }

  const startSec = clampMediaTime(playheadSec, songDurationSec);
  return { startSec, fromPlayhead: startSec > STANZA_TIME_EPS };
}

/**
 * Derive BPM from tap spacing and extrapolate Beat 1 for the scope from tap phase.
 * Unlike {@link bpmAnchorFromTaps}, does not treat the first tap as global Beat 1 —
 * mid-song taps are projected onto the scope grid using the inferred tempo.
 */
export function beatOffsetFromTapsExtrapolated(
  taps: readonly number[],
  segmentStart: number,
  nudgeMs = 0,
): { bpm: number; anchorMediaTime: number; firstBeatOffsetSec: number } | null {
  const bpmResult = bpmAnchorFromTaps(taps, 0);
  if (!bpmResult) return null;

  const period = 60 / bpmResult.bpm;
  const phases: number[] = [];
  for (const tap of taps) {
    const rel = tap + nudgeMs / 1000 - segmentStart;
    const beatIndex = Math.round(rel / period);
    phases.push(rel - beatIndex * period);
  }

  const offset = median(phases);
  if (!Number.isFinite(offset)) return null;
  const firstBeatOffsetSec = Math.round(offset * 1000) / 1000;

  return {
    bpm: bpmResult.bpm,
    firstBeatOffsetSec,
    anchorMediaTime: segmentStart + firstBeatOffsetSec,
  };
}
