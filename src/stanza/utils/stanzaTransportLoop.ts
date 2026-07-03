import type { StanzaPlaybackLoopMode } from './stanzaPlaybackLoop';
import { STANZA_LOOP_WRAP_TOLERANCE_SEC } from './stanzaPlaybackLoop';
import { decideStanzaLoopWrap } from './stanzaLoopWrapDecision';
import {
  isSegmentSkipped,
  nextNonSkippedTimeForwardPlayback,
  resolvePlayableWindowAnchors,
  type SkippedSegmentSet,
} from './stanzaSkippedSections';
import type { DerivedSegment } from './segments';
import { findSegmentIndexAtTime } from './segments';

export type StanzaSelectionSpan = { start: number; end: number };

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
  if (loopMode === 'loopAll' && duration > 0) {
    const { start, end } = resolvePlayableWindowAnchors(segments, skipped, 0, duration);
    return { windowStart: 0, windowEnd: duration, loop: true, loopWrapStart: start, loopWrapEnd: end };
  }
  if (loopMode === 'loopSelection' && selectionSpan) {
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
  if (loopMode === 'through') {
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

  if (skipped) {
    const idx = findSegmentIndexAtTime(segs, tLive);
    const seg = idx != null ? segs[idx] : null;
    if (seg && userEnteredSectionId && seg.id !== userEnteredSectionId) {
      clearUserEnteredSection = true;
    }
    if (seg && userEnteredSectionId !== seg.id && isSegmentSkipped(seg, skipped)) {
      let windowStart = 0;
      let windowEnd = d > 0 ? d : seg.end;
      let loop = false;
      if (loopMode === 'loopAll' && d > 0) {
        loop = true;
      } else if (loopMode === 'loopSelection' && span) {
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
      };
    }
  }

  const playbackWindow = resolveStanzaLoopPlaybackWindow({
    loopMode,
    duration: d,
    selectionSpan: span,
    segments: segs,
    skipped,
  });

  if (loopMode === 'loopAll' && d > 0) {
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
    };
  }

  if (loopMode === 'loopSelection' && span && playbackWindow) {
    const { start } = resolvePlayableWindowAnchors(segs, skipped, span.start, span.end);
    const wrapDecision = decideStanzaLoopWrap({
      transportTime: tLive,
      loopEnd: playbackWindow.loopWrapEnd,
      reportedDuration: d,
      previousTransportTime,
      stalledFrames,
    });
    const grownDuration = wrapDecision.duration > d ? wrapDecision.duration : null;
    return {
      skipSeekTarget: null,
      skipExhaustedPause: false,
      wrapSeekTarget: wrapDecision.shouldWrap ? start : null,
      seekBeforeLoopStart:
        !wrapDecision.shouldWrap && tLive < start - STANZA_LOOP_WRAP_TOLERANCE_SEC ? start : null,
      grownDuration,
      nextPreviousTransportTime: wrapDecision.shouldWrap ? null : wrapDecision.previousTransportTime,
      nextStalledFrames: wrapDecision.shouldWrap ? 0 : wrapDecision.stalledFrames,
      clearUserEnteredSection,
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
  };
}
