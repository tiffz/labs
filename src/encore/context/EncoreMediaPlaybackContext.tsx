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
  encoreDriveMediaPlaybackErrorMessage,
  loadEncoreDriveMediaAudioBuffer,
  loadEncoreDriveMediaObjectUrl,
} from '../media/loadEncoreDriveMediaObjectUrl';
import {
  loadOriginalTakeBlobArrayBuffer,
  loadOriginalTakeObjectUrl,
} from '../originals/originalTakeLocalAudio';
import {
  createEncoreSpotifyEmbedController,
  encoreSpotifyPlaybackErrorMessage,
  type EncoreSpotifyEmbedController,
} from '../media/encoreSpotifyEmbed';
import {
  EncoreMediaPlaybackContext,
  type EncoreMediaPlaybackContextValue,
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
  const blockedYoutubeVideoIdsRef = useRef<Set<string>>(new Set());
  const spotifyControllerRef = useRef<EncoreSpotifyEmbedController | null>(null);
  const spotifyHostRef = useRef<HTMLDivElement | null>(null);
  const transposeMirrorRef = useRef<MediaTransposeMirror | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const webAudioMirrorRef = useRef(false);

  const stopPlayback = useCallback(() => {
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
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

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
      loadIdRef.current += 1;
      mediaRef.current?.pause();
      youtubeControllerRef.current?.pause();
      spotifyControllerRef.current?.destroy();
      spotifyControllerRef.current = null;
      transposeMirrorRef.current?.stop();
      audioBufferRef.current = null;
      webAudioMirrorRef.current = false;
      setObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setTarget(next);
      setPhase('loading');
      setErrorMessage(null);
      setTransport(EMPTY_TRANSPORT);
      setYoutubePlayerErrorCode(null);
    },
    [phase, stopPlayback, target],
  );

  const playTake = useCallback(
    (next: OriginalsPlaybackTarget) => {
      playMedia(originalsTargetToMediaTarget(next));
    },
    [playMedia],
  );

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
    let revoked: string | null = null;

    void (async () => {
      try {
        if (localTakeKey && (!driveFileId || !googleAccessToken)) {
          const loaded = await loadOriginalTakeObjectUrl(localTakeKey, target.subtitle ?? target.title);
          if (loadIdRef.current !== loadId) {
            URL.revokeObjectURL(loaded.objectUrl);
            return;
          }
          revoked = loaded.objectUrl;
          setObjectUrl(loaded.objectUrl);
          setPhase('playing');
          setErrorMessage(null);
          return;
        }
        if (!driveFileId || !googleAccessToken) {
          setPhase('error');
          setErrorMessage('Sign in to Google to play this file.');
          return;
        }
        const loaded = await loadEncoreDriveMediaObjectUrl(
          googleAccessToken,
          driveFileId,
          target.mimeType,
          target.subtitle ?? target.title,
        );
        if (loadIdRef.current !== loadId) {
          URL.revokeObjectURL(loaded.objectUrl);
          return;
        }
        revoked = loaded.objectUrl;
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

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [googleAccessToken, target]);

  const syncTransposeMirror = useCallback(() => {
    const media = mediaRef.current;
    const mirror = transposeMirrorRef.current;
    const useMirror = webAudioMirrorRef.current || transposeSemitones !== 0;
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
    mirror.startOrRestart(media.currentTime, media.playbackRate, transposeSemitones, 1);
  }, [transposeSemitones]);

  useEffect(() => {
    if (!target || target.kind !== 'drive-audio') {
      audioBufferRef.current = null;
      transposeMirrorRef.current?.setBuffer(null);
      webAudioMirrorRef.current = false;
      if (mediaRef.current) mediaRef.current.volume = 1;
      return;
    }
    const driveFileId = target.driveFileId?.trim();
    const localTakeKey = target.localTakeKey?.trim();
    if (!driveFileId && !localTakeKey) return;
    const loadId = loadIdRef.current;
    const resolvedMime = resolveEncoreDriveMediaMime({
      fileName: target.subtitle ?? target.title,
      mimeType: target.mimeType,
    });
    webAudioMirrorRef.current = encoreDriveMediaPreferWebAudioPlayback(resolvedMime);
    void (async () => {
      try {
        const buf =
          localTakeKey && (!driveFileId || !googleAccessToken)
            ? await loadOriginalTakeBlobArrayBuffer(localTakeKey).then((ab) => {
                const ctx = new AudioContext();
                return ctx.decodeAudioData(ab.slice(0)).finally(() => void ctx.close());
              })
            : driveFileId && googleAccessToken
              ? await loadEncoreDriveMediaAudioBuffer(googleAccessToken, driveFileId)
              : null;
        if (!buf) return;
        if (loadIdRef.current !== loadId) return;
        audioBufferRef.current = buf;
        if (!transposeMirrorRef.current) {
          transposeMirrorRef.current = new MediaTransposeMirror();
        }
        transposeMirrorRef.current.setBuffer(buf);
        syncTransposeMirror();
      } catch {
        if (loadIdRef.current !== loadId) return;
        audioBufferRef.current = null;
        transposeMirrorRef.current?.setBuffer(null);
        webAudioMirrorRef.current = false;
        if (mediaRef.current) mediaRef.current.volume = 1;
      }
    })();
  }, [googleAccessToken, syncTransposeMirror, target]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !objectUrl || phase !== 'playing') return;
    if (target?.kind !== 'drive-audio' && target?.kind !== 'drive-video') return;
    media.src = objectUrl;
    media.loop = loopEnabled;
    media.playbackRate = playbackRate;
    if (target.kind === 'drive-audio' && (webAudioMirrorRef.current || transposeSemitones !== 0)) {
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
        syncTransposeMirror();
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
  }, [loopEnabled, objectUrl, phase, playbackRate, syncTransposeMirror, target?.kind, transposeSemitones]);

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
      stopPlayback();
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
  }, [loopEnabled, stopPlayback, syncTransposeMirror, transposeSemitones, objectUrl]);

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
    stopPlayback();
  }, [stopPlayback]);

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
  }, []);

  const setTransposeSemitones = useCallback((semitones: number) => {
    setTransposeSemitonesState(semitones);
    transposeMirrorRef.current?.stop();
  }, []);

  const setLoopEnabled = useCallback((enabled: boolean) => {
    setLoopEnabledState(enabled);
  }, []);

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

  const value = useMemo<EncoreMediaPlaybackContextValue>(
    () => ({
      target,
      phase,
      errorMessage,
      objectUrl,
      mediaRef,
      audioRef,
      transport,
      playbackRate,
      transposeSemitones,
      loopEnabled,
      setPlaybackRate,
      setTransposeSemitones,
      setLoopEnabled,
      playMedia,
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
      transport,
      playbackRate,
      transposeSemitones,
      loopEnabled,
      setPlaybackRate,
      setTransposeSemitones,
      setLoopEnabled,
      playMedia,
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
      isPlayingTake,
      isLoadingTake,
      registerYoutubeController,
    ],
  );

  return (
    <>
      <div ref={spotifyHostRef} className="encore-spotify-embed-host" aria-hidden hidden />
      {target?.kind === 'drive-video' ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided practice video */
        <video
          ref={mediaRef as RefObject<HTMLVideoElement>}
          className="encore-media-playback-media-hidden"
          playsInline
          aria-hidden
        />
      ) : target?.kind === 'drive-audio' ? (
        /* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided practice audio */
        <audio ref={mediaRef as RefObject<HTMLAudioElement>} className="encore-media-playback-media-hidden" aria-hidden />
      ) : null}
      <EncoreMediaPlaybackContext.Provider value={value}>{children}</EncoreMediaPlaybackContext.Provider>
    </>
  );
}

export type { EncoreMediaPlaybackTarget, EncoreMediaPlaybackPhase, EncoreMediaPlaybackKind } from '../media/encorePlayableMedia';
export type OriginalsPlaybackPhase = EncoreMediaPlaybackPhase;
