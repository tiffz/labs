import type { StanzaMarker } from '../db/stanzaDb';
import { stanzaFingerprintDurationSec } from './stanzaLocalMediaFingerprint';
import { STANZA_TIME_EPS } from './segments';

export function stanzaMaxMarkerTimeSec(markers: StanzaMarker[] | undefined): number {
  return (markers ?? []).reduce((max, marker) => Math.max(max, marker.time), 0);
}

/**
 * Duration for section LAYOUT — not always the live playhead ceiling. Keeps YouTube section
 * markers visible while a newly attached local file is loading or shorter.
 *
 * Do NOT use this to trim markers. It falls back to the marker extent, and
 * `stanzaMediaDurationForMarkerTrim` below explains why feeding that to `sanitizeStanzaMarkers`
 * deletes the section the user just added.
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

/**
 * Media duration only — deliberately never derived from the markers being trimmed.
 *
 * `sanitizeStanzaMarkers` drops an auto-labelled marker sitting on the track end, testing
 * `time >= duration - STANZA_TIME_EPS`. `stanzaSegmentLayoutDuration` falls back to
 * `maxMarkerTime + STANZA_TIME_EPS` when no media duration is known. Those two cancel exactly, so
 * the NEWEST marker always lands on the cut:
 *
 *     duration = T + EPS   ->   T >= (T + EPS) - EPS   ->   always true
 *
 * A section added with its default `Marker N` label was therefore deleted the moment it was
 * saved — silently, because that write passes `recordUndo: false`. It only showed up when no
 * media duration was available, which for a YouTube song means while the iframe player is still
 * loading or after it has errored. Renamed sections survived, which made the loss look arbitrary.
 *
 * Returns 0 when nothing is known. That disables the end-trim (it is guarded on `duration > 0`)
 * while leaving the 0:00 ghost-marker trim intact — a marker is only ever removed for sitting on
 * a track end we can actually prove exists.
 */
export function stanzaMediaDurationForMarkerTrim(opts: {
  playbackDuration: number;
  localMediaFingerprint?: string | null;
  decodedLocalDurationSec?: number;
}): number {
  return Math.max(
    opts.playbackDuration > 0 ? opts.playbackDuration : 0,
    opts.decodedLocalDurationSec && opts.decodedLocalDurationSec > 0
      ? opts.decodedLocalDurationSec
      : 0,
    stanzaFingerprintDurationSec(opts.localMediaFingerprint) ?? 0,
  );
}
