import {
  metronomeDotRadiusPx,
  type MetronomeDotTier,
} from '../audio/metronome/metronomeVisualDots';
import type { SubdivisionType } from '../audio/metronome/types';

/** Nudge right when `headCenterX` is the VexFlow stem origin (Darbuka editor). */
export const METRONOME_DOT_NUDGE_PX = 7;

/** Minimum gap between dot edges when circles would otherwise overlap. */
export const MIN_DOT_EDGE_GAP_PX = 1;

/** Fallback when `headCenterX` is missing (matches click-target heuristic). */
const NOTEHEAD_CENTER_FALLBACK_OFFSET = 14;

export interface MetronomeLayoutNoteAnchor {
  measureIndex: number;
  noteIndex: number;
  charPosition: number;
  durationInSixteenths: number;
  x: number;
  /** VexFlow onset or painted notehead center X. */
  headCenterX?: number;
  /** When true, `headCenterX` is already the painted notehead center (no nudge). */
  headCenterXIsNotehead?: boolean;
}

type OnsetAnchor = { pos: number; centerX: number };

function noteOnsetCenterX(
  note: Pick<MetronomeLayoutNoteAnchor, 'x' | 'headCenterX' | 'headCenterXIsNotehead'>,
): number {
  if (note.headCenterX != null) {
    return note.headCenterXIsNotehead
      ? note.headCenterX
      : note.headCenterX + METRONOME_DOT_NUDGE_PX;
  }
  return note.x + NOTEHEAD_CENTER_FALLBACK_OFFSET + METRONOME_DOT_NUDGE_PX;
}

function buildMeasureOnsetAnchors(
  notes: MetronomeLayoutNoteAnchor[],
  sixteenthsPerMeasure: number,
): OnsetAnchor[] {
  const sorted = [...notes].sort(
    (a, b) => a.charPosition - b.charPosition || a.noteIndex - b.noteIndex,
  );
  return sorted.map((note) => ({
    pos: note.charPosition - note.measureIndex * sixteenthsPerMeasure,
    centerX: noteOnsetCenterX(note),
  }));
}

function linearMeasureX(
  positionInSixteenths: number,
  measureStartX: number,
  measureEndX: number,
  sixteenthsPerMeasure: number,
): number {
  const fraction = Math.min(1, Math.max(0, positionInSixteenths / sixteenthsPerMeasure));
  return measureStartX + fraction * (measureEndX - measureStartX);
}

/**
 * Map every sixteenth slot in the measure to X by interpolating between note onsets
 * (and measure edges). Subdivisions land evenly in **time** between visible attacks.
 */
export function buildSixteenthXMap(params: {
  measureIndex: number;
  notePositions: MetronomeLayoutNoteAnchor[];
  measureStartX: number;
  measureEndX: number;
  sixteenthsPerMeasure: number;
}): number[] {
  const {
    measureIndex,
    notePositions,
    measureStartX,
    measureEndX,
    sixteenthsPerMeasure,
  } = params;

  if (sixteenthsPerMeasure <= 0) return [];

  const fallback = (pos: number) =>
    linearMeasureX(pos, measureStartX, measureEndX, sixteenthsPerMeasure);

  const xs = Array.from({ length: sixteenthsPerMeasure }, (_, pos) => fallback(pos));

  const measureNotes = notePositions.filter((n) => n.measureIndex === measureIndex);
  if (measureNotes.length === 0) return xs;

  const keyframeByPos = new Map<number, number>();
  keyframeByPos.set(0, measureStartX);
  for (const anchor of buildMeasureOnsetAnchors(measureNotes, sixteenthsPerMeasure)) {
    keyframeByPos.set(anchor.pos, anchor.centerX);
  }
  keyframeByPos.set(sixteenthsPerMeasure, measureEndX);

  const keyframes = [...keyframeByPos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pos, centerX]) => ({ pos, centerX }));

  for (let s = 0; s < keyframes.length - 1; s += 1) {
    const left = keyframes[s];
    const right = keyframes[s + 1];
    if (right.pos <= left.pos) continue;

    if (left.pos >= 0 && left.pos < sixteenthsPerMeasure) {
      xs[left.pos] = left.centerX;
    }

    for (let pos = left.pos + 1; pos < right.pos && pos < sixteenthsPerMeasure; pos += 1) {
      const t = (pos - left.pos) / (right.pos - left.pos);
      xs[pos] = left.centerX + t * (right.centerX - left.centerX);
    }
  }

  return xs;
}

/** Interpolate X at fractional sixteenth positions (triplets, etc.). */
function xAtSixteenthPosition(
  positionInSixteenths: number,
  map: number[],
  measureStartX: number,
  measureEndX: number,
  sixteenthsPerMeasure: number,
): number {
  if (map.length === 0 || sixteenthsPerMeasure <= 0) {
    return linearMeasureX(positionInSixteenths, measureStartX, measureEndX, sixteenthsPerMeasure);
  }

  const clamped = Math.max(0, Math.min(sixteenthsPerMeasure, positionInSixteenths));
  const lo = Math.floor(clamped);
  const hi = Math.min(sixteenthsPerMeasure - 1, lo + 1);
  const xLo = map[lo] ?? linearMeasureX(lo, measureStartX, measureEndX, sixteenthsPerMeasure);
  if (hi === lo || clamped === lo) return xLo;
  const xHi = map[hi] ?? linearMeasureX(hi, measureStartX, measureEndX, sixteenthsPerMeasure);
  const t = clamped - lo;
  return xLo + t * (xHi - xLo);
}

/** X for one grid slot — note onsets snap to noteheads; others interpolate between anchors. */
export function resolveMetronomeDotXInMeasure(params: {
  measureIndex: number;
  positionInSixteenths: number;
  notePositions: MetronomeLayoutNoteAnchor[];
  measureStartX: number;
  measureEndX: number;
  sixteenthsPerMeasure: number;
  sixteenthXMap?: number[];
}): number {
  const {
    measureIndex,
    positionInSixteenths,
    notePositions,
    measureStartX,
    measureEndX,
    sixteenthsPerMeasure,
    sixteenthXMap,
  } = params;

  if (sixteenthsPerMeasure <= 0) return measureStartX;

  const map =
    sixteenthXMap ??
    buildSixteenthXMap({
      measureIndex,
      notePositions,
      measureStartX,
      measureEndX,
      sixteenthsPerMeasure,
    });

  return xAtSixteenthPosition(
    positionInSixteenths,
    map,
    measureStartX,
    measureEndX,
    sixteenthsPerMeasure,
  );
}

export function noteheadCenterX(
  note: Pick<MetronomeLayoutNoteAnchor, 'x' | 'headCenterX' | 'headCenterXIsNotehead'>,
): number {
  return noteOnsetCenterX(note);
}

export type MetronomeDotPlacement = {
  positionInSixteenths: number;
  tier: MetronomeDotTier;
  subdivision?: SubdivisionType;
  x: number;
  renderRadiusPx?: number;
  cyOffsetPx?: number;
  /** When true, X is locked to a note onset — collision pass must not nudge. */
  pinnedToNoteOnset?: boolean;
};

function minCenterGapPx(
  leftRadius: number,
  rightRadius: number,
): number {
  return leftRadius + rightRadius + MIN_DOT_EDGE_GAP_PX;
}

const TIER_ANCHOR_RANK: Record<MetronomeDotTier, number> = {
  downbeat: 3,
  beat: 2,
  subdivision: 1,
};

function placementRadius(placement: MetronomeDotPlacement): number {
  return (
    placement.renderRadiusPx ?? metronomeDotRadiusPx(placement.tier, placement.subdivision)
  );
}

/** Keep beat/downbeat anchors when possible; nudge lower-priority dots to prevent overlap. */
function resolveHorizontalCollisions(sorted: MetronomeDotPlacement[]): void {
  if (sorted.length <= 1) return;

  const maxPasses = sorted.length * 2;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;

    for (let i = 1; i < sorted.length; i += 1) {
      const minGap = minCenterGapPx(placementRadius(sorted[i - 1]), placementRadius(sorted[i]));
      if (sorted[i].x - sorted[i - 1].x >= minGap) continue;

      const leftPinned = sorted[i - 1].pinnedToNoteOnset === true;
      const rightPinned = sorted[i].pinnedToNoteOnset === true;

      if (leftPinned && rightPinned) continue;

      if (rightPinned && !leftPinned) {
        sorted[i - 1].x = sorted[i].x - minGap;
      } else if (leftPinned && !rightPinned) {
        sorted[i].x = sorted[i - 1].x + minGap;
      } else if (TIER_ANCHOR_RANK[sorted[i].tier] <= TIER_ANCHOR_RANK[sorted[i - 1].tier]) {
        if (!rightPinned) sorted[i].x = sorted[i - 1].x + minGap;
      } else {
        if (!leftPinned) sorted[i - 1].x = sorted[i].x - minGap;
      }
      changed = true;
    }

    for (let i = sorted.length - 2; i >= 0; i -= 1) {
      const minGap = minCenterGapPx(placementRadius(sorted[i]), placementRadius(sorted[i + 1]));
      if (sorted[i + 1].x - sorted[i].x >= minGap) continue;

      const leftPinned = sorted[i].pinnedToNoteOnset === true;
      const rightPinned = sorted[i + 1].pinnedToNoteOnset === true;

      if (leftPinned && rightPinned) continue;

      if (leftPinned && !rightPinned) {
        sorted[i + 1].x = sorted[i].x + minGap;
      } else if (rightPinned && !leftPinned) {
        sorted[i].x = sorted[i + 1].x - minGap;
      } else if (TIER_ANCHOR_RANK[sorted[i].tier] <= TIER_ANCHOR_RANK[sorted[i + 1].tier]) {
        if (!leftPinned) sorted[i].x = sorted[i + 1].x - minGap;
      } else {
        if (!rightPinned) sorted[i + 1].x = sorted[i].x + minGap;
      }
      changed = true;
    }

    if (!changed) break;
  }
}

/** Nudge overlapping dots apart; expand trailing clusters when measure end has slack. */
function finalizeMetronomeDotPlacements(
  placements: MetronomeDotPlacement[],
  measureEndX?: number,
  sixteenthsPerMeasure?: number,
  sixteenthXMap?: number[],
  measureStartX?: number,
): MetronomeDotPlacement[] {
  if (placements.length === 0) return placements;

  const sorted = placements.map((p) => ({ ...p, cyOffsetPx: 0 }));
  sorted.sort((a, b) => a.x - b.x);
  resolveHorizontalCollisions(sorted);

  if (measureEndX == null || sixteenthsPerMeasure == null || sixteenthsPerMeasure <= 0) {
    return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
  }

  const lastBeatPos = sorted.reduce(
    (max, dot) =>
      dot.tier === 'beat' || dot.tier === 'downbeat'
        ? Math.max(max, dot.positionInSixteenths)
        : max,
    -1,
  );
  if (lastBeatPos < 0) {
    return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
  }

  const trailingCluster = sorted.filter(
    (dot) =>
      dot.tier === 'subdivision' && dot.positionInSixteenths > lastBeatPos,
  );
  if (trailingCluster.length === 0) {
    return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
  }

  const beatAtEnd = sorted.find(
    (dot) =>
      dot.positionInSixteenths === lastBeatPos &&
      (dot.tier === 'beat' || dot.tier === 'downbeat'),
  );
  if (!beatAtEnd) {
    return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
  }

  trailingCluster.sort(
    (a, b) => a.positionInSixteenths - b.positionInSixteenths,
  );

  // When every trailing slot lands on a note attack, keep notehead alignment — do not
  // stretch subdivisions toward the barline (last-beat sixteenth runs).
  if (trailingCluster.every((dot) => dot.pinnedToNoteOnset)) {
    return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
  }

  const lastSub = trailingCluster[trailingCluster.length - 1];
  const maxCenterX = measureEndX - 6;
  const targetLastX = maxCenterX - placementRadius(lastSub);
  const mapLastX =
    sixteenthXMap != null &&
    measureStartX != null
      ? xAtSixteenthPosition(
          lastSub.positionInSixteenths,
          sixteenthXMap,
          measureStartX,
          measureEndX,
          sixteenthsPerMeasure,
        )
      : undefined;
  const spanEnd = Math.max(
    targetLastX,
    mapLastX != null ? mapLastX : targetLastX,
  );
  const spanStart = beatAtEnd.x;
  const targetSpan = spanEnd - spanStart;
  const tLast = lastSub.positionInSixteenths;

  if (targetSpan > 0 && tLast > lastBeatPos) {
    for (const dot of trailingCluster) {
      if (dot.pinnedToNoteOnset) continue;
      const t = (dot.positionInSixteenths - lastBeatPos) / (tLast - lastBeatPos);
      const spreadX = spanStart + t * targetSpan;
      const mapX =
        sixteenthXMap != null &&
        measureStartX != null
          ? xAtSixteenthPosition(
              dot.positionInSixteenths,
              sixteenthXMap,
              measureStartX,
              measureEndX,
              sixteenthsPerMeasure,
            )
          : undefined;
      dot.x = mapX != null ? Math.max(mapX, spreadX) : spreadX;
    }
  }

  for (let i = 1; i < trailingCluster.length; i += 1) {
    const leftPinned = trailingCluster[i - 1].pinnedToNoteOnset === true;
    const rightPinned = trailingCluster[i].pinnedToNoteOnset === true;
    if (leftPinned && rightPinned) continue;

    const minGap = minCenterGapPx(
      placementRadius(trailingCluster[i - 1]),
      placementRadius(trailingCluster[i]),
    );
    if (trailingCluster[i].x - trailingCluster[i - 1].x < minGap) {
      if (rightPinned && !leftPinned) {
        trailingCluster[i - 1].x = trailingCluster[i].x - minGap;
      } else {
        trailingCluster[i].x = trailingCluster[i - 1].x + minGap;
      }
    }
  }

  const minGapAfterBeat = minCenterGapPx(
    placementRadius(beatAtEnd),
    placementRadius(trailingCluster[0]),
  );
  if (
    !trailingCluster[0].pinnedToNoteOnset &&
    trailingCluster[0].x - beatAtEnd.x < minGapAfterBeat
  ) {
    const delta = beatAtEnd.x + minGapAfterBeat - trailingCluster[0].x;
    for (const dot of trailingCluster) {
      if (dot.pinnedToNoteOnset) continue;
      dot.x += delta;
    }
  }

  return sorted.sort((a, b) => a.positionInSixteenths - b.positionInSixteenths);
}

const ONSET_POSITION_EPS = 0.05;

/** Snap dots that land on a note attack to the painted notehead center. */
function pinDotsToNoteOnsets(
  placements: MetronomeDotPlacement[],
  notePositions: MetronomeLayoutNoteAnchor[],
  measureIndex: number,
  sixteenthsPerMeasure: number,
): void {
  const onsetXByPos = new Map<number, number>();
  for (const note of notePositions) {
    if (note.measureIndex !== measureIndex) continue;
    const localPos = note.charPosition - measureIndex * sixteenthsPerMeasure;
    onsetXByPos.set(localPos, noteOnsetCenterX(note));
  }

  for (const placement of placements) {
    for (const [localPos, centerX] of onsetXByPos) {
      if (Math.abs(placement.positionInSixteenths - localPos) <= ONSET_POSITION_EPS) {
        placement.x = centerX;
        placement.pinnedToNoteOnset = true;
        break;
      }
    }
  }
}

/** Resolve X under notehead centers; subdivisions interpolate between onsets in time. */
export function layoutMetronomeDotsInMeasure(params: {
  measureIndex: number;
  dots: Array<{
    positionInSixteenths: number;
    tier: MetronomeDotTier;
    subdivision?: SubdivisionType;
  }>;
  notePositions: MetronomeLayoutNoteAnchor[];
  measureStartX: number;
  measureEndX: number;
  sixteenthsPerMeasure: number;
}): MetronomeDotPlacement[] {
  const sixteenthXMap = buildSixteenthXMap({
    measureIndex: params.measureIndex,
    notePositions: params.notePositions,
    measureStartX: params.measureStartX,
    measureEndX: params.measureEndX,
    sixteenthsPerMeasure: params.sixteenthsPerMeasure,
  });

  const initial = [...params.dots]
    .sort((a, b) => a.positionInSixteenths - b.positionInSixteenths)
    .map((dot) => ({
      positionInSixteenths: dot.positionInSixteenths,
      tier: dot.tier,
      subdivision: dot.subdivision,
      renderRadiusPx: metronomeDotRadiusPx(dot.tier, dot.subdivision),
      x: resolveMetronomeDotXInMeasure({
        measureIndex: params.measureIndex,
        positionInSixteenths: dot.positionInSixteenths,
        notePositions: params.notePositions,
        measureStartX: params.measureStartX,
        measureEndX: params.measureEndX,
        sixteenthsPerMeasure: params.sixteenthsPerMeasure,
        sixteenthXMap,
      }),
    }));

  pinDotsToNoteOnsets(
    initial,
    params.notePositions,
    params.measureIndex,
    params.sixteenthsPerMeasure,
  );

  return finalizeMetronomeDotPlacements(
    initial,
    params.measureEndX,
    params.sixteenthsPerMeasure,
    sixteenthXMap,
    params.measureStartX,
  );
}
