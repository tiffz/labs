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
  ) => {
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
  PlayerState: { PLAYING: number; ENDED: number; PAUSED: number; BUFFERING: number; CUED: number };
};

type WindowWithYt = Window & { YT?: YTApi; onYouTubeIframeAPIReady?: () => void };

let youtubeApiPromise: Promise<void> | null = null;

export function readYouTubeIframeApi(): YTApi | undefined {
  return (window as WindowWithYt).YT;
}

export function ensureYouTubeIframeApi(): Promise<void> {
  if (readYouTubeIframeApi()?.Player) {
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
      if (readYouTubeIframeApi()?.Player) {
        window.clearInterval(waitForApi);
        resolve();
      }
    }, 100);
  });
  return youtubeApiPromise;
}

export type YtPlayerInstance = InstanceType<YTApi['Player']>;
