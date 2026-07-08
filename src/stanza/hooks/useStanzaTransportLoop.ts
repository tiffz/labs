import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { labsPlaybackSafeCall } from '../../shared/utils/labsPlaybackSafeCall';

import type { DerivedSegment } from '../utils/segments';
import {
  isPastLoopWrapPoint,
  STANZA_MIN_LOOP_SPAN_SEC,
  type StanzaPlaybackLoopMode,
} from '../utils/stanzaPlaybackLoop';
import type { StanzaPlaybackSnapshot } from '../utils/stanzaPlaybackStateMerge';
import { createStanzaLoopWrapGuard } from '../utils/stanzaLoopWrapGuard';
import { resolveEffectiveStanzaLoopMode } from '../utils/stanzaPlaybackFocus';
import { resolvePlayableWindowAnchors, type SkippedSegmentSet } from '../utils/stanzaSkippedSections';
import { evaluateStanzaTransportLoopTick, type StanzaSelectionSpan } from '../utils/stanzaTransportLoop';
import type { StanzaYouTubeController } from '../components/StanzaYouTubePlayer';

export type UseStanzaTransportLoopRefs = {
  playingRef: MutableRefObject<boolean>;
  timeRef: MutableRefObject<number>;
  durationRef: MutableRefObject<number>;
  loopModeRef: MutableRefObject<StanzaPlaybackLoopMode>;
  effectiveSelectionSpanRef: MutableRefObject<StanzaSelectionSpan | null>;
  segmentsRef: MutableRefObject<DerivedSegment[]>;
  skippedBySegmentIdRef: MutableRefObject<SkippedSegmentSet>;
  hasAnySkippedSectionRef: MutableRefObject<boolean>;
  isYoutubeRef: MutableRefObject<boolean>;
  lastUserEnteredSectionIdRef: MutableRefObject<string | null>;
  seekUnifiedRef: MutableRefObject<(tRaw: number, opts?: { flushPlaybackState?: boolean }) => void>;
  playUnifiedRef: MutableRefObject<() => void>;
  pauseStemAudiosRef: MutableRefObject<() => void>;
  ytControllerRef: MutableRefObject<StanzaYouTubeController | null>;
  transposeMirrorStopRef: MutableRefObject<(() => void) | null>;
  transposeStemBusStopRef: MutableRefObject<(() => void) | null>;
};

export type UseStanzaTransportLoopOptions = {
  refsRef: MutableRefObject<UseStanzaTransportLoopRefs>;
  readLiveTransportTime: () => number;
  getLocalMainMedia: () => HTMLMediaElement | null;
  setPlayback: Dispatch<SetStateAction<StanzaPlaybackSnapshot>>;
};

export function useStanzaTransportLoop(opts: UseStanzaTransportLoopOptions): {
  handleLoopAtMediaEnd: () => void;
} {
  const { refsRef, readLiveTransportTime, getLocalMainMedia, setPlayback } = opts;
  const loopWrapPrevTimeRef = useRef<number | null>(null);
  const loopWrapStallFramesRef = useRef(0);
  const loopWrapGuardRef = useRef(createStanzaLoopWrapGuard());

  const performLoopWrap = useCallback((seekTarget: number) => {
    if (!loopWrapGuardRef.current.tryPerform()) return;
    refsRef.current.seekUnifiedRef.current(seekTarget, { flushPlaybackState: true });
    requestAnimationFrame(() => refsRef.current.playUnifiedRef.current());
    loopWrapPrevTimeRef.current = null;
    loopWrapStallFramesRef.current = 0;
  }, [refsRef]);

  const handleLoopAtMediaEnd = useCallback(() => {
    const refs = refsRef.current;
    const mode = refs.loopModeRef.current;
    const span = refs.effectiveSelectionSpanRef.current;
    const effective = resolveEffectiveStanzaLoopMode({ loopMode: mode, selectionSpan: span });
    const segs = refs.segmentsRef.current;
    const skipped = refs.skippedBySegmentIdRef.current;
    if (effective === 'through') return;
    if (effective === 'loopAll') {
      const d = refs.durationRef.current;
      if (!(d > 0)) return;
      const { start } = resolvePlayableWindowAnchors(segs, skipped, 0, d);
      performLoopWrap(start);
      return;
    }
    if (effective === 'loopSelection' && span != null && span.end - span.start >= STANZA_MIN_LOOP_SPAN_SEC) {
      const { start } = resolvePlayableWindowAnchors(segs, skipped, span.start, span.end);
      performLoopWrap(start);
    }
  }, [performLoopWrap, refsRef]);

  useEffect(() => {
    let raf = 0;
    let idleTimeout = 0;
    let pausedForSkipExhausted = false;

    const cancelScheduled = () => {
      if (raf !== 0) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
      if (idleTimeout !== 0) {
        window.clearTimeout(idleTimeout);
        idleTimeout = 0;
      }
    };

    const scheduleNext = (idle: boolean) => {
      cancelScheduled();
      if (idle) idleTimeout = window.setTimeout(tick, 250);
      else raf = window.requestAnimationFrame(tick);
    };

    const tick = () => {
      labsPlaybackSafeCall('transport RAF tick', () => {
        const refs = refsRef.current;
        const loopMode = refs.loopModeRef.current;
        const hasAnySkipped = refs.hasAnySkippedSectionRef.current;
        const idle = loopMode === 'through' && !hasAnySkipped && !refs.playingRef.current;
        if (idle) {
          scheduleNext(true);
          return;
        }
        if (!refs.playingRef.current) {
          pausedForSkipExhausted = false;
          loopWrapPrevTimeRef.current = null;
          loopWrapStallFramesRef.current = 0;
          scheduleNext(true);
          return;
        }

        const tLive = readLiveTransportTime();
        refs.timeRef.current = tLive;
        const d = refs.durationRef.current;
        const segs = refs.segmentsRef.current;
        const skipped = refs.skippedBySegmentIdRef.current;
        const span = refs.effectiveSelectionSpanRef.current;

        const tickResult = evaluateStanzaTransportLoopTick({
          transportTime: tLive,
          duration: d,
          loopMode,
          segments: segs,
          skipped,
          selectionSpan: span,
          previousTransportTime: loopWrapPrevTimeRef.current,
          stalledFrames: loopWrapStallFramesRef.current,
          userEnteredSectionId: refs.lastUserEnteredSectionIdRef.current,
        });

        if (tickResult.clearUserEnteredSection) {
          refs.lastUserEnteredSectionIdRef.current = null;
        }

        if (tickResult.skipSeekTarget != null) {
          pausedForSkipExhausted = false;
          try {
            refs.seekUnifiedRef.current(tickResult.skipSeekTarget, { flushPlaybackState: true });
          } catch (err) {
            console.warn('[stanza] skip-advance seek failed', err);
          }
          scheduleNext(false);
          return;
        }

        if (tickResult.skipExhaustedPause) {
          if (!pausedForSkipExhausted) {
            pausedForSkipExhausted = true;
            try {
              if (refs.isYoutubeRef.current) refs.ytControllerRef.current?.pause();
              else {
                const main = getLocalMainMedia();
                main?.pause();
                refs.pauseStemAudiosRef.current();
                refs.transposeMirrorStopRef.current?.();
                refs.transposeStemBusStopRef.current?.();
              }
              setPlayback((p) => (p.isPlaying ? { ...p, isPlaying: false } : p));
            } catch (err) {
              console.warn('[stanza] skip-advance pause failed', err);
            }
          }
          scheduleNext(false);
          return;
        }

        pausedForSkipExhausted = false;

        if (tickResult.grownDuration != null) {
          refs.durationRef.current = tickResult.grownDuration;
          setPlayback((p) =>
            p.duration >= tickResult.grownDuration! ? p : { ...p, duration: tickResult.grownDuration! },
          );
        }
        loopWrapPrevTimeRef.current = tickResult.nextPreviousTransportTime;
        loopWrapStallFramesRef.current = tickResult.nextStalledFrames;

        if (tickResult.seekBeforeLoopStart != null) {
          refs.seekUnifiedRef.current(tickResult.seekBeforeLoopStart, { flushPlaybackState: true });
        } else if (tickResult.wrapSeekTarget != null) {
          performLoopWrap(tickResult.wrapSeekTarget);
        }

        scheduleNext(false);
      });
    };
    scheduleNext(false);
    return () => cancelScheduled();
  }, [getLocalMainMedia, performLoopWrap, readLiveTransportTime, refsRef, setPlayback]);

  return { handleLoopAtMediaEnd };
}

/** Re-anchor playhead before resuming when past the playable loop end. */
export function shouldReanchorStanzaPlayhead(opts: {
  loopMode: StanzaPlaybackLoopMode;
  transportTime: number;
  duration: number;
  selectionSpan: StanzaSelectionSpan | null;
  segments: DerivedSegment[];
  skipped: SkippedSegmentSet;
}): number | null {
  const { loopMode, transportTime: t, duration: d, selectionSpan: span, segments, skipped } = opts;
  const effectiveLoopMode = resolveEffectiveStanzaLoopMode({ loopMode, selectionSpan: span });
  if (effectiveLoopMode === 'loopAll' && d > 0) {
    const { start, end } = resolvePlayableWindowAnchors(segments, skipped, 0, d);
    if (t < 0 || isPastLoopWrapPoint(t, end)) return start;
    return null;
  }
  if (effectiveLoopMode === 'loopSelection' && span) {
    const { start, end } = resolvePlayableWindowAnchors(segments, skipped, span.start, span.end);
    if (t < start - 0.05 || isPastLoopWrapPoint(t, end)) return start;
    return null;
  }
  return null;
}
