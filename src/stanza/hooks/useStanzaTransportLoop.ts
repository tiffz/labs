import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { labsPlaybackSafeCall } from '../../shared/utils/labsPlaybackSafeCall';

import {
  readBestKnownMediaDurationSec,
  readMediaBufferedEndSec,
  readMediaSeekableEndSec,
  readPositiveFiniteMediaDurationSec,
  resolvePrematureMediaEndResume,
} from '../utils/stanzaMediaDuration';
import type { DerivedSegment } from '../utils/segments';
import {
  isPastLoopWrapPoint,
  STANZA_LOOP_WRAP_TOLERANCE_SEC,
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
  /** Probed fingerprint / layout horizon — may exceed HTML5 metadata on VBR files. */
  knownHorizonSecRef: MutableRefObject<number>;
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
  handleLocalMediaEnded: () => void;
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

  const resolveReportedTransportDuration = useCallback((): number => {
    const refs = refsRef.current;
    let d = Math.max(refs.durationRef.current, refs.knownHorizonSecRef.current);
    if (!refs.isYoutubeRef.current) {
      const el = getLocalMainMedia();
      const fd = el ? readBestKnownMediaDurationSec(el) : null;
      if (fd != null) d = Math.max(d, fd);
    }
    return d;
  }, [getLocalMainMedia, refsRef]);

  /**
   * Local `<audio>` / `<video>` `ended` — resume past premature metadata ends when we have
   * evidence (decoded/fingerprint horizon or longer seekable/buffered), else loop wrap.
   */
  const tryResumePastPrematureLocalEnd = useCallback((): boolean => {
    if (refsRef.current.isYoutubeRef.current) return false;
    const el = getLocalMainMedia();
    if (!el) return false;
    const t = Number.isFinite(el.currentTime) ? el.currentTime : refsRef.current.timeRef.current;
    const reported = readPositiveFiniteMediaDurationSec(el);
    const knownHorizon = Math.max(
      refsRef.current.knownHorizonSecRef.current,
      refsRef.current.durationRef.current,
    );
    const resume = resolvePrematureMediaEndResume({
      currentTime: t,
      reportedDuration: reported,
      seekableEnd: readMediaSeekableEndSec(el),
      bufferedEnd: readMediaBufferedEndSec(el),
      knownHorizonSec: knownHorizon > 0 ? knownHorizon : null,
    });
    if (!resume) return false;

    refsRef.current.durationRef.current = Math.max(
      refsRef.current.durationRef.current,
      resume.nextDuration,
    );
    setPlayback((p) =>
      p.duration >= resume.nextDuration
        ? { ...p, isPlaying: true }
        : { ...p, duration: resume.nextDuration, isPlaying: true },
    );
    try {
      el.currentTime = resume.seekTo;
    } catch (err) {
      console.warn('[stanza] premature-end seek failed', err);
      return false;
    }
    refsRef.current.timeRef.current = resume.seekTo;
    // Use playUnified so transpose mirror / stems restart after onEnded stopped them.
    requestAnimationFrame(() => refsRef.current.playUnifiedRef.current());
    return true;
  }, [getLocalMainMedia, refsRef, setPlayback]);

  const handleLoopAtMediaEnd = useCallback(() => {
    const refs = refsRef.current;
    const mode = refs.loopModeRef.current;
    const span = refs.effectiveSelectionSpanRef.current;
    const effective = resolveEffectiveStanzaLoopMode({ loopMode: mode, selectionSpan: span });
    const segs = refs.segmentsRef.current;
    const skipped = refs.skippedBySegmentIdRef.current;
    if (effective === 'through') return;
    if (effective === 'loopAll') {
      const d = resolveReportedTransportDuration();
      const t = refs.timeRef.current;
      if (d > 0 && t < d - STANZA_LOOP_WRAP_TOLERANCE_SEC * 2) {
        return;
      }
      if (!(d > 0)) return;
      const { start } = resolvePlayableWindowAnchors(segs, skipped, 0, d);
      performLoopWrap(start);
      return;
    }
    if (effective === 'loopSelection' && span != null && span.end - span.start >= STANZA_MIN_LOOP_SPAN_SEC) {
      const { start } = resolvePlayableWindowAnchors(segs, skipped, span.start, span.end);
      performLoopWrap(start);
    }
  }, [performLoopWrap, refsRef, resolveReportedTransportDuration]);

  const handleLocalMediaEnded = useCallback(() => {
    if (tryResumePastPrematureLocalEnd()) return;
    handleLoopAtMediaEnd();
  }, [handleLoopAtMediaEnd, tryResumePastPrematureLocalEnd]);

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
        const d = resolveReportedTransportDuration();
        if (d > refs.durationRef.current) {
          refs.durationRef.current = d;
        }
        const segs = refs.segmentsRef.current;
        const skipped = refs.skippedBySegmentIdRef.current;
        const span = refs.effectiveSelectionSpanRef.current;

        const effectiveLoopMode = resolveEffectiveStanzaLoopMode({ loopMode, selectionSpan: span });
        if (
          effectiveLoopMode === 'through' &&
          Number.isFinite(tLive) &&
          tLive > d + STANZA_LOOP_WRAP_TOLERANCE_SEC
        ) {
          refs.durationRef.current = Math.max(refs.durationRef.current, tLive);
          setPlayback((p) => (p.duration >= tLive ? p : { ...p, duration: tLive }));
        }

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
  }, [getLocalMainMedia, performLoopWrap, readLiveTransportTime, refsRef, resolveReportedTransportDuration, setPlayback]);

  return { handleLoopAtMediaEnd, handleLocalMediaEnded };
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
