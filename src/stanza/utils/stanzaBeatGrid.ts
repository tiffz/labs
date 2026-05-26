import type { StanzaMarker, StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import { calibrationEffectiveAnchorMediaTime } from './stanzaMetronome';
import { clampMarkerTimeBetweenNeighbours } from './stanzaMarkerSpacing';
import { ensureMarkerIds, STANZA_TIME_EPS, type DerivedSegment } from './segments';

export { clampMarkerTimeBetweenNeighbours };
import { STANZA_MIN_LOOP_SPAN_SEC } from './stanzaPlaybackLoop';

/** Default quarter-note tempo when no calibration exists (pad / nudge / snap). */
export const STANZA_DEFAULT_BEAT_BPM = 120;

const BEAT_ALIGN_EPS = 0.018;

/**
 * Absolute-time beat grid for a section: section override, else whole-song grid, else 120 BPM from t=0.
 */
export function effectiveBeatGridForSegment(
  segment: DerivedSegment,
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  songCalibration: StanzaSegmentMetronomeCalibration | undefined,
): { bpm: number; anchorMediaTime: number } {
  const segCal = metronomeBySegmentId?.[segment.id];
  if (segCal && segCal.bpm > 40 && segCal.bpm < 360) {
    return {
      bpm: segCal.bpm,
      anchorMediaTime: calibrationEffectiveAnchorMediaTime(segment.start, segCal),
    };
  }
  if (songCalibration && songCalibration.bpm > 40 && songCalibration.bpm < 360) {
    return {
      bpm: songCalibration.bpm,
      anchorMediaTime: calibrationEffectiveAnchorMediaTime(0, songCalibration),
    };
  }
  return { bpm: STANZA_DEFAULT_BEAT_BPM, anchorMediaTime: 0 };
}

export function nearestBeatMediaTime(t: number, anchorMediaTime: number, bpm: number): number {
  const period = 60 / bpm;
  if (!(period > 0) || !Number.isFinite(t)) return t;
  const n = Math.round((t - anchorMediaTime) / period);
  return anchorMediaTime + n * period;
}

/**
 * Smallest beat media-time at or after `t` on the grid `(anchorMediaTime, bpm)`.
 * Used by snap-to-beat to **pad** a section end forward without shrinking it
 * (so the last beat is fully contained). Returns `t` itself when `t` already
 * sits on a beat (within {@link BEAT_ALIGN_EPS}).
 */
export function nextBeatMediaTimeAtOrAfter(t: number, anchorMediaTime: number, bpm: number): number {
  const period = 60 / bpm;
  if (!(period > 0) || !Number.isFinite(t)) return t;
  const offset = (t - anchorMediaTime) / period;
  // If we're effectively on a beat already, stay put — avoids jumping a full
  // period for floating-point noise like 12.0000001.
  const nRound = Math.round(offset);
  if (Math.abs(offset - nRound) * period <= BEAT_ALIGN_EPS) {
    return anchorMediaTime + nRound * period;
  }
  return anchorMediaTime + Math.ceil(offset) * period;
}

export function beatBoundaryAlignmentErrorSec(
  boundaryMediaSec: number,
  anchorMediaTime: number,
  bpm: number,
): number {
  const snapped = nearestBeatMediaTime(boundaryMediaSec, anchorMediaTime, bpm);
  return Math.abs(boundaryMediaSec - snapped);
}

/** Largest beat media-time at or before `t` on the grid `(anchorMediaTime, bpm)`. */
export function previousBeatMediaTimeAtOrBefore(t: number, anchorMediaTime: number, bpm: number): number {
  const period = 60 / bpm;
  if (!(period > 0) || !Number.isFinite(t)) return t;
  const offset = (t - anchorMediaTime) / period;
  // If we're effectively on a beat already, stay put.
  const nRound = Math.round(offset);
  if (Math.abs(offset - nRound) * period <= BEAT_ALIGN_EPS) {
    return anchorMediaTime + nRound * period;
  }
  return anchorMediaTime + Math.floor(offset) * period;
}

/**
 * Result of {@link snapSegmentBoundaryMarkersToBeats}. `markers` is the new
 * marker list to persist. `updatedSegmentCalibration` is set when the section
 * has its own per-section override AND we moved the section start: we re-anchor
 * the calibration to the new start so `firstBeatOffsetSec` becomes 0 (the user-
 * visible "Beat 1 offset" in the rail). The metronome click times in absolute
 * media-time are unchanged — we're only relabelling which grid beat is "Beat 1".
 */
export interface SnapSegmentBoundaryResult {
  markers: StanzaMarker[];
  updatedSegmentCalibration?: {
    segmentId: string;
    calibration: StanzaSegmentMetronomeCalibration;
  };
}

/**
 * Snap a section's boundaries onto its effective beat grid:
 *   - **Start** moves to the nearest beat of the grid (≤ ½ period either way).
 *     Result: `firstBeatOffsetSec` becomes 0 — the section starts on Beat 1.
 *     For section-scope calibrations we return an updated `calibration` (anchor
 *     pinned to the new start, offset zeroed) so the rail reflects the move
 *     immediately. The actual click cadence in media-time is unchanged because
 *     the new start is itself a beat of the original grid; we're only
 *     relabelling which grid beat counts as "Beat 1".
 *   - **End** pads forward to the next beat at or after
 *     ({@link nextBeatMediaTimeAtOrAfter}). The metronome can then play the
 *     section's last beat in full.
 *
 * Skipped automatically:
 *   - First section's start is fixed at 0 with no marker — left alone.
 *   - Last section's end equals the track end — left alone.
 *
 * Refuses (returns `null`) when:
 *   - Neither boundary needs to move.
 *   - A snap target collides with a neighbouring marker / the track end (we
 *     prefer to leave the user a deterministic state instead of a partial fix).
 *   - The post-snap layout would shrink any segment below
 *     {@link STANZA_MIN_LOOP_SPAN_SEC}.
 */
export function snapSegmentBoundaryMarkersToBeats(
  segmentIndex: number,
  segments: DerivedSegment[],
  markers: StanzaMarker[],
  duration: number,
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  songCalibration: StanzaSegmentMetronomeCalibration | undefined,
): SnapSegmentBoundaryResult | null {
  const seg = segments[segmentIndex];
  if (!seg || !(duration > 0)) return null;

  const grid = effectiveBeatGridForSegment(seg, metronomeBySegmentId, songCalibration);
  const sorted = [...ensureMarkerIds(markers)].sort((a, b) => a.time - b.time);
  const draft = sorted.map((m) => ({ ...m }));

  let changed = false;
  let newSegmentStart = seg.start;

  // 1. Snap START to the nearest beat. First section's start is fixed at 0 and
  //    has no marker; skip it.
  const startMovable = segmentIndex > 0 && seg.start > STANZA_TIME_EPS;
  if (startMovable) {
    const startM = draft.find((m) => Math.abs(m.time - seg.start) < STANZA_TIME_EPS);
    if (startM?.id) {
      const snapped = nearestBeatMediaTime(seg.start, grid.anchorMediaTime, grid.bpm);
      if (Math.abs(snapped - seg.start) > STANZA_TIME_EPS * 0.5) {
        const clamped = clampMarkerTimeBetweenNeighbours(startM.id, snapped, draft, duration);
        // Refuse partial moves: snap on a beat or not at all.
        if (Math.abs(clamped - snapped) <= STANZA_TIME_EPS) {
          const i = draft.findIndex((m) => m.id === startM.id);
          if (i >= 0) {
            draft[i] = { ...draft[i]!, time: clamped };
            newSegmentStart = clamped;
            changed = true;
          }
        }
        draft.sort((a, b) => a.time - b.time);
      }
    }
  }

  // 2. Pad END forward to the next beat at or after. Last section ends at the
  //    track end and has no marker; skip it.
  const endMovable = seg.end < duration - STANZA_TIME_EPS;
  if (endMovable) {
    const endM = draft.find((m) => Math.abs(m.time - seg.end) < STANZA_TIME_EPS);
    if (endM?.id) {
      const padded = nextBeatMediaTimeAtOrAfter(seg.end, grid.anchorMediaTime, grid.bpm);
      if (Math.abs(padded - seg.end) > STANZA_TIME_EPS * 0.5) {
        const clamped = clampMarkerTimeBetweenNeighbours(endM.id, padded, draft, duration);
        if (Math.abs(clamped - padded) <= STANZA_TIME_EPS) {
          const i = draft.findIndex((m) => m.id === endM.id);
          if (i >= 0) {
            draft[i] = { ...draft[i]!, time: clamped };
            changed = true;
          }
        }
        draft.sort((a, b) => a.time - b.time);
      }
    }
  }

  if (!changed) return null;

  // Min-span guard: refuse if any segment would be smaller than the loop minimum.
  if (draft.length >= 2) {
    for (let j = 0; j < draft.length - 1; j++) {
      if (draft[j + 1]!.time - draft[j]!.time < STANZA_MIN_LOOP_SPAN_SEC) {
        return null;
      }
    }
  }

  // If this section has its own calibration AND the start moved, re-anchor:
  // pin Beat 1 to the new start so the rail's "Beat 1 offset" reads 0. The new
  // start is itself a beat of the original grid, so the underlying click times
  // do not move — only the label of which beat is "Beat 1" changes.
  let updatedSegmentCalibration: SnapSegmentBoundaryResult['updatedSegmentCalibration'];
  const segCal = metronomeBySegmentId?.[seg.id];
  if (segCal && Math.abs(newSegmentStart - seg.start) > STANZA_TIME_EPS * 0.5) {
    updatedSegmentCalibration = {
      segmentId: seg.id,
      calibration: {
        ...segCal,
        firstBeatOffsetSec: 0,
        anchorMediaTime: newSegmentStart,
      },
    };
  }

  return { markers: draft, updatedSegmentCalibration };
}

/**
 * True when this section's start or end doesn't sit on a beat of its effective
 * grid. Boundaries that aren't movable (first section's start = 0; last
 * section's end = track end) are excluded so the warning only fires when the
 * user can actually act on it via {@link snapSegmentBoundaryMarkersToBeats}.
 */
export function sectionBoundaryBeatMisaligned(
  segment: DerivedSegment,
  duration: number,
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  songCalibration: StanzaSegmentMetronomeCalibration | undefined,
): boolean {
  const grid = effectiveBeatGridForSegment(segment, metronomeBySegmentId, songCalibration);
  const startMovable = segment.start > STANZA_TIME_EPS;
  const endMovable = segment.end < duration - STANZA_TIME_EPS;
  const startMisaligned =
    startMovable &&
    beatBoundaryAlignmentErrorSec(segment.start, grid.anchorMediaTime, grid.bpm) > BEAT_ALIGN_EPS;
  const endMisaligned =
    endMovable &&
    beatBoundaryAlignmentErrorSec(segment.end, grid.anchorMediaTime, grid.bpm) > BEAT_ALIGN_EPS;
  return startMisaligned || endMisaligned;
}

/**
 * Move only the **outer** markers of the selection hull (first selected section start, last end)
 * so they match the effective loop span. Interior splits inside the hull are unchanged.
 * Returns updated markers, or null if nothing to do or constraints block the move.
 */
export function commitSelectionSpanToHullBoundaryMarkers(
  markers: StanzaMarker[],
  duration: number,
  hull: { start: number; end: number },
  effective: { start: number; end: number },
): StanzaMarker[] | null {
  if (!(duration > 0)) return null;
  const sorted = [...ensureMarkerIds(markers)].sort((a, b) => a.time - b.time);
  const draft = sorted.map((m) => ({ ...m }));

  const findAt = (t: number) => draft.findIndex((m) => Math.abs(m.time - t) < STANZA_TIME_EPS);

  let changed = false;

  if (hull.start > STANZA_TIME_EPS && Math.abs(effective.start - hull.start) > STANZA_TIME_EPS) {
    const i = findAt(hull.start);
    if (i >= 0 && draft[i]!.id) {
      const id = draft[i]!.id!;
      const clamped = clampMarkerTimeBetweenNeighbours(id, effective.start, draft, duration);
      if (Math.abs(clamped - draft[i]!.time) > STANZA_TIME_EPS * 0.5) {
        draft[i] = { ...draft[i]!, time: clamped };
        changed = true;
      }
    }
  }

  draft.sort((a, b) => a.time - b.time);

  if (hull.end < duration - STANZA_TIME_EPS && Math.abs(effective.end - hull.end) > STANZA_TIME_EPS) {
    const i = findAt(hull.end);
    if (i >= 0 && draft[i]!.id) {
      const id = draft[i]!.id!;
      const clamped = clampMarkerTimeBetweenNeighbours(id, effective.end, draft, duration);
      if (Math.abs(clamped - draft[i]!.time) > STANZA_TIME_EPS * 0.5) {
        draft[i] = { ...draft[i]!, time: clamped };
        changed = true;
      }
    }
  }

  draft.sort((a, b) => a.time - b.time);

  if (!changed) return null;

  for (let j = 0; j < draft.length - 1; j++) {
    if (draft[j + 1]!.time - draft[j]!.time < STANZA_MIN_LOOP_SPAN_SEC) {
      return null;
    }
  }

  return draft;
}
