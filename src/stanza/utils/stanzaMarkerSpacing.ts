import type { StanzaMarker } from '../db/stanzaDb';
import { ensureMarkerIds, STANZA_TIME_EPS } from './segments';

/**
 * Minimum time between section boundaries on the timeline (seconds).
 * Prevents stacked splits and keeps drag handles grabbable.
 */
export const STANZA_MIN_MARKER_GAP_SEC = 0.5;

export function markersAreTooClose(a: number, b: number): boolean {
  return Math.abs(a - b) < STANZA_MIN_MARKER_GAP_SEC;
}

/** Same neighbour clamp as timeline marker drag (seconds). */
export function clampMarkerTimeBetweenNeighbours(
  markerId: string,
  rawTime: number,
  list: StanzaMarker[],
  duration: number,
): number {
  const sorted = [...ensureMarkerIds(list)].sort((a, b) => a.time - b.time);
  const idx = sorted.findIndex((m) => m.id === markerId);
  if (idx < 0) return rawTime;
  const prevT = idx <= 0 ? 0 : sorted[idx - 1]!.time;
  const nextT = idx >= sorted.length - 1 ? duration : sorted[idx + 1]!.time;
  const minT = prevT + STANZA_MIN_MARKER_GAP_SEC;
  const maxT = nextT - STANZA_MIN_MARKER_GAP_SEC;
  if (minT > maxT) return (minT + maxT) / 2;
  return Math.max(minT, Math.min(maxT, rawTime));
}

/**
 * Whether a new or moved boundary can sit at `time` without overlapping another marker.
 * `excludeMarkerId` is set while dragging an existing handle.
 */
export function canPlaceMarkerAtTime(
  time: number,
  markers: StanzaMarker[],
  duration: number,
  excludeMarkerId?: string,
): boolean {
  if (!(duration > 0) || !Number.isFinite(time)) return false;
  const t = Math.max(0, Math.min(duration, time));
  for (const m of ensureMarkerIds(markers)) {
    if (!m.id || m.id === excludeMarkerId) continue;
    if (markersAreTooClose(t, m.time)) return false;
  }
  if (t < STANZA_TIME_EPS && markers.some((m) => m.id !== excludeMarkerId && m.time < STANZA_TIME_EPS)) {
    return false;
  }
  if (
    t > duration - STANZA_TIME_EPS &&
    markers.some((m) => m.id !== excludeMarkerId && m.time > duration - STANZA_TIME_EPS)
  ) {
    return false;
  }
  return true;
}

export function markerTimesEqual(a: StanzaMarker[], b: StanzaMarker[]): boolean {
  const sa = [...ensureMarkerIds(a)].sort((x, y) => x.time - y.time);
  const sb = [...ensureMarkerIds(b)].sort((x, y) => x.time - y.time);
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    const ma = sa[i]!;
    const mb = sb[i]!;
    if (ma.id !== mb.id) return false;
    if (Math.abs(ma.time - mb.time) > STANZA_TIME_EPS) return false;
    if (ma.label !== mb.label) return false;
  }
  return true;
}
