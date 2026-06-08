import type { StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import type { DerivedSegment } from './segments';

/** Match Beat: play through | loop entire media | loop selected section range(s). */
export type StanzaPlaybackLoopMode = 'through' | 'loopAll' | 'loopSelection';

/**
 * Sub-frame slack when comparing playhead time to a loop end (selection spans, resume-from-end).
 * Full-song loops also poll this threshold as a fallback when `ended` / YouTube `ENDED` is late.
 */
export const STANZA_LOOP_WRAP_TOLERANCE_SEC = 0.008;

/** True when the playhead has reached (or passed) the loop end within tolerance. */
export function isPastLoopWrapPoint(
  currentTime: number,
  loopEnd: number,
  toleranceSec: number = STANZA_LOOP_WRAP_TOLERANCE_SEC,
): boolean {
  return loopEnd > 0 && Number.isFinite(currentTime) && currentTime >= loopEnd - toleranceSec;
}

/** Minimum span after applying trim (seconds). */
export const STANZA_MIN_LOOP_SPAN_SEC = 0.12;

/** Nudge the selected time span vs marker-defined section edges (markers unchanged). */
export type StanzaSectionSelectionExtend = {
  /** Added to hull start (negative = extend selection earlier in the track). */
  startDelta: number;
  /** Added to hull end (positive = extend selection later). */
  endDelta: number;
};

export function applySectionSelectionExtend(
  base: { start: number; end: number },
  extend: StanzaSectionSelectionExtend,
  duration: number,
): { start: number; end: number } {
  const d = Number.isFinite(duration) && duration > 0 ? duration : base.end;
  let start = base.start + extend.startDelta;
  let end = base.end + extend.endDelta;
  start = Math.max(0, Math.min(start, d));
  end = Math.max(0, Math.min(end, d));
  if (end - start < STANZA_MIN_LOOP_SPAN_SEC) {
    const mid = (base.start + base.end) / 2;
    const half = STANZA_MIN_LOOP_SPAN_SEC / 2;
    start = Math.max(0, mid - half);
    end = Math.min(d, start + STANZA_MIN_LOOP_SPAN_SEC);
    start = Math.max(0, end - STANZA_MIN_LOOP_SPAN_SEC);
  }
  return { start, end };
}

/**
 * Resolved BPM for the current selection span (first selected section with a section calibration,
 * else whole-song calibration, else **120** default).
 */
export function effectiveBpmForSelectedSpan(
  selectedIndices: readonly number[],
  segments: DerivedSegment[],
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  metronomeSongCalibration?: StanzaSegmentMetronomeCalibration,
): number {
  let bpm: number | null = null;
  for (const i of selectedIndices) {
    const seg = segments[i];
    const cal = seg ? metronomeBySegmentId?.[seg.id] : undefined;
    const b = cal?.bpm;
    if (typeof b === 'number' && b > 40 && b < 360) {
      bpm = b;
      break;
    }
  }
  if (bpm == null && metronomeSongCalibration) {
    const b = metronomeSongCalibration.bpm;
    if (typeof b === 'number' && b > 40 && b < 360) {
      bpm = b;
    }
  }
  return bpm ?? 120;
}

/**
 * Suggested symmetric padding (seconds per side) from the selection’s effective BPM
 * (section metronome when set, else whole song, else **120 BPM**), scaled by ~0.85 beat.
 * Clamped for sensible pre/post roll.
 */
export function suggestMusicalLoopPadSec(
  selectedIndices: readonly number[],
  segments: DerivedSegment[],
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  metronomeSongCalibration?: StanzaSegmentMetronomeCalibration,
): number {
  const bpm = effectiveBpmForSelectedSpan(
    selectedIndices,
    segments,
    metronomeBySegmentId,
    metronomeSongCalibration,
  );
  const beatSec = 60 / bpm;
  const raw = beatSec * 0.85;
  return Math.min(0.85, Math.max(0.18, raw));
}

export function computeLoopHull(
  segments: DerivedSegment[],
  selectedIndices: readonly number[],
): { start: number; end: number } | null {
  if (selectedIndices.length === 0) return null;
  let start = Infinity;
  let end = -Infinity;
  for (const i of selectedIndices) {
    const s = segments[i];
    if (!s) continue;
    start = Math.min(start, s.start);
    end = Math.max(end, s.end);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 0.001) return null;
  return { start, end };
}
