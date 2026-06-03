import type { StanzaSegmentMetronomeCalibration } from '../db/stanzaDb';
import { calibrationEffectiveAnchorMediaTime } from './stanzaMetronome';
import type { DerivedSegment } from './segments';

/** Live-timing id when editing whole-song metronome in the rail. */
export const STANZA_SONG_METRONOME_LIVE_ID = '__song__';

export type ResolveStanzaMetronomeGridOptions = {
  playbackSeg: DerivedSegment | null;
  songCal: StanzaSegmentMetronomeCalibration | undefined;
  segmentCal: StanzaSegmentMetronomeCalibration | undefined;
  railLive: { segmentId: string; bpm: number; anchorMediaTime: number } | null;
  /**
   * Section the user is calibrating in the rail (may differ from `playbackSeg` briefly after seek,
   * or while the analysis modal drives preview timing for that section).
   */
  railFocusSegmentId?: string | null;
};

/**
 * Resolve BPM + Beat 1 anchor from persisted calibration, live rail edits, or section scope.
 * Used by drums and metronome clicks — independent of whether the metronome toggle is on.
 */
export function resolveStanzaMetronomeGridSync(
  opts: ResolveStanzaMetronomeGridOptions,
): { bpm?: number; anchor?: number } {
  if (!opts.playbackSeg) {
    return {};
  }
  const segId = opts.playbackSeg.id;
  const rail = opts.railLive && opts.railLive.bpm > 0 ? opts.railLive : null;
  const focus = opts.railFocusSegmentId;
  const railRelevant =
    rail &&
    (rail.segmentId === STANZA_SONG_METRONOME_LIVE_ID ||
      rail.segmentId === segId ||
      (focus != null && focus !== '' && rail.segmentId === focus));

  if (railRelevant) {
    return {
      bpm: rail.bpm,
      anchor: rail.anchorMediaTime,
    };
  }

  const seg = opts.playbackSeg;
  const sCal = opts.segmentCal;
  if (sCal && sCal.bpm > 0) {
    return {
      bpm: sCal.bpm,
      anchor: calibrationEffectiveAnchorMediaTime(seg.start, sCal),
    };
  }

  const gCal = opts.songCal;
  if (gCal && gCal.bpm > 0) {
    return {
      bpm: gCal.bpm,
      anchor: calibrationEffectiveAnchorMediaTime(0, gCal),
    };
  }

  return {};
}

export function resolveStanzaMetronomePlaybackSync(
  opts: ResolveStanzaMetronomeGridOptions & { metronomeEnabled: boolean },
): { bpm?: number; anchor?: number } {
  if (!opts.metronomeEnabled) {
    return {};
  }
  return resolveStanzaMetronomeGridSync(opts);
}
