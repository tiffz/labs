import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import type { StanzaLocalTransposeMirror } from '../audio/stanzaLocalTransposeMirror';
import type { StanzaLocalTransposeStemBus } from '../audio/stanzaLocalTransposeStemBus';
import type { StanzaYouTubeController } from '../components/StanzaYouTubePlayer';
import { findSegmentIndexAtTime, STANZA_TIME_EPS, type DerivedSegment } from '../utils/segments';
import {
  resolveStanzaTimelineTransport,
  stanzaPlayheadDisplayTime,
} from '../utils/stanzaPlayheadDisplayTime';
import { resolveEffectiveStanzaLoopMode } from '../utils/stanzaPlaybackFocus';
import type { StanzaPlaybackLoopMode } from '../utils/stanzaPlaybackLoop';
import type { StanzaPlaybackSnapshot } from '../utils/stanzaPlaybackStateMerge';
import { clampStanzaPlaybackRate } from '../utils/stanzaPlaybackRateLimits';
import { primaryPlaybackMuted } from '../utils/stanzaPlaybackMute';
import { resolveStanzaPracticeSource } from '../utils/stanzaPracticeSource';
import type { SkippedSegmentSet } from '../utils/stanzaSkippedSections';
import type { StanzaSelectionSpan } from '../utils/stanzaTransportLoop';
import { STANZA_STEM_ALIGN_DRIFT_SEC } from '../components/stanzaWorkspace/stanzaWorkspaceHelpers';
import { primeStanzaMetronomeAudio } from './useStanzaMetronomeSync';
import { shouldReanchorStanzaPlayhead } from './useStanzaTransportLoop';

export type UseStanzaUnifiedTransportOptions = {
  usesYoutubeTransport: boolean;
  getLocalMainMedia: () => HTMLMediaElement | null;
  setPlayback: Dispatch<SetStateAction<StanzaPlaybackSnapshot>>;
  selectedRef: MutableRefObject<StanzaSong | null>;
  /** Stem count for YouTube play path (closure-safe via selectedRef when possible). */
  stemCount: number;
  ytControllerRef: MutableRefObject<StanzaYouTubeController | null>;
  stemAudioRefs: MutableRefObject<Map<string, HTMLAudioElement>>;
  transposeMirrorRef: MutableRefObject<StanzaLocalTransposeMirror | null>;
  transposeStemBusRef: MutableRefObject<StanzaLocalTransposeStemBus | null>;
  transposeStemMixPackageRef: MutableRefObject<{
    main: AudioBuffer;
    stems: Map<string, AudioBuffer>;
  } | null>;
  playbackMixRef: MutableRefObject<{ primaryGain: number; stems: StanzaStemTrack[] }>;
  timeRef: MutableRefObject<number>;
  durationRef: MutableRefObject<number>;
  playingRef: MutableRefObject<boolean>;
  loopModeRef: MutableRefObject<StanzaPlaybackLoopMode>;
  effectiveSelectionSpanRef: MutableRefObject<StanzaSelectionSpan | null>;
  segmentsRef: MutableRefObject<DerivedSegment[]>;
  skippedBySegmentIdRef: MutableRefObject<SkippedSegmentSet | undefined>;
  seekDisplayRafRef: MutableRefObject<number>;
  seekDisplayPendingRef: MutableRefObject<number | null>;
  isYoutubeForSeekRef: MutableRefObject<boolean>;
  stemWebAudioMixerEnabled: boolean;
  prepareStemMixerForPlaySync: () => boolean;
  finalizeStemMixerResume: () => void;
  abandonWebAudioMix: () => void;
  restoreHtmlStemVolumes: () => void;
  /** Re-sync transpose when mix or transpose readiness changes while playing. */
  transposeMirrorPlaybackActive: boolean;
  transposeStemBusPlaybackActive: boolean;
  primaryMixKey: string;
  stemMixKey: string;
};

export type UseStanzaUnifiedTransportResult = {
  syncTransposeMirrorFromMain: () => void;
  applyPlaybackRate: (rate: number) => void;
  readLiveTransportTime: () => number;
  resolvePlayheadTimeForMarkers: () => number;
  seekUnified: (tRaw: number, opts?: { flushPlaybackState?: boolean }) => void;
  userSeekUnified: (tRaw: number, opts?: { flushPlaybackState?: boolean }) => void;
  pauseStemAudios: () => void;
  snapStemsToMainAndPlay: () => void;
  alignStemAudiosToMain: () => void;
  scheduleAlignStemAudiosToMain: () => void;
  playUnified: () => void;
  pauseUnified: () => void;
  playUnifiedRef: MutableRefObject<() => void>;
  seekUnifiedRef: MutableRefObject<(tRaw: number, opts?: { flushPlaybackState?: boolean }) => void>;
  lastUserEnteredSectionIdRef: MutableRefObject<string | null>;
};

/**
 * Unified play / pause / seek / stem-align / transpose-sync for Stanza transport.
 * Behavior-preserving extraction from {@link StanzaWorkspace}.
 */
export function useStanzaUnifiedTransport(
  opts: UseStanzaUnifiedTransportOptions,
): UseStanzaUnifiedTransportResult {
  const {
    usesYoutubeTransport,
    getLocalMainMedia,
    setPlayback,
    selectedRef,
    stemCount,
    ytControllerRef,
    stemAudioRefs,
    transposeMirrorRef,
    transposeStemBusRef,
    transposeStemMixPackageRef,
    playbackMixRef,
    timeRef,
    durationRef,
    playingRef,
    loopModeRef,
    effectiveSelectionSpanRef,
    segmentsRef,
    skippedBySegmentIdRef,
    seekDisplayRafRef,
    seekDisplayPendingRef,
    isYoutubeForSeekRef,
    stemWebAudioMixerEnabled,
    prepareStemMixerForPlaySync,
    finalizeStemMixerResume,
    abandonWebAudioMix,
    restoreHtmlStemVolumes,
    transposeMirrorPlaybackActive,
    transposeStemBusPlaybackActive,
    primaryMixKey,
    stemMixKey,
  } = opts;

  const syncTransposeMirrorFromMain = useCallback(() => {
    const mirror = transposeMirrorRef.current;
    const bus = transposeStemBusRef.current;
    const main = getLocalMainMedia();
    const row = selectedRef.current;
    const mix = playbackMixRef.current;
    if (!main || !row || resolveStanzaPracticeSource(row) !== 'local') {
      mirror?.stop();
      bus?.stop();
      return;
    }
    const stemsLen = row.stems?.length ?? 0;
    const transpose = row.localTransposeSemitones ?? 0;
    if (transpose === 0) {
      mirror?.stop();
      bus?.stop();
      return;
    }
    const primaryMuted = primaryPlaybackMuted(row);
    if (stemsLen === 0) {
      bus?.stop();
      if (!mirror?.getBuffer()) {
        mirror?.stop();
        return;
      }
      const linear = primaryMuted ? 0 : mix.primaryGain;
      if (main.paused || linear <= 0) {
        mirror.stop();
        return;
      }
      if (mirror.hasActiveSource()) {
        mirror.setLinearGain(linear);
        return;
      }
      mirror.startOrRestart(main.currentTime, main.playbackRate, transpose, linear);
      return;
    }
    mirror?.stop();
    if (!bus?.getMainBuffer()) {
      bus?.stop();
      return;
    }
    if (!transposeStemMixPackageRef.current) {
      bus.stop();
      return;
    }
    if (main.paused) {
      bus.stop();
      return;
    }
    if (bus.hasActiveSources()) {
      bus.updateMix(primaryMuted, mix.primaryGain, mix.stems);
      return;
    }
    bus.startOrRestart(
      main.currentTime,
      main.playbackRate,
      transpose,
      primaryMuted,
      mix.primaryGain,
      mix.stems,
    );
  }, [
    getLocalMainMedia,
    playbackMixRef,
    selectedRef,
    transposeMirrorRef,
    transposeStemBusRef,
    transposeStemMixPackageRef,
  ]);

  useEffect(() => {
    if (!transposeMirrorPlaybackActive && !transposeStemBusPlaybackActive) return;
    const main = getLocalMainMedia();
    if (!main || main.paused) return;
    syncTransposeMirrorFromMain();
  }, [
    primaryMixKey,
    stemMixKey,
    transposeMirrorPlaybackActive,
    transposeStemBusPlaybackActive,
    syncTransposeMirrorFromMain,
    getLocalMainMedia,
  ]);

  const applyPlaybackRate = useCallback(
    (rate: number) => {
      const clamped = clampStanzaPlaybackRate(rate);
      if (usesYoutubeTransport) {
        ytControllerRef.current?.setPlaybackRate(clamped);
        stemAudioRefs.current.forEach((a) => {
          a.playbackRate = clamped;
        });
      } else {
        const el = getLocalMainMedia();
        if (el) el.playbackRate = clamped;
        stemAudioRefs.current.forEach((a) => {
          a.playbackRate = clamped;
        });
        if (el && !el.paused) {
          window.requestAnimationFrame(() => {
            syncTransposeMirrorFromMain();
          });
        }
      }
      setPlayback((p) => ({ ...p, playbackRate: clamped }));
    },
    [
      usesYoutubeTransport,
      syncTransposeMirrorFromMain,
      getLocalMainMedia,
      setPlayback,
      stemAudioRefs,
      ytControllerRef,
    ],
  );

  const scheduleSeekFrame = useCallback(() => {
    if (seekDisplayRafRef.current !== 0) return;
    seekDisplayRafRef.current = window.requestAnimationFrame(() => {
      seekDisplayRafRef.current = 0;
      const tt = seekDisplayPendingRef.current;
      seekDisplayPendingRef.current = null;
      if (tt == null || !Number.isFinite(tt)) return;
      if (isYoutubeForSeekRef.current) {
        ytControllerRef.current?.seekTo(tt);
      }
      setPlayback((p) => (p.currentTime === tt ? p : { ...p, currentTime: tt }));
    });
  }, [isYoutubeForSeekRef, seekDisplayPendingRef, seekDisplayRafRef, setPlayback, ytControllerRef]);

  const readLiveTransportTime = useCallback((): number => {
    if (usesYoutubeTransport) {
      try {
        const fn = ytControllerRef.current?.getCurrentTime;
        if (typeof fn === 'function') {
          const x = fn();
          if (Number.isFinite(x)) return Math.max(0, x);
        }
      } catch {
        /* ignore */
      }
    } else {
      const el = getLocalMainMedia();
      if (el && Number.isFinite(el.currentTime)) return el.currentTime;
    }
    return timeRef.current;
  }, [usesYoutubeTransport, getLocalMainMedia, timeRef, ytControllerRef]);

  const resolvePlayheadTimeForMarkers = useCallback((): number => {
    const d = durationRef.current;
    const live = readLiveTransportTime();
    const transport = resolveStanzaTimelineTransport(live, seekDisplayPendingRef.current);
    if (!(d > 0)) return transport;
    return stanzaPlayheadDisplayTime(
      transport,
      d,
      resolveEffectiveStanzaLoopMode({
        loopMode: loopModeRef.current,
        selectionSpan: effectiveSelectionSpanRef.current,
      }),
      effectiveSelectionSpanRef.current,
    );
  }, [
    readLiveTransportTime,
    durationRef,
    seekDisplayPendingRef,
    loopModeRef,
    effectiveSelectionSpanRef,
  ]);

  const seekUnified = useCallback(
    (tRaw: number, opts?: { flushPlaybackState?: boolean }) => {
      const flush = opts?.flushPlaybackState === true;
      const d = durationRef.current;
      const t =
        d > 0 && Number.isFinite(tRaw) ? Math.max(0, Math.min(d - STANZA_TIME_EPS * 0.5, tRaw)) : Math.max(0, tRaw);
      timeRef.current = t;

      if (flush) {
        if (seekDisplayRafRef.current !== 0) {
          window.cancelAnimationFrame(seekDisplayRafRef.current);
          seekDisplayRafRef.current = 0;
        }
        seekDisplayPendingRef.current = null;
      } else {
        seekDisplayPendingRef.current = t;
      }

      if (usesYoutubeTransport) {
        if (flush) {
          ytControllerRef.current?.seekTo(t);
        } else {
          scheduleSeekFrame();
        }
        stemAudioRefs.current.forEach((a) => {
          try {
            a.currentTime = t;
          } catch {
            /* ignore */
          }
        });
        setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
        return;
      }
      const el = getLocalMainMedia();
      if (el) {
        el.currentTime = t;
      }
      stemAudioRefs.current.forEach((a) => {
        try {
          a.currentTime = t;
        } catch {
          /* ignore */
        }
      });
      transposeMirrorRef.current?.stop();
      transposeStemBusRef.current?.stop();
      const elPlaying = getLocalMainMedia();
      if (elPlaying && !elPlaying.paused) {
        window.requestAnimationFrame(() => {
          syncTransposeMirrorFromMain();
        });
      }
      setPlayback((p) => (p.currentTime === t ? p : { ...p, currentTime: t }));
    },
    [
      usesYoutubeTransport,
      scheduleSeekFrame,
      syncTransposeMirrorFromMain,
      getLocalMainMedia,
      durationRef,
      timeRef,
      seekDisplayRafRef,
      seekDisplayPendingRef,
      stemAudioRefs,
      ytControllerRef,
      transposeMirrorRef,
      transposeStemBusRef,
      setPlayback,
    ],
  );

  const lastUserEnteredSectionIdRef = useRef<string | null>(null);

  const userSeekUnified = useCallback(
    (tRaw: number, opts?: { flushPlaybackState?: boolean }) => {
      const segs = segmentsRef.current;
      const idx = findSegmentIndexAtTime(segs, tRaw);
      lastUserEnteredSectionIdRef.current = idx != null ? segs[idx]?.id ?? null : null;
      seekUnified(tRaw, opts);
    },
    [seekUnified, segmentsRef],
  );

  const pauseStemAudios = useCallback(() => {
    stemAudioRefs.current.forEach((a) => {
      a.pause();
    });
  }, [stemAudioRefs]);

  const snapStemsToMainAndPlay = useCallback(() => {
    const mt = usesYoutubeTransport ? readLiveTransportTime() : getLocalMainMedia()?.currentTime;
    if (mt == null || !Number.isFinite(mt)) return;
    stemAudioRefs.current.forEach((a) => {
      try {
        a.currentTime = mt;
      } catch {
        /* ignore */
      }
      void a.play().catch(() => {
        /* ignore autoplay / decode races */
      });
    });
  }, [usesYoutubeTransport, readLiveTransportTime, getLocalMainMedia, stemAudioRefs]);

  const alignStemAudiosToMain = useCallback(() => {
    if (usesYoutubeTransport) {
      if (!playingRef.current) return;
    } else {
      const main = getLocalMainMedia();
      if (!main || main.paused) return;
    }
    const mt = usesYoutubeTransport ? readLiveTransportTime() : getLocalMainMedia()?.currentTime;
    if (mt == null || !Number.isFinite(mt)) return;

    stemAudioRefs.current.forEach((a) => {
      if (a.paused) void a.play().catch(() => {});
      try {
        if (Math.abs(a.currentTime - mt) > STANZA_STEM_ALIGN_DRIFT_SEC) a.currentTime = mt;
      } catch {
        /* ignore */
      }
    });
  }, [usesYoutubeTransport, readLiveTransportTime, getLocalMainMedia, playingRef, stemAudioRefs]);

  const scheduleAlignStemAudiosToMain = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alignStemAudiosToMain();
      });
    });
  }, [alignStemAudiosToMain]);

  const playUnified = useCallback(() => {
    primeStanzaMetronomeAudio();
    const t = readLiveTransportTime();
    timeRef.current = t;
    const d = durationRef.current;
    const mode = loopModeRef.current;
    const span = effectiveSelectionSpanRef.current;
    const segs = segmentsRef.current;
    const skipped = skippedBySegmentIdRef.current ?? {};
    const reanchorTarget = shouldReanchorStanzaPlayhead({
      loopMode: mode,
      transportTime: t,
      duration: d,
      selectionSpan: span,
      segments: segs,
      skipped,
    });
    if (reanchorTarget != null) seekUnified(reanchorTarget, { flushPlaybackState: true });
    if (usesYoutubeTransport) {
      ytControllerRef.current?.play();
      if (stemCount > 0) {
        snapStemsToMainAndPlay();
        scheduleAlignStemAudiosToMain();
      }
    } else {
      const main = getLocalMainMedia();
      if (!main) return;
      let stemMixerPrepared = false;
      if (stemWebAudioMixerEnabled) {
        stemMixerPrepared = prepareStemMixerForPlaySync();
        if (!stemMixerPrepared) {
          restoreHtmlStemVolumes();
        }
      }
      const pr = main.play();
      if (stemWebAudioMixerEnabled && stemMixerPrepared) {
        finalizeStemMixerResume();
      }
      snapStemsToMainAndPlay();
      const afterMainPlaying = () => {
        snapStemsToMainAndPlay();
        scheduleAlignStemAudiosToMain();
        syncTransposeMirrorFromMain();
      };
      if (pr !== undefined && typeof (pr as Promise<void>).then === 'function') {
        void (pr as Promise<void>).then(afterMainPlaying).catch((err: unknown) => {
          console.error('[Stanza] main media play() rejected', {
            reason: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
            mediaErrorCode: main.error?.code ?? null,
            readyState: main.readyState,
            networkState: main.networkState,
            currentSrc: main.currentSrc ? main.currentSrc.slice(0, 24) : '(none)',
            paused: main.paused,
          });
          pauseStemAudios();
          if (stemWebAudioMixerEnabled && stemMixerPrepared) {
            abandonWebAudioMix();
            restoreHtmlStemVolumes();
          }
        });
      } else {
        scheduleAlignStemAudiosToMain();
        syncTransposeMirrorFromMain();
      }
    }
  }, [
    abandonWebAudioMix,
    finalizeStemMixerResume,
    usesYoutubeTransport,
    stemCount,
    readLiveTransportTime,
    pauseStemAudios,
    prepareStemMixerForPlaySync,
    restoreHtmlStemVolumes,
    seekUnified,
    snapStemsToMainAndPlay,
    scheduleAlignStemAudiosToMain,
    stemWebAudioMixerEnabled,
    syncTransposeMirrorFromMain,
    getLocalMainMedia,
    timeRef,
    durationRef,
    loopModeRef,
    effectiveSelectionSpanRef,
    segmentsRef,
    skippedBySegmentIdRef,
    ytControllerRef,
  ]);

  const playUnifiedRef = useRef(playUnified);
  playUnifiedRef.current = playUnified;

  const seekUnifiedRef = useRef(seekUnified);
  seekUnifiedRef.current = seekUnified;

  const pauseUnified = useCallback(() => {
    if (usesYoutubeTransport) {
      ytControllerRef.current?.pause();
      pauseStemAudios();
    } else {
      transposeMirrorRef.current?.stop();
      transposeStemBusRef.current?.stop();
      getLocalMainMedia()?.pause();
      pauseStemAudios();
    }
  }, [
    usesYoutubeTransport,
    pauseStemAudios,
    getLocalMainMedia,
    ytControllerRef,
    transposeMirrorRef,
    transposeStemBusRef,
  ]);

  return {
    syncTransposeMirrorFromMain,
    applyPlaybackRate,
    readLiveTransportTime,
    resolvePlayheadTimeForMarkers,
    seekUnified,
    userSeekUnified,
    pauseStemAudios,
    snapStemsToMainAndPlay,
    alignStemAudiosToMain,
    scheduleAlignStemAudiosToMain,
    playUnified,
    pauseUnified,
    playUnifiedRef,
    seekUnifiedRef,
    lastUserEnteredSectionIdRef,
  };
}
