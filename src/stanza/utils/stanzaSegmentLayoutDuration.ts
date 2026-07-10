import type { StanzaMarker } from '../db/stanzaDb';
import { stanzaFingerprintDurationSec } from './stanzaLocalMediaFingerprint';
import { STANZA_TIME_EPS } from './segments';

export function stanzaMaxMarkerTimeSec(markers: StanzaMarker[] | undefined): number {
  return (markers ?? []).reduce((max, marker) => Math.max(max, marker.time), 0);
}

/**
 * Duration for section layout / marker sanitization — not always the live playhead ceiling.
 * Keeps YouTube section markers visible while a newly attached local file is loading or shorter.
 */
export function stanzaSegmentLayoutDuration(opts: {
  markers: StanzaMarker[] | undefined;
  playbackDuration: number;
  localMediaFingerprint?: string | null;
}): number {
  const fromPlayback = opts.playbackDuration > 0 ? opts.playbackDuration : 0;
  const fromFingerprint = stanzaFingerprintDurationSec(opts.localMediaFingerprint) ?? 0;
  const fromMarkers = stanzaMaxMarkerTimeSec(opts.markers);
  const markerExtent = fromMarkers > 0 ? fromMarkers + STANZA_TIME_EPS : 0;
  return Math.max(fromPlayback, fromFingerprint, markerExtent);
}
