import React, { useCallback, useEffect, useMemo, useRef } from 'react';

export interface LabsYouTubePlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
}

export interface LabsYouTubeController {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  /** Current playback time in seconds (for tight loop / transport sync; not every UI tick). */
  getCurrentTime: () => number;
  setPlaybackRate: (rate: number) => void;
  /** 0–100 per YouTube IFrame API. */
  setVolume: (volume: number) => void;
  getVolume: () => number;
}

export interface LabsYouTubePlayerProps {
  videoId: string;
  /** Passed to YouTube IFrame `playerVars` (e.g. loop + playlist for repeat-one). */
  playerVars?: Record<string, number | string>;
  onStateChange?: (state: LabsYouTubePlaybackState) => void;
  onControllerReady?: (controller: LabsYouTubeController | null) => void;
  /** YouTube IFrame API `onError` payload: 2 invalid param, 5 HTML5, 100 not found, 101/150 embed not allowed. */
  onPlayerError?: (errorCode: number) => void;
  /** Fires once when the player reaches the natural end of the video (YouTube `ENDED`). */
  onEnded?: () => void;
  hostClassName?: string;
  iframeClassName?: string;
}

type YtInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  unMute: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  destroy: () => void;
};

type YTApi = {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: () => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YtInstance;
  PlayerState: { PLAYING: number; ENDED: number; PAUSED: number; BUFFERING: number; CUED: number };
};

type WindowWithYt = Window & { YT?: YTApi; onYouTubeIframeAPIReady?: () => void };

function readYt(): YTApi | undefined {
  return (window as WindowWithYt).YT;
}

let youtubeApiPromise: Promise<void> | null = null;

export function ensureYouTubeIframeApi(): Promise<void> {
  if (readYt()?.Player) {
    return Promise.resolve();
  }
  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }
  youtubeApiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }
    const w = window as WindowWithYt;
    const previousReady = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
    const waitForApi = window.setInterval(() => {
      if (readYt()?.Player) {
        window.clearInterval(waitForApi);
        resolve();
      }
    }, 100);
  });
  return youtubeApiPromise;
}

const LabsYouTubePlayer: React.FC<LabsYouTubePlayerProps> = ({
  videoId,
  playerVars,
  onStateChange,
  onControllerReady,
  onPlayerError,
  onEnded,
  hostClassName = 'labs-youtube-host',
  iframeClassName = 'labs-youtube-iframe',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YtInstance | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  const onControllerReadyRef = useRef(onControllerReady);
  const onPlayerErrorRef = useRef(onPlayerError);
  const onEndedRef = useRef(onEnded);
  const prevYtPlayerStateRef = useRef<number | null>(null);
  const playerDomId = useMemo(() => `labs-yt-${crypto.randomUUID()}`, []);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onControllerReadyRef.current = onControllerReady;
  }, [onControllerReady]);

  useEffect(() => {
    onPlayerErrorRef.current = onPlayerError;
  }, [onPlayerError]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const emitState = useCallback(() => {
    const player = playerRef.current;
    const YT = readYt();
    if (!player || !onStateChangeRef.current || !YT) return;
    const st = player.getPlayerState();
    const ENDED = YT.PlayerState?.ENDED ?? 0;
    const prev = prevYtPlayerStateRef.current;
    if (prev !== null && prev !== ENDED && st === ENDED) {
      onEndedRef.current?.();
    }
    prevYtPlayerStateRef.current = st;
    const playing = st === (YT.PlayerState?.PLAYING ?? 1);
    onStateChangeRef.current({
      currentTime: player.getCurrentTime() || 0,
      duration: player.getDuration() || 0,
      isPlaying: playing,
      playbackRate: player.getPlaybackRate?.() || 1,
    });
  }, []);

  useEffect(() => {
    if (!videoId || !hostRef.current) return;

    let mounted = true;
    ensureYouTubeIframeApi()
      .then(() => {
        if (!mounted || !readYt()?.Player) return;
        if (!hostRef.current) return;
        hostRef.current.innerHTML = '';
        const mountNode = document.createElement('div');
        mountNode.id = playerDomId;
        hostRef.current.appendChild(mountNode);
        const ytApi = readYt()!;
        const origin =
          typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
        const player = new ytApi.Player(playerDomId, {
          videoId,
          playerVars: {
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            ...(origin ? { origin } : {}),
            ...playerVars,
          },
          events: {
            onReady: () => {
              emitState();
              onControllerReadyRef.current?.({
                play: () => {
                  try {
                    player.unMute();
                  } catch {
                    /* ignore */
                  }
                  player.playVideo();
                },
                pause: () => player.pauseVideo(),
                seekTo: (seconds: number) => player.seekTo(Math.max(0, seconds), true),
                getCurrentTime: () => {
                  try {
                    return player.getCurrentTime() || 0;
                  } catch {
                    return 0;
                  }
                },
                setPlaybackRate: (rate: number) => {
                  try {
                    player.setPlaybackRate(rate);
                  } catch {
                    /* unsupported rate */
                  }
                },
                setVolume: (volume: number) => {
                  try {
                    const v = Math.max(0, Math.min(100, Math.round(volume)));
                    player.setVolume(v);
                    if (v <= 0) player.mute();
                    else player.unMute();
                  } catch {
                    /* ignore */
                  }
                },
                getVolume: () => {
                  try {
                    return player.getVolume?.() ?? 100;
                  } catch {
                    return 100;
                  }
                },
              });
            },
            onStateChange: () => {
              emitState();
            },
            onError: (event) => {
              onPlayerErrorRef.current?.(event.data);
            },
          },
        });
        playerRef.current = player;
        pollTimerRef.current = window.setInterval(() => {
          emitState();
        }, 280);
      })
      .catch((error) => {
        console.error('LabsYouTubePlayer: failed to init YouTube player', error);
      });

    return () => {
      mounted = false;
      prevYtPlayerStateRef.current = null;
      onControllerReadyRef.current?.(null);
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
    };
  }, [videoId, playerDomId, playerVars, emitState]);

  return (
    <div className={hostClassName}>
      <div ref={hostRef} className={iframeClassName} />
    </div>
  );
};

export default LabsYouTubePlayer;
