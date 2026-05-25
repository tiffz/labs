import type { StanzaMarker } from '../db/stanzaDb';
import { STANZA_TIME_EPS, ensureMarkerIds } from './segments';
import { isCustomMarkerLabel } from './stanzaSongCustomizationScore';

/** Match markers across devices when ids differ but times align. */
const MARKER_TIME_MATCH_EPS = 0.08;

function pickLabel(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  if (isCustomMarkerLabel(ta) && !isCustomMarkerLabel(tb)) return ta;
  if (isCustomMarkerLabel(tb) && !isCustomMarkerLabel(ta)) return tb;
  if (tb.length > ta.length) return tb;
  return ta || tb;
}

function mergeMarkerPair(local: StanzaMarker, remote: StanzaMarker, preferRemote: boolean): StanzaMarker {
  const primary = preferRemote ? remote : local;
  const secondary = preferRemote ? local : remote;
  return {
    id: primary.id ?? secondary.id,
    time: primary.time,
    label: pickLabel(local.label, remote.label),
  };
}

/**
 * Union markers by stable id, then by time proximity. Keeps both sides' boundaries when possible.
 */
export function mergeStanzaMarkers(
  local: readonly StanzaMarker[],
  remote: readonly StanzaMarker[],
  opts?: { preferRemote?: boolean },
): StanzaMarker[] {
  const preferRemote = opts?.preferRemote === true;
  const l = ensureMarkerIds([...local]);
  const r = ensureMarkerIds([...remote]);

  const byId = new Map<string, StanzaMarker>();
  for (const m of l) {
    if (m.id) byId.set(m.id, { ...m });
  }
  for (const m of r) {
    if (!m.id) continue;
    const existing = byId.get(m.id);
    if (existing) {
      byId.set(m.id, mergeMarkerPair(existing, m, preferRemote));
    } else {
      byId.set(m.id, { ...m });
    }
  }

  const unmatchedLocal = l.filter((m) => m.id && !r.some((x) => x.id === m.id));
  const unmatchedRemote = r.filter((m) => m.id && !l.some((x) => x.id === m.id));

  for (const lm of unmatchedLocal) {
    const match = unmatchedRemote.find((rm) => Math.abs(rm.time - lm.time) <= MARKER_TIME_MATCH_EPS);
    if (match?.id) {
      byId.set(match.id, mergeMarkerPair(lm, match, preferRemote));
      const idx = unmatchedRemote.indexOf(match);
      if (idx >= 0) unmatchedRemote.splice(idx, 1);
    } else if (lm.id) {
      byId.set(lm.id, { ...lm });
    }
  }

  for (const rm of unmatchedRemote) {
    if (!rm.id) continue;
    const timeDup = [...byId.values()].some((m) => Math.abs(m.time - rm.time) <= STANZA_TIME_EPS);
    if (!timeDup) byId.set(rm.id, { ...rm });
  }

  const merged = [...byId.values()].sort((a, b) => a.time - b.time);

  const deduped: StanzaMarker[] = [];
  for (const m of merged) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.time - m.time) <= STANZA_TIME_EPS) {
      deduped[deduped.length - 1] = mergeMarkerPair(prev, m, preferRemote);
    } else {
      deduped.push(m);
    }
  }

  return ensureMarkerIds(deduped);
}
