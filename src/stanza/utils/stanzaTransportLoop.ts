import type { StanzaPlaybackLoopMode } from './stanzaPlaybackLoop';
import { resolveEffectiveStanzaLoopMode } from './stanzaPlaybackFocus';
import { shouldWrapLoopSelection, STANZA_LOOP_WRAP_TOLERANCE_SEC } from './stanzaPlaybackLoop';
import {
  decideStanzaLoopWrap,
  STANZA_LOOP_TRANSPORT_ADVANCE_EPS_SEC,
  STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD,
} from './stanzaLoopWrapDecision';
import {
  hasSkippedSections,
  isSegmentSkipped,
  nextNonSkippedTimeForwardPlayback,
  resolvePlayableWindowAnchors,
  type SkippedSegmentSet,
} from './stanzaSkippedSections';
import { STANZA_TIME_EPS } from './segments';
import type { DerivedSegment } from './segments';
import { findSegmentIndexAtTime } from './segments';

export type StanzaSelectionSpan = { start: number; end: number };

/**
 * A backward jump larger than this, during forward playback with no seek behind it, is a broken
 * clock rather than a position. Generous enough to survive jitter from a coarse (~250 ms) YouTube
 * clock, tight enough to catch the 0 a dead controller reports.
 */
export const STANZA_IMPLAUSIBLE_BACK_JUMP_SEC = 1;

export type StanzaLoopPlaybackWindow = {
  windowStart: number;
  windowEnd: number;
  loop: boolean;
  /** Playable loop end for wrap decisions (may be before marker span end when skips exist). */
  loopWrapEnd: number;
  loopWrapStart: number;
};

/** Resolve skip/loop window + playable wrap anchors for the current loop mode. */
export function resolveStanzaLoopPlaybackWindow(opts: {
  loopMode: StanzaPlaybackLoopMode;
  duration: number;
  selectionSpan: StanzaSelectionSpan | null;
  segments: DerivedSegment[];
  skipped: SkippedSegmentSet;
}): StanzaLoopPlaybackWindow | null {
  const { loopMode, duration, selectionSpan, segments, skipped } = opts;
  const effectiveLoopMode = resolveEffectiveStanzaLoopMode({ loopMode, selectionSpan });
  if (effectiveLoopMode === 'loopAll' && duration > 0) {
    const { start, end } = resolvePlayableWindowAnchors(segments, skipped, 0, duration);
    const loopWrapEnd = hasSkippedSections(skipped)
      ? end
      : Math.max(start, duration - STANZA_TIME_EPS);
    return { windowStart: 0, windowEnd: duration, loop: true, loopWrapStart: start, loopWrapEnd };
  }
  if (effectiveLoopMode === 'loopSelection' && selectionSpan) {
    const { start, end } = resolvePlayableWindowAnchors(
      segments,
      skipped,
      selectionSpan.start,
      selectionSpan.end,
    );
    return {
      windowStart: selectionSpan.start,
      windowEnd: selectionSpan.end,
      loop: true,
      loopWrapStart: start,
      loopWrapEnd: end,
    };
  }
  if (effectiveLoopMode === 'through') {
    const windowEnd = duration > 0 ? duration : 0;
    return { windowStart: 0, windowEnd, loop: false, loopWrapStart: 0, loopWrapEnd: windowEnd };
  }
  return null;
}

export type StanzaTransportLoopTickInput = {
  transportTime: number;
  duration: number;
  loopMode: StanzaPlaybackLoopMode;
  segments: DerivedSegment[];
  skipped: SkippedSegmentSet;
  selectionSpan: StanzaSelectionSpan | null;
  previousTransportTime: number | null;
  stalledFrames: number;
  /** When set, suppress skip-advance for this section id (user explicitly entered). */
  userEnteredSectionId: string | null;
};

export type StanzaTransportLoopTickResult = {
  skipSeekTarget: number | null;
  skipExhaustedPause: boolean;
  wrapSeekTarget: number | null;
  seekBeforeLoopStart: number | null;
  grownDuration: number | null;
  nextPreviousTransportTime: number | null;
  nextStalledFrames: number;
  clearUserEnteredSection: boolean;
  /**
   * The transport clock stopped advancing while we believe playback is running.
   *
   * Section looping used to have no notion of this at all — it compared `time >= end` and hard-set
   * `nextStalledFrames: 0` every tick, so a YouTube player that had degraded (the controller
   * reporting a frozen time, or 0) simply never reached the section end and playback ran on for
   * bars. Whole-song looping has tracked this since `decideStanzaLoopWrap`; section looping is the
   * mode the owner actually practises in, and it was the one flying blind.
   */
  transportClockStalled: boolean;
};

/**
 * Pure one-tick evaluation mirroring the Stanza transport RAF (skip advance + loop wrap).
 * Used for characterization tests and {@link useStanzaTransportLoop}.
 */
export function evaluateStanzaTransportLoopTick(input: StanzaTransportLoopTickInput): StanzaTransportLoopTickResult {
  const {
    transportTime: tLive,
    duration: d,
    loopMode,
    segments: segs,
    skipped,
    selectionSpan: span,
    previousTransportTime,
    stalledFrames,
    userEnteredSectionId,
  } = input;

  let clearUserEnteredSection = false;
  const effectiveLoopMode = resolveEffectiveStanzaLoopMode({ loopMode, selectionSpan: span });

  if (hasSkippedSections(skipped)) {
    const idx = findSegmentIndexAtTime(segs, tLive);
    const seg = idx != null ? segs[idx] : null;
    if (seg && userEnteredSectionId && seg.id !== userEnteredSectionId) {
      clearUserEnteredSection = true;
    }
    if (seg && userEnteredSectionId !== seg.id && isSegmentSkipped(seg, skipped)) {
      let windowStart = 0;
      let windowEnd = d > 0 ? d : seg.end;
      let loop = false;
      if (effectiveLoopMode === 'loopAll' && d > 0) {
        loop = true;
      } else if (effectiveLoopMode === 'loopSelection' && span) {
        windowStart = span.start;
        windowEnd = span.end;
        loop = true;
      }
      const next = nextNonSkippedTimeForwardPlayback({
        segments: segs,
        skipped,
        currentTime: tLive,
        windowStart,
        windowEnd,
        loop,
      });
      if (next != null) {
        return {
          skipSeekTarget: next,
          skipExhaustedPause: false,
          wrapSeekTarget: null,
          seekBeforeLoopStart: null,
          grownDuration: null,
          nextPreviousTransportTime: previousTransportTime,
          nextStalledFrames: stalledFrames,
          clearUserEnteredSection,
          transportClockStalled: false,
        };
      }
      return {
        skipSeekTarget: null,
        skipExhaustedPause: true,
        wrapSeekTarget: null,
        seekBeforeLoopStart: null,
        grownDuration: null,
        nextPreviousTransportTime: null,
        nextStalledFrames: 0,
        clearUserEnteredSection,
        transportClockStalled: false,
      };
    }
  }

  const playbackWindow = resolveStanzaLoopPlaybackWindow({
    loopMode: effectiveLoopMode,
    duration: d,
    selectionSpan: span,
    segments: segs,
    skipped,
  });

  if (effectiveLoopMode === 'loopAll' && d > 0) {
    const loopWrapEnd = playbackWindow?.loopWrapEnd ?? d;
    const wrapDecision = decideStanzaLoopWrap({
      transportTime: tLive,
      loopEnd: loopWrapEnd,
      reportedDuration: d,
      previousTransportTime,
      stalledFrames,
    });
    const grownDuration = wrapDecision.duration > d ? wrapDecision.duration : null;
    const loopDuration = Math.max(d, wrapDecision.duration);
    const { start } = resolvePlayableWindowAnchors(segs, skipped, 0, loopDuration);
    return {
      skipSeekTarget: null,
      skipExhaustedPause: false,
      wrapSeekTarget: wrapDecision.shouldWrap ? start : null,
      seekBeforeLoopStart: null,
      grownDuration,
      nextPreviousTransportTime: wrapDecision.shouldWrap ? null : wrapDecision.previousTransportTime,
      nextStalledFrames: wrapDecision.shouldWrap ? 0 : wrapDecision.stalledFrames,
      clearUserEnteredSection,
      transportClockStalled: false,
    };
  }

  if (effectiveLoopMode === 'loopSelection' && span && playbackWindow) {
    const loopWrapEnd = playbackWindow.loopWrapEnd;
    const { start } = resolvePlayableWindowAnchors(segs, skipped, span.start, span.end);

    if (shouldWrapLoopSelection(tLive, loopWrapEnd)) {
      return {
        skipSeekTarget: null,
        skipExhaustedPause: false,
        wrapSeekTarget: start,
        seekBeforeLoopStart: null,
        grownDuration: null,
        nextPreviousTransportTime: null,
        nextStalledFrames: 0,
        clearUserEnteredSection,
        transportClockStalled: false,
      };
    }

    /*
     * Everything below decides from `tLive`, so first ask whether `tLive` is a position at all.
     *
     * A degraded YouTube controller reports a frozen time, and `getCurrentTime` answered 0 on
     * failure — a finite number every consumer accepted as "the very beginning". Neither is a
     * position, and acting on them produced both reported symptoms: the section end is never
     * crossed (playback runs bars past it), and the pre-roll branch chases the bogus reading back
     * to the section start (an unexplained jump mid-practice).
     */
    const advancing =
      previousTransportTime == null ||
      tLive > previousTransportTime + STANZA_LOOP_TRANSPORT_ADVANCE_EPS_SEC;
    const nextStalledFrames = advancing ? 0 : stalledFrames + 1;

    // Forward playback cannot move backwards. A jump back no seek asked for is a broken clock, not
    // a playhead — the 0 from a dead controller is the common shape.
    const jumpedBackImplausibly =
      previousTransportTime != null &&
      tLive < previousTransportTime - STANZA_IMPLAUSIBLE_BACK_JUMP_SEC;

    const clockSuspect =
      jumpedBackImplausibly || nextStalledFrames >= STANZA_LOOP_TRANSPORT_STALL_FRAME_THRESHOLD;

    return {
      skipSeekTarget: null,
      skipExhaustedPause: false,
      wrapSeekTarget: null,
      // Only pre-roll to the loop start from a position we believe.
      seekBeforeLoopStart:
        !clockSuspect && tLive < start - STANZA_LOOP_WRAP_TOLERANCE_SEC ? start : null,
      grownDuration: null,
      // Keep the last believable reading; adopting a bogus one would make the NEXT tick think the
      // clock had resumed advancing from it.
      nextPreviousTransportTime: jumpedBackImplausibly ? previousTransportTime : tLive,
      nextStalledFrames,
      clearUserEnteredSection,
      transportClockStalled: clockSuspect,
    };
  }

  return {
    skipSeekTarget: null,
    skipExhaustedPause: false,
    wrapSeekTarget: null,
    seekBeforeLoopStart: null,
    grownDuration: null,
    nextPreviousTransportTime: previousTransportTime,
    nextStalledFrames: stalledFrames,
    clearUserEnteredSection,
    transportClockStalled: false,
  };
}
