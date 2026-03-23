import React, { useCallback, useEffect, useMemo, useRef } from 'react';

interface YouTubePlayerProps {
  embedUrl: string;
  onStateChange?: (state: YouTubePlaybackState) => void;
  onControllerReady?: (controller: YouTubeController | null) => void;
}

export interface YouTubePlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
}

export interface YouTubeController {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
}

type YouTubePlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: () => void;
          };
        }
      ) => YouTubePlayerInstance;
      PlayerState: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function ensureYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
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
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
    const waitForApi = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(waitForApi);
        resolve();
      }
    }, 100);
  });
  return youtubeApiPromise;
}

function extractEmbedVideoId(embedUrl: string): string | null {
  try {
    const parsed = new URL(embedUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'embed' && parts[1]) return parts[1];
    const direct = parsed.searchParams.get('v');
    return direct;
  } catch {
    return null;
  }
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ embedUrl, onStateChange, onControllerReady }) => {
  const safeUrl = useMemo(() => {
    try {
      const parsed = new URL(embedUrl);
      if (!parsed.hostname.includes('youtube.com')) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }, [embedUrl]);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  const onControllerReadyRef = useRef(onControllerReady);
  const playerDomId = useMemo(() => `yt-player-${crypto.randomUUID()}`, []);
  const videoId = useMemo(() => (safeUrl ? extractEmbedVideoId(safeUrl) : null), [safeUrl]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onControllerReadyRef.current = onControllerReady;
  }, [onControllerReady]);

  const emitState = useCallback(() => {
    const player = playerRef.current;
    if (!player || !onStateChangeRef.current || !window.YT) return;
    onStateChangeRef.current({
      currentTime: player.getCurrentTime() || 0,
      duration: player.getDuration() || 0,
      isPlaying: player.getPlayerState() === window.YT.PlayerState.PLAYING,
      playbackRate: player.getPlaybackRate?.() || 1,
    });
  }, []);

  useEffect(() => {
    if (!videoId || !hostRef.current) return;

    let mounted = true;
    ensureYouTubeApi()
      .then(() => {
        if (!mounted || !window.YT?.Player) return;
        if (!hostRef.current) return;
        hostRef.current.innerHTML = '';
        const mountNode = document.createElement('div');
        mountNode.id = playerDomId;
        hostRef.current.appendChild(mountNode);
        const player = new window.YT.Player(playerDomId, {
          videoId,
          playerVars: {
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              emitState();
              onControllerReadyRef.current?.({
                play: () => player.playVideo(),
                pause: () => player.pauseVideo(),
                seekTo: (seconds: number) => player.seekTo(Math.max(0, seconds), true),
                setPlaybackRate: (rate: number) => {
                  try {
                    player.setPlaybackRate(rate);
                  } catch {
                    // ignore unsupported playback rates
                  }
                },
              });
            },
            onStateChange: () => {
              emitState();
            },
          },
        });
        playerRef.current = player;
        pollTimerRef.current = window.setInterval(() => {
          emitState();
        }, 220);
      })
      .catch((error) => {
        console.error('Failed to init YouTube player API', error);
      });

    return () => {
      mounted = false;
      onControllerReadyRef.current?.(null);
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [videoId, playerDomId, emitState]);

  if (!safeUrl) {
    return <div className="error-text">Invalid YouTube URL.</div>;
  }

  return (
    <div className="video-player youtube-player">
      <div ref={hostRef} className="youtube-iframe" />
    </div>
  );
};

export default YouTubePlayer;
