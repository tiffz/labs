import { STANZA_TIME_EPS } from './segments';
import type { StanzaPlaybackLoopMode } from './stanzaPlaybackLoop';

/** Selection span used for loop-selection playhead clamping (matches StanzaTimeline). */
export type StanzaPlayheadSelectionSpan = {
  start: number;
  end: number;
};

/**
 * While scrubbing, {@link seekDisplayPendingRef} can stay set after `playback.currentTime`
 * advances (play, timeupdate). Ignore stale pending values beyond this drift.
 */
export const STANZA_TIMELINE_PENDING_DRIFT_SEC = 0.35;

/** Pick transport time for playhead paint and split-at-playhead (pending only when in sync). */
export function resolveStanzaTimelineTransport(
  liveTime: number,
  seekPending: number | null,
): number {
  if (seekPending == null || !Number.isFinite(seekPending)) return liveTime;
  if (!Number.isFinite(liveTime)) return seekPending;
  if (Math.abs(seekPending - liveTime) <= STANZA_TIMELINE_PENDING_DRIFT_SEC) return seekPending;
  return liveTime;
}

/**
 * Time value that matches the painted timeline playhead (loop-selection clamp, etc.).
 * Clamps only for display when transport briefly runs past the selection end before the
 * transport RAF issues an immediate loop wrap seek — keeps the knob from painting past
 * the pink span for a frame or two.
 */
export function stanzaPlayheadDisplayTime(
  transportTime: number,
  duration: number,
  loopMode: StanzaPlaybackLoopMode,
  selectionSpan: StanzaPlayheadSelectionSpan | null | undefined,
): number {
  if (!(duration > 0) || !Number.isFinite(transportTime)) return Math.max(0, transportTime);
  if (loopMode === 'loopSelection' && selectionSpan != null) {
    const floor = Math.max(selectionSpan.start, selectionSpan.end - STANZA_TIME_EPS * 3);
    return Math.min(transportTime, floor);
  }
  return transportTime;
}
