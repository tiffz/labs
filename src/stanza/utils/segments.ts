import type { StanzaMarker } from '../db/stanzaDb';

export type DerivedSegment = {
  id: string;
  index: number;
  start: number;
  end: number;
  label: string;
};

export const STANZA_TIME_EPS = 0.02;

const DEFAULT_SECTION_LABEL_RE = /^Section \d+$/i;
const DEFAULT_MARKER_LABEL_RE = /^Marker \d+$/i;

function isRedundantTrackEdgeLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  return DEFAULT_SECTION_LABEL_RE.test(t) || DEFAULT_MARKER_LABEL_RE.test(t);
}

/**
 * Drops markers pinned to the implicit track start/end when their labels are auto-generated.
 * Track boundaries always exist without markers; redundant edge markers (often recreated by
 * section hover rename) show up as undeletable "ghost" splits at 0:00.
 */
export function sanitizeStanzaMarkers(markers: StanzaMarker[], duration: number): StanzaMarker[] {
  return ensureMarkerIds(markers).filter((m) => {
    const atStart = m.time <= STANZA_TIME_EPS;
    const atEnd = duration > 0 && m.time >= duration - STANZA_TIME_EPS;
    if (!atStart && !atEnd) return true;
    return !isRedundantTrackEdgeLabel(m.label ?? '');
  });
}

const BOUNDARY_START = '__stanza_start__';
const BOUNDARY_END = '__stanza_end__';

function markerLabelAt(markers: StanzaMarker[], time: number): string {
  const m = markers.find((x) => Math.abs(x.time - time) < STANZA_TIME_EPS);
  return m?.label?.trim() || '';
}

/** Assigns a random `id` to markers that are missing one (IndexedDB / migration). */
export function ensureMarkerIds(markers: StanzaMarker[]): StanzaMarker[] {
  return markers.map((m) => (m.id ? m : { ...m, id: crypto.randomUUID() }));
}

function boundaryKeyAtTime(t: number, duration: number, sortedWithIds: StanzaMarker[]): string {
  if (t < STANZA_TIME_EPS) return BOUNDARY_START;
  if (t > duration - STANZA_TIME_EPS) return BOUNDARY_END;
  const at = sortedWithIds.filter((m) => Math.abs(m.time - t) < STANZA_TIME_EPS);
  if (at.length === 0) return `__stanza_t_${t.toFixed(4)}`;
  return [...new Set(at.map((m) => m.id!))].sort().join('|');
}

function stableSegmentId(leftKey: string, rightKey: string): string {
  return `stanzaSeg:${leftKey}:${rightKey}`;
}

/**
 * Builds contiguous segments from sorted unique boundaries: 0, marker times, duration.
 * Segment ids are stable across marker moves: `stanzaSeg:leftBoundary:rightBoundary`.
 */
export function deriveSegments(markers: StanzaMarker[], duration: number): DerivedSegment[] {
  if (!(duration > 0)) return [];

  const sorted = ensureMarkerIds([...markers]).sort((a, b) => a.time - b.time);
  const rawBounds = [0, ...sorted.map((m) => m.time), duration];
  const bounds: number[] = [];
  for (const t of rawBounds) {
    const clamped = Math.max(0, Math.min(t, duration));
    if (bounds.length === 0 || Math.abs(clamped - bounds[bounds.length - 1]!) > STANZA_TIME_EPS) {
      bounds.push(clamped);
    }
  }
  if (bounds[bounds.length - 1]! < duration - STANZA_TIME_EPS) {
    bounds.push(duration);
  }

  const out: DerivedSegment[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    if (end - start < STANZA_TIME_EPS) continue;
    const leftKey = boundaryKeyAtTime(start, duration, sorted);
    const rightKey = boundaryKeyAtTime(end, duration, sorted);
    const id = stableSegmentId(leftKey, rightKey);
    const label = markerLabelAt(sorted, start) || `Section ${out.length + 1}`;
    out.push({
      id,
      index: out.length,
      start,
      end,
      label,
    });
  }
  return out;
}

/** Legacy segment layout (pre–stable-id); used only for one-time DB migration. */
export function legacyDeriveSegments(
  markers: StanzaMarker[],
  duration: number,
): { id: string; start: number; end: number }[] {
  if (!(duration > 0)) return [];
  const sorted = [...markers].sort((a, b) => a.time - b.time);
  const rawBounds = [0, ...sorted.map((m) => m.time), duration];
  const bounds: number[] = [];
  for (const t of rawBounds) {
    const clamped = Math.max(0, Math.min(t, duration));
    if (bounds.length === 0 || Math.abs(clamped - bounds[bounds.length - 1]!) > STANZA_TIME_EPS) {
      bounds.push(clamped);
    }
  }
  if (bounds[bounds.length - 1]! < duration - STANZA_TIME_EPS) {
    bounds.push(duration);
  }
  const out: { id: string; start: number; end: number }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i]!;
    const end = bounds[i + 1]!;
    if (end - start < STANZA_TIME_EPS) continue;
    out.push({ id: `seg-${out.length}`, start, end });
  }
  return out;
}

export function findSegmentIndexAtTime(segments: DerivedSegment[], t: number): number | null {
  for (const s of segments) {
    if (t >= s.start && t < s.end) return s.index;
  }
  if (segments.length > 0) {
    const last = segments[segments.length - 1]!;
    if (t >= last.start && t <= last.end + STANZA_TIME_EPS) return last.index;
  }
  return null;
}

/** True when `indices` has at least two distinct segment indices in a single contiguous run (e.g. 2,3,4). */
export function areContiguousSegmentIndices(indices: readonly number[]): boolean {
  const s = [...new Set(indices)].sort((a, b) => a - b);
  if (s.length < 2) return false;
  for (let i = 1; i < s.length; i++) {
    if (s[i] !== s[i - 1]! + 1) return false;
  }
  return true;
}

/**
 * Marker exactly at `boundaryTime` that may be removed to merge this section into the previous
 * (Logic-style: interior boundaries only — not start-of-track or end-of-track).
 */
export function deletableBoundaryMarkerAtTime(
  boundaryTime: number,
  markers: StanzaMarker[],
  duration: number,
): StanzaMarker | null {
  if (!(duration > 0)) return null;
  const sorted = ensureMarkerIds([...markers]).sort((a, b) => a.time - b.time);
  const m = sorted.find((x) => Math.abs(x.time - boundaryTime) < STANZA_TIME_EPS);
  if (!m?.id) return null;
  if (m.time <= STANZA_TIME_EPS || m.time >= duration - STANZA_TIME_EPS) return null;
  return m;
}
