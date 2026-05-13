import type { StanzaMarker, StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import { calibrationEffectiveAnchorMediaTime } from './stanzaMetronome';
import { ensureMarkerIds, STANZA_TIME_EPS, type DerivedSegment } from './segments';
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

export function beatBoundaryAlignmentErrorSec(
  boundaryMediaSec: number,
  anchorMediaTime: number,
  bpm: number,
): number {
  const snapped = nearestBeatMediaTime(boundaryMediaSec, anchorMediaTime, bpm);
  return Math.abs(boundaryMediaSec - snapped);
}

/** Same neighbour clamp as timeline marker drag (seconds). */
export function clampMarkerTimeBetweenNeighbours(
  markerId: string,
  rawTime: number,
  list: StanzaMarker[],
  duration: number,
): number {
  const sorted = [...list].sort((a, b) => a.time - b.time);
  const idx = sorted.findIndex((m) => m.id === markerId);
  if (idx < 0) return rawTime;
  const prevT = idx <= 0 ? 0 : sorted[idx - 1]!.time;
  const nextT = idx >= sorted.length - 1 ? duration : sorted[idx + 1]!.time;
  return Math.max(prevT + STANZA_TIME_EPS * 2, Math.min(nextT - STANZA_TIME_EPS * 2, rawTime));
}

/**
 * Snap interior boundary markers for one section to the nearest metronome beat.
 * Returns a new marker list, or null if nothing changed / nothing to snap.
 */
export function snapSegmentBoundaryMarkersToBeats(
  segmentIndex: number,
  segments: DerivedSegment[],
  markers: StanzaMarker[],
  duration: number,
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  songCalibration: StanzaSegmentMetronomeCalibration | undefined,
): StanzaMarker[] | null {
  const seg = segments[segmentIndex];
  if (!seg || !(duration > 0)) return null;

  const grid = effectiveBeatGridForSegment(seg, metronomeBySegmentId, songCalibration);
  const sorted = [...ensureMarkerIds(markers)].sort((a, b) => a.time - b.time);

  const startM = seg.start > STANZA_TIME_EPS ? sorted.find((m) => Math.abs(m.time - seg.start) < STANZA_TIME_EPS) : undefined;
  const endM =
    seg.end < duration - STANZA_TIME_EPS ? sorted.find((m) => Math.abs(m.time - seg.end) < STANZA_TIME_EPS) : undefined;

  const draft = sorted.map((m) => ({ ...m }));

  const snap = (t: number) => nearestBeatMediaTime(t, grid.anchorMediaTime, grid.bpm);

  let changed = false;

  const applySnap = (marker: StanzaMarker, boundaryTime: number) => {
    if (beatBoundaryAlignmentErrorSec(boundaryTime, grid.anchorMediaTime, grid.bpm) <= BEAT_ALIGN_EPS) return;
    const snapped = snap(boundaryTime);
    const clamped = clampMarkerTimeBetweenNeighbours(marker.id!, snapped, draft, duration);
    const i = draft.findIndex((m) => m.id === marker.id);
    if (i < 0) return;
    if (Math.abs(clamped - draft[i]!.time) > STANZA_TIME_EPS * 0.5) {
      draft[i] = { ...draft[i]!, time: clamped };
      changed = true;
    }
  };

  if (startM) applySnap(startM, seg.start);
  draft.sort((a, b) => a.time - b.time);

  if (endM && (!startM || endM.id !== startM.id)) {
    applySnap(endM, seg.end);
    draft.sort((a, b) => a.time - b.time);
  }

  if (!changed) return null;

  if (draft.length >= 2) {
    for (let i = 0; i < draft.length - 1; i++) {
      if (draft[i + 1]!.time - draft[i]!.time < STANZA_MIN_LOOP_SPAN_SEC) {
        return null;
      }
    }
  }

  return draft;
}

export function sectionBoundaryBeatMisalignment(
  segment: DerivedSegment,
  duration: number,
  metronomeBySegmentId: Record<string, StanzaSegmentMetronomeCalibration> | undefined,
  songCalibration: StanzaSegmentMetronomeCalibration | undefined,
): { start: boolean; end: boolean } {
  const grid = effectiveBeatGridForSegment(segment, metronomeBySegmentId, songCalibration);
  const start =
    segment.start > STANZA_TIME_EPS &&
    beatBoundaryAlignmentErrorSec(segment.start, grid.anchorMediaTime, grid.bpm) > BEAT_ALIGN_EPS;
  const end =
    segment.end < duration - STANZA_TIME_EPS &&
    beatBoundaryAlignmentErrorSec(segment.end, grid.anchorMediaTime, grid.bpm) > BEAT_ALIGN_EPS;
  return { start, end };
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
