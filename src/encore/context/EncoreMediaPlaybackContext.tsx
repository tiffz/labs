import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { MediaTransposeMirror } from '../../shared/audio/mediaTransposeMirror';
import {
  describeYoutubePlayerError,
  isYoutubeEmbedBlockedError,
} from '../../shared/youtube/describeYoutubePlayerError';
import type {
  LabsYouTubeController,
  LabsYouTubePlaybackState,
} from '../../shared/youtube/LabsYouTubePlayer';
import { useEncoreAuth } from './EncoreAuthContext';
import type {
  EncoreMediaPlaybackPhase,
  EncoreMediaPlaybackTarget,
} from '../media/encorePlayableMedia';
import {
  encoreDriveMediaPreferWebAudioPlayback,
  encoreDrivePlaybackKind,
  resolveEncoreDriveMediaMime,
} from '../media/encorePlayableMedia';
import {
  encoreDriveMediaCacheKey,
  getOrDecodeCachedEncoreDriveAudioBuffer,
  resolveEncoreDriveMediaForPlayback,
  shouldRevokeEncoreDriveMediaObjectUrl,
} from '../media/encoreDriveMediaPlaybackCache';
import { encoreDriveMediaPlaybackErrorMessage } from '../media/loadEncoreDriveMediaObjectUrl';
import {
  createEncoreSpotifyEmbedController,
  encoreSpotifyPlaybackErrorMessage,
  type EncoreSpotifyEmbedController,
} from '../media/encoreSpotifyEmbed';
import {
  encoreMediaPlaybackQueueAdvance,
  type EncoreMediaPlaybackQueueSnapshot,
} from '../media/encoreMediaPlaybackQueue';
import {
  EncoreMediaPlaybackAdjustmentStore,
} from '../media/encoreMediaPlaybackAdjustments';
import {
  EncoreMediaPlaybackControlsContext,
  EncoreMediaTransportContext,
  type EncoreMediaPlaybackControlsValue,
  type OriginalsPlaybackTarget,
} from './encoreMediaPlaybackContextStore';

export type { OriginalsPlaybackTarget } from './encoreMediaPlaybackContextStore';

type EncoreMediaTransportState = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
};

function originalsTakePlaybackId(songId: string, takeId: string): string {
  return `original-take:${songId}:${takeId}`;
}

function originalsTargetToMediaTarget(target: OriginalsPlaybackTarget): EncoreMediaPlaybackTarget {
  const resolvedMime = resolveEncoreDriveMediaMime({
    fileName: target.takeLabel,
    mimeType: target.mimeType,
  });
  const localTakeKey = target.localTakeKey?.trim();
  const driveFileId = target.driveFileId?.trim();
  return {
    playbackId: originalsTakePlaybackId(target.songId, target.takeId),
    kind: encoreDrivePlaybackKind(resolvedMime) ?? 'drive-audio',
    title: target.songTitle,
    subtitle: target.takeLabel,
    driveFileId: driveFileId || undefined,
    localTakeKey: localTakeKey || undefined,
    mimeType: resolvedMime !== 'application/octet-stream' ? resolvedMime : target.mimeType,
  };
}

const EMPTY_TRANSPORT: EncoreMediaTransportState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
};

function revokePlaybackObjectUrl(objectUrl: string | null): void {
  if (objectUrl && shouldRevokeEncoreDriveMediaObjectUrl(objectUrl)) {
    URL.revokeObjectURL(objectUrl);
  }
}

export function EncoreMediaPlaybackProvider({ children }: { children: ReactNode }): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const [target, setTarget] = useState<EncoreMediaPlaybackTarget | null>(null);
  const [phase, setPhase] = useState<EncoreMediaPlaybackPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [transposeSemitones, setTransposeSemitonesState] = useState(0);
  const [loopEnabled, setLoopEnabledState] = useState(false);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [youtubePlayerErrorCode, setYoutubePlayerErrorCode] = useState<number | null>(null);
  const [transport, setTransport] = useState<EncoreMediaTransportState>(EMPTY_TRANSPORT);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const loadIdRef = useRef(0);
  const youtubeControllerRef = useRef<LabsYouTubeController | null>(null);
  const loopEnabledRef = useRef(loopEnabled);
  loopEnabledRef.current = loopEnabled;
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const transposeSemitonesRef = useRef(transposeSemitones);
  transposeSemitonesRef.current = transposeSemitones;
  const adjustmentsByPlaybackIdRef = useRef(new EncoreMediaPlaybackAdjustmentStore());
  const blockedYoutubeVideoIdsRef = useRef<Set<string>>(new Set());
  const spotifyControllerRef = useRef<EncoreSpotifyEmbedController | null>(null);
  const spotifyHostRef = useRef<HTMLDivElement | null>(null);
  const transposeMirrorRef = useRef<MediaTransposeMirror | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const webAudioMirrorRef = useRef(false);
  const queueRef = useRef<EncoreMediaPlaybackTarget[]>([]);
  const queueIndexRef = useRef(0);
  const advancingQueueRef = useRef(false);
  const [queueTick, setQueueTick] = useState(0);

  const bumpQueue = useCallback(() => setQueueTick((t) => t + 1), []);

  const clearQueueState = useCallback(() => {
    queueRef.current = [];
    queueIndexRef.current = 0;
    bumpQueue();
  }, [bumpQueue]);

  const persistAdjustmentsForPlaybackId = useCallback((playbackId: string) => {
    adjustmentsByPlaybackIdRef.current.save(playbackId, {
      playbackRate: playbackRateRef.current,
      transposeSemitones: transposeSemitonesRef.current,
      loopEnabled: loopEnabledRef.current,
    });
  }, []);

  const applyAdjustmentsForPlaybackId = useCallback((playbackId: string) => {
    const next = adjustmentsByPlaybackIdRef.current.get(playbackId);
    playbackRateRef.current = next.playbackRate;
    transposeSemitonesRef.current = next.transposeSemitones;
    loopEnabledRef.current = next.loopEnabled;
    setPlaybackRateState(next.playbackRate);
    setTransposeSemitonesState(next.transposeSemitones);
    setLoopEnabledState(next.loopEnabled);
  }, []);

  const resetPlaybackToIdle = useCallback(() => {
    if (target?.playbackId) {
      persistAdjustmentsForPlaybackId(target.playbackId);
    }
    loadIdRef.current += 1;
    mediaRef.current?.pause();
    if (mediaRef.current) {
      mediaRef.current.removeAttribute('src');
      mediaRef.current.loop = false;
      mediaRef.current.playbackRate = 1;
      mediaRef.current.volume = 1;
    }
    webAudioMirrorRef.current = false;
    youtubeControllerRef.current?.pause();
    setYoutubeIsPlaying(false);
    setYoutubePlayerErrorCode(null);
    spotifyControllerRef.current?.pause();
    spotifyControllerRef.current?.destroy();
    spotifyControllerRef.current = null;
    transposeMirrorRef.current?.stop();
    audioBufferRef.current = null;
    setTransport(EMPTY_TRANSPORT);
    setTarget(null);
    setPhase('idle');
    setErrorMessage(null);
    setObjectUrl((prev) => {
      revokePlaybackObjectUrl(prev);
      return null;
    });
  }, [persistAdjustmentsForPlaybackId, target?.playbackId]);

  const stopPlayback = useCallback(() => {
    clearQueueState();
    resetPlaybackToIdle();
  }, [clearQueueState, resetPlaybackToIdle]);

  const startMedia = useCallback(
    (next: EncoreMediaPlaybackTarget) => {
      if (target?.playbackId) {
        persistAdjustmentsForPlaybackId(target.playbackId);
      }
      applyAdjustmentsForPlaybackId(next.playbackId);
      loadIdRef.current += 1;
      mediaRef.current?.pause();
      youtubeControllerRef.current?.pause();
      spotifyControllerRef.current?.destroy();
      spotifyControllerRef.current = null;
      transposeMirrorRef.current?.stop();
      audioBufferRef.current = null;
      webAudioMirrorRef.current = false;
      setObjectUrl((prev) => {
        revokePlaybackObjectUrl(prev);
        return null;
      });
      setTarget(next);
      setPhase('loading');
      setErrorMessage(null);
      setTransport(EMPTY_TRANSPORT);
      setYoutubePlayerErrorCode(null);
    },
    [applyAdjustmentsForPlaybackId, persistAdjustmentsForPlaybackId, target?.playbackId],
  );

  const tryAdvanceQueue = useCallback(() => {
    const { nextIndex, nextItem, exhausted } = encoreMediaPlaybackQueueAdvance(
      queueRef.current,
      queueIndexRef.current,
    );
    if (exhausted || !nextItem) {
      clearQueueState();
      resetPlaybackToIdle();
      return;
    }
    queueIndexRef.current = nextIndex;
    bumpQueue();
    advancingQueueRef.current = true;
    startMedia(nextItem);
  }, [bumpQueue, clearQueueState, resetPlaybackToIdle, startMedia]);

  const playMedia = useCallback(
    (next: EncoreMediaPlaybackTarget) => {
      if (
        target?.playbackId === next.playbackId &&
        phase !== 'idle' &&
        phase !== 'error'
      ) {
        stopPlayback();
        return;
      }
      if (!advancingQueueRef.current) {
        clearQueueState();
      }
      advancingQueueRef.current = false;
      startMedia(next);
    },
    [clearQueueState, phase, startMedia, stopPlayback, target?.playbackId],
  );

  const playMediaQueue = useCallback(
    (items: EncoreMediaPlaybackTarget[]) => {
      if (items.length === 0) return;
      queueRef.current = items;
      queueIndexRef.current = 0;
      bumpQueue();
      startMedia(items[0]!);
    },
    [bumpQueue, startMedia],
  );

  const playTake = useCallback(
    (next: OriginalsPlaybackTarget) => {
      playMedia(originalsTargetToMediaTarget(next));
    },
    [playMedia],
  );

  const playTakeQueue = useCallback(
    (targets: OriginalsPlaybackTarget[]) => {
      playMediaQueue(targets.map(originalsTargetToMediaTarget));
    },
    [playMediaQueue],
  );

  const playbackQueue = useMemo((): EncoreMediaPlaybackQueueSnapshot | null => {
    void queueTick;
    if (queueRef.current.length <= 1) return null;
    return { items: [...queueRef.current], index: queueIndexRef.current };
  }, [queueTick]);

  useEffect(() => {
    if (!target) return;

    if (target.kind === 'youtube') {
      const videoId = target.youtubeVideoId?.trim();
      if (!videoId) {
        setPhase('error');
        setErrorMessage('Missing YouTube video id.');
        return;
      }
      if (blockedYoutubeVideoIdsRef.current.has(videoId)) {
        setYoutubePlayerErrorCode(101);
        setPhase('error');
        setErrorMessage(
          describeYoutubePlayerError(101, { embedBlockedContext: 'in Encore' }),
        );
        return;
      }
      setPhase('playing');
      setErrorMessage(null);
      return;
    }

    if (target.kind === 'spotify') {
      const trackId = target.spotifyTrackId?.trim();
      if (!trackId) {
        setPhase('error');
        setErrorMessage('Missing Spotify track id.');
        return;
      }
      const loadId = loadIdRef.current;
      void (async () => {
        try {
          const host = spotifyHostRef.current;
          if (!host) throw new Error('Spotify player host not ready.');
          const controller = await createEncoreSpotifyEmbedController(host, trackId);
          if (loadIdRef.current !== loadId) {
            controller.destroy();
            return;
          }
          spotifyControllerRef.current = controller;
          controller.play();
          setPhase('playing');
          setErrorMessage(null);
        } catch (err) {
          if (loadIdRef.current !== loadId) return;
          setPhase('error');
          setErrorMessage(encoreSpotifyPlaybackErrorMessage(err));
        }
      })();
      return;
    }

    const driveFileId = target.driveFileId?.trim();
    const localTakeKey = target.localTakeKey?.trim();
    if (!driveFileId && !localTakeKey) {
      setPhase('error');
      setErrorMessage('This take is not available to play yet.');
      return;
    }

    const loadId = loadIdRef.current;

    void (async () => {
      try {
        const loaded = await resolveEncoreDriveMediaForPlayback({
          accessToken: googleAccessToken,
          driveFileId,
          localTakeKey,
          mimeTypeHint: target.mimeType,
          fileNameHint: target.subtitle ?? target.title,
        });
        if (loadIdRef.current !== loadId) return;
        setObjectUrl(loaded.objectUrl);
        setPhase('playing');
        setErrorMessage(null);
      } catch (err) {
        if (loadIdRef.current !== loadId) return;
        setPhase('error');
        setErrorMessage(encoreDriveMediaPlaybackErrorMessage(err));
        setObjectUrl(null);
      }
    })();
  }, [googleAccessToken, target]);

  const syncTransposeMirror = useCallback(() => {
    const media = mediaRef.current;
    const mirror = transposeMirrorRef.current;
    const semitones = transposeSemitonesRef.current;
    const useMirror = webAudioMirrorRef.current || semitones !== 0;
    if (!media || !mirror?.isReady() || !useMirror) {
      mirror?.stop();
      if (media && !webAudioMirrorRef.current) media.volume = 1;
      return;
    }
    media.volume = 0;
    if (media.paused) {
      mirror.stop();
      return;
    }
    if (mirror.hasActiveSource()) return;
    mirror.startOrRestart(media.currentTime, media.playbackRate, semitones, 1);
  }, []);
  const syncTransposeMirrorRef = useRef(syncTransposeMirror);
  syncTransposeMirrorRef.current = syncTransposeMirror;

  useEffect(() => {
    const isDriveAudio = target?.kind === 'drive-audio';
    const isDriveVideo = target?.kind === 'drive-video';
    if (!target || (!isDriveAudio && !isDriveVideo)) {
      audioBufferRef.current = null;
      transposeMirrorRef.current?.setBuffer(null);
      webAudioMirrorRef.current = false;
      if (mediaRef.current) mediaRef.current.volume = 1;
      return;
    }

    const cacheKey = encoreDriveMediaCacheKey({
      driveFileId: target.driveFileId,
      localTakeKey: target.localTakeKey,
    });

    const resolvedMime = resolveEncoreDriveMediaMime({
      fileName: target.subtitle ?? target.title,
      mimeType: target.mimeType,
    });
    if (isDriveAudio) {
      webAudioMirrorRef.current = encoreDriveMediaPreferWebAudioPlayback(resolvedMime);
    } else {
      webAudioMirrorRef.current = false;
    }

    const needsAudioBuffer = isDriveAudio;
    const needsVideoTranspose = isDriveVideo && transposeSemitones !== 0;
    if (!needsAudioBuffer && !needsVideoTranspose) {
      audioBufferRef.current = null;
      transposeMirrorRef.current?.setBuffer(null);
      if (mediaRef.current && isDriveVideo) mediaRef.current.volume = 1;
      return;
    }
    if (!objectUrl || !cacheKey) return;

    const loadId = loadIdRef.current;
    void (async () => {
      try {
        const buf = await getOrDecodeCachedEncoreDriveAudioBuffer(cacheKey);
        if (!buf) {
          if (loadIdRef.current !== loadId) return;
          if (isDriveVideo) return;
          throw new Error('Could not decode audio.');
        }
        if (loadIdRef.current !== loadId) return;
        audioBufferRef.current = buf;
        if (!transposeMirrorRef.current) {
          transposeMirrorRef.current = new MediaTransposeMirror();
        }
        transposeMirrorRef.current.setBuffer(buf);
        if (
          mediaRef.current &&
          (webAudioMirrorRef.current || transposeSemitonesRef.current !== 0)
        ) {
          mediaRef.current.volume = 0;
        }
        syncTransposeMirror();
      } catch {
        if (loadIdRef.current !== loadId) return;
        audioBufferRef.current = null;
        transposeMirrorRef.current?.setBuffer(null);
        webAudioMirrorRef.current = false;
        if (mediaRef.current) mediaRef.current.volume = 1;
      }
    })();
  }, [googleAccessToken, syncTransposeMirror, target, objectUrl, transposeSemitones]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !objectUrl || phase !== 'playing') return;
    if (target?.kind !== 'drive-audio' && target?.kind !== 'drive-video') return;
    media.src = objectUrl;
    media.loop = loopEnabledRef.current;
    media.playbackRate = playbackRateRef.current;
    const muteNativeAudio =
      target.kind === 'drive-audio'
        ? webAudioMirrorRef.current || transposeSemitonesRef.current !== 0
        : target.kind === 'drive-video' && transposeSemitonesRef.current !== 0;
    if (muteNativeAudio) {
      media.volume = 0;
    }
    const onError = () => {
      if (target?.kind !== 'drive-audio') {
        setPhase('error');
        setErrorMessage('This media file could not be played in your browser.');
        return;
      }
      if (transposeMirrorRef.current?.isReady()) {
        webAudioMirrorRef.current = true;
        media.volume = 0;
        syncTransposeMirrorRef.current();
        void media.play().catch(() => undefined);
        return;
      }
      setPhase('error');
      setErrorMessage('This audio file could not be played in your browser.');
    };
    media.addEventListener('error', onError);
    void media.play().catch(() => {
      setPhase('error');
      setErrorMessage('Playback was blocked. Press play to start.');
    });
    return () => {
      media.removeEventListener('error', onError);
    };
  }, [objectUrl, phase, target?.kind, target?.playbackId]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || target?.kind === 'youtube' || target?.kind === 'spotify') return;

    const syncTransportFromMedia = () => {
      setTransport({
        currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
        duration: Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0,
        isPlaying: !media.paused && !media.ended,
      });
    };

    syncTransportFromMedia();
    media.addEventListener('timeupdate', syncTransportFromMedia);
    media.addEventListener('loadedmetadata', syncTransportFromMedia);
    media.addEventListener('durationchange', syncTransportFromMedia);
    media.addEventListener('play', syncTransportFromMedia);
    media.addEventListener('pause', syncTransportFromMedia);
    media.addEventListener('ended', syncTransportFromMedia);
    media.addEventListener('seeked', syncTransportFromMedia);
    return () => {
      media.removeEventListener('timeupdate', syncTransportFromMedia);
      media.removeEventListener('loadedmetadata', syncTransportFromMedia);
      media.removeEventListener('durationchange', syncTransportFromMedia);
      media.removeEventListener('play', syncTransportFromMedia);
      media.removeEventListener('pause', syncTransportFromMedia);
      media.removeEventListener('ended', syncTransportFromMedia);
      media.removeEventListener('seeked', syncTransportFromMedia);
    };
  }, [objectUrl, target?.kind, phase]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.loop = loopEnabled;
  }, [loopEnabled, objectUrl]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.playbackRate = playbackRate;
    syncTransposeMirror();
  }, [playbackRate, syncTransposeMirror]);

  useEffect(() => {
    syncTransposeMirror();
  }, [transposeSemitones, syncTransposeMirror, objectUrl]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const onPlay = () => syncTransposeMirror();
    const onSeeked = () => {
      transposeMirrorRef.current?.stop();
      syncTransposeMirror();
    };
    const onEnded = () => {
      if (loopEnabled) return;
      tryAdvanceQueue();
    };
    const onTimeUpdate = () => {
      if (transposeSemitones === 0) return;
      syncTransposeMirror();
    };
    media.addEventListener('play', onPlay);
    media.addEventListener('seeked', onSeeked);
    media.addEventListener('ended', onEnded);
    media.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      media.removeEventListener('play', onPlay);
      media.removeEventListener('seeked', onSeeked);
      media.removeEventListener('ended', onEnded);
      media.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [loopEnabled, tryAdvanceQueue, syncTransposeMirror, transposeSemitones, objectUrl]);

  useEffect(() => {
    const controller = youtubeControllerRef.current;
    if (!controller || target?.kind !== 'youtube') return;
    try {
      controller.setPlaybackRate(playbackRate);
    } catch {
      /* ignore */
    }
  }, [playbackRate, target?.kind, phase]);

  const handleYoutubeStateChange = useCallback((state: LabsYouTubePlaybackState) => {
    setYoutubeIsPlaying(state.isPlaying);
    setTransport({
      currentTime: state.currentTime,
      duration: state.duration,
      isPlaying: state.isPlaying,
    });
  }, []);

  const handleYoutubeEnded = useCallback(() => {
    if (loopEnabledRef.current) {
      youtubeControllerRef.current?.seekTo(0);
      requestAnimationFrame(() => {
        youtubeControllerRef.current?.play();
      });
      return;
    }
    tryAdvanceQueue();
  }, [tryAdvanceQueue]);

  const handleYoutubePlayerError = useCallback((errorCode: number) => {
    const videoId = target?.kind === 'youtube' ? target.youtubeVideoId?.trim() : undefined;
    if (videoId && isYoutubeEmbedBlockedError(errorCode)) {
      blockedYoutubeVideoIdsRef.current.add(videoId);
    }
    setYoutubePlayerErrorCode(errorCode);
    setPhase('error');
    setErrorMessage(
      describeYoutubePlayerError(errorCode, { embedBlockedContext: 'in Encore' }),
    );
    setYoutubeIsPlaying(false);
    setTransport((prev) => ({ ...prev, isPlaying: false }));
    youtubeControllerRef.current?.pause();
  }, [target]);

  useEffect(() => {
    return () => {
      transposeMirrorRef.current?.dispose();
      transposeMirrorRef.current = null;
      spotifyControllerRef.current?.destroy();
    };
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const t = Math.max(0, seconds);
      if (target?.kind === 'youtube') {
        youtubeControllerRef.current?.seekTo(t);
        setTransport((prev) => ({ ...prev, currentTime: t }));
        return;
      }
      const media = mediaRef.current;
      if (!media) return;
      const d = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : t;
      media.currentTime = Math.min(t, Math.max(0, d - 0.01));
      transposeMirrorRef.current?.stop();
      syncTransposeMirror();
    },
    [syncTransposeMirror, target?.kind],
  );

  const seekToStart = useCallback(() => {
    seekTo(0);
  }, [seekTo]);

  const seekToEnd = useCallback(() => {
    const media = mediaRef.current;
    const d =
      target?.kind === 'youtube'
        ? transport.duration
        : media && Number.isFinite(media.duration)
          ? media.duration
          : 0;
    if (!(d > 0)) return;
    seekTo(Math.max(0, d - 0.05));
  }, [seekTo, target?.kind, transport.duration]);

  const togglePlayPause = useCallback(() => {
    if (target?.kind === 'youtube') {
      const controller = youtubeControllerRef.current;
      if (!controller) return;
      if (youtubeIsPlaying) controller.pause();
      else controller.play();
      return;
    }
    if (target?.kind === 'spotify') {
      spotifyControllerRef.current?.togglePlay();
      return;
    }
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) void media.play();
    else media.pause();
  }, [target?.kind, youtubeIsPlaying]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (target?.playbackId) {
      adjustmentsByPlaybackIdRef.current.patch(target.playbackId, { playbackRate: rate });
    }
  }, [target?.playbackId]);

  const setTransposeSemitones = useCallback((semitones: number) => {
    transposeSemitonesRef.current = semitones;
    setTransposeSemitonesState(semitones);
    transposeMirrorRef.current?.stop();
    if (target?.playbackId) {
      adjustmentsByPlaybackIdRef.current.patch(target.playbackId, { transposeSemitones: semitones });
    }
    queueMicrotask(() => syncTransposeMirrorRef.current());
  }, [target?.playbackId]);

  const setLoopEnabled = useCallback((enabled: boolean) => {
    setLoopEnabledState(enabled);
    if (target?.playbackId) {
      adjustmentsByPlaybackIdRef.current.patch(target.playbackId, { loopEnabled: enabled });
    }
  }, [target?.playbackId]);

  const isActiveMedia = useCallback(
    (playbackId: string) =>
      target?.playbackId === playbackId && (phase === 'playing' || phase === 'loading' || phase === 'paused'),
    [phase, target],
  );

  const isLoadingMedia = useCallback(
    (playbackId: string) => target?.playbackId === playbackId && phase === 'loading',
    [phase, target],
  );

  const isPlayingTake = useCallback(
    (songId: string, takeId: string) => isActiveMedia(originalsTakePlaybackId(songId, takeId)),
    [isActiveMedia],
  );

  const isLoadingTake = useCallback(
    (songId: string, takeId: string) => isLoadingMedia(originalsTakePlaybackId(songId, takeId)),
    [isLoadingMedia],
  );

  const registerYoutubeController = useCallback((controller: LabsYouTubeController | null) => {
    youtubeControllerRef.current = controller;
    if (!controller) {
      setYoutubeIsPlaying(false);
      return;
    }
    try {
      controller.setPlaybackRate(playbackRate);
    } catch {
      /* ignore */
    }
    if (youtubePlayerErrorCode == null) {
      controller.play();
    }
  }, [playbackRate, youtubePlayerErrorCode]);

  const audioRef = mediaRef as RefObject<HTMLAudioElement | null>;

  const controlsValue = useMemo<EncoreMediaPlaybackControlsValue>(
    () => ({
      target,
      phase,
      errorMessage,
      objectUrl,
      mediaRef,
      audioRef,
      playbackRate,
      transposeSemitones,
      loopEnabled,
      setPlaybackRate,
      setTransposeSemitones,
      setLoopEnabled,
      playMedia,
      playMediaQueue,
      playbackQueue,
      stopPlayback,
      togglePlayPause,
      seekTo,
      seekToStart,
      seekToEnd,
      youtubeIsPlaying,
      handleYoutubeStateChange,
      handleYoutubeEnded,
      handleYoutubePlayerError,
      youtubePlayerErrorCode,
      isActiveMedia,
      isLoadingMedia,
      playTake,
      playTakeQueue,
      isPlayingTake,
      isLoadingTake,
      registerYoutubeController,
      youtubeVideoId: target?.kind === 'youtube' ? target.youtubeVideoId?.trim() ?? null : null,
    }),
    [
      target,
      phase,
      errorMessage,
      objectUrl,
      playbackRate,
      transposeSemitones,
      loopEnabled,
      setPlaybackRate,
      setTransposeSemitones,
      setLoopEnabled,
      playMedia,
      playMediaQueue,
      playbackQueue,
      stopPlayback,
      togglePlayPause,
      seekTo,
      seekToStart,
      seekToEnd,
      youtubeIsPlaying,
      handleYoutubeStateChange,
      handleYoutubeEnded,
      handleYoutubePlayerError,
      youtubePlayerErrorCode,
      isActiveMedia,
      isLoadingMedia,
      playTake,
      playTakeQueue,
      isPlayingTake,
      isLoadingTake,
      registerYoutubeController,
      mediaRef,
      audioRef,
    ],
  );

  const transportValue = useMemo(() => ({ transport }), [transport]);

  return (
    <>
      <div ref={spotifyHostRef} className="encore-spotify-embed-host" aria-hidden hidden />
      {target?.kind === 'drive-audio' ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided practice audio */
        <audio ref={mediaRef as RefObject<HTMLAudioElement>} className="encore-media-playback-media-hidden" aria-hidden />
      ) : null}
      <EncoreMediaPlaybackControlsContext.Provider value={controlsValue}>
        <EncoreMediaTransportContext.Provider value={transportValue}>
          {children}
        </EncoreMediaTransportContext.Provider>
      </EncoreMediaPlaybackControlsContext.Provider>
    </>
  );
}

export type { EncoreMediaPlaybackTarget, EncoreMediaPlaybackPhase, EncoreMediaPlaybackKind } from '../media/encorePlayableMedia';
export type OriginalsPlaybackPhase = EncoreMediaPlaybackPhase;
