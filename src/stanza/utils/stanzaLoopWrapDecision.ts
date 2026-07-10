import { isPastLoopWrapPoint, STANZA_LOOP_WRAP_TOLERANCE_SEC } from './stanzaPlaybackLoop';

/** Minimum transport delta treated as "still advancing" near a loop end. */
export const STANZA_LOOP_TRANSPORT_ADVANCE_EPS_SEC = 0.0005;

/** Consecutive RAF ticks without advance before wrapping near the loop end. */
export const STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD = 2;

export type StanzaLoopWrapDecisionInput = {
  transportTime: number;
  /** Loop boundary (whole-track duration or selection span end). */
  loopEnd: number;
  /** Reported media duration from transport metadata. */
  reportedDuration: number;
  previousTransportTime: number | null;
  stalledFrames: number;
};

export type StanzaLoopWrapDecision = {
  shouldWrap: boolean;
  loopEnd: number;
  /** Grown duration when transport runs past reported metadata (HTML5 / YouTube drift). */
  duration: number;
  stalledFrames: number;
  previousTransportTime: number;
};

/**
 * Decide whether forward playback should wrap at a loop boundary.
 *
 * Avoids clipping the audible tail when reported duration is shorter than the
 * actual media end: while the playhead is still advancing near/past the loop
 * end, extend the boundary instead of wrapping. Wrap once transport stalls near
 * the (possibly extended) end, or rely on `onEnded` / YouTube `ENDED` as well.
 */
export function decideStanzaLoopWrap(input: StanzaLoopWrapDecisionInput): StanzaLoopWrapDecision {
  const { transportTime, loopEnd: initialLoopEnd, reportedDuration, previousTransportTime, stalledFrames } =
    input;

  let loopEnd = initialLoopEnd;
  let duration = reportedDuration;

  if (Number.isFinite(transportTime) && transportTime > reportedDuration) {
    duration = transportTime;
    loopEnd = Math.max(loopEnd, transportTime);
  }

  const advancing =
    previousTransportTime != null &&
    Number.isFinite(transportTime) &&
    transportTime > previousTransportTime + STANZA_LOOP_TRANSPORT_ADVANCE_EPS_SEC;

  const nextStalledFrames = advancing ? 0 : stalledFrames + 1;
  const nearEnd = isPastLoopWrapPoint(transportTime, loopEnd, STANZA_LOOP_WRAP_TOLERANCE_SEC);

  // HTML5 often freezes currentTime at reported metadata duration while the audible tail still
  // plays. Defer stall-based wrap until transport exceeds metadata (or onEnded handles it).
  const atMetadataCeiling =
    Number.isFinite(transportTime) &&
    transportTime <= reportedDuration + STANZA_LOOP_WRAP_TOLERANCE_SEC &&
    duration <= reportedDuration;

  const shouldWrap =
    nearEnd &&
    !advancing &&
    !atMetadataCeiling &&
    nextStalledFrames >= STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD;

  return {
    shouldWrap,
    loopEnd,
    duration,
    stalledFrames: nearEnd ? nextStalledFrames : 0,
    previousTransportTime: transportTime,
  };
}
