export type EncoreSpotifyEmbedController = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
};

type SpotifyEmbedController = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  addListener: (event: string, callback: (payload: { data: { isPaused: boolean } }) => void) => void;
  loadUri: (uri: string) => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string; height?: string },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

type WindowWithSpotifyEmbed = Window & {
  onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
};

let spotifyEmbedApiPromise: Promise<SpotifyIframeApi> | null = null;

function ensureSpotifyEmbedApi(): Promise<SpotifyIframeApi> {
  if (spotifyEmbedApiPromise) return spotifyEmbedApiPromise;
  spotifyEmbedApiPromise = new Promise((resolve, reject) => {
    const w = window as WindowWithSpotifyEmbed;
    const previous = w.onSpotifyIframeApiReady;
    w.onSpotifyIframeApiReady = (api) => {
      previous?.(api);
      resolve(api);
    };
    const existing = document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://open.spotify.com/embed/iframe-api/v1';
      script.async = true;
      script.onerror = () => reject(new Error('Could not load Spotify embed API.'));
      document.body.appendChild(script);
    }
  });
  return spotifyEmbedApiPromise;
}

export async function createEncoreSpotifyEmbedController(
  host: HTMLElement,
  trackId: string,
): Promise<EncoreSpotifyEmbedController> {
  const api = await ensureSpotifyEmbedApi();
  host.innerHTML = '';
  const mount = document.createElement('div');
  host.appendChild(mount);
  const uri = `spotify:track:${trackId.trim()}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) reject(new Error('Spotify embed timed out.'));
    }, 15000);

    api.createController(
      mount,
      { uri, width: '100%', height: '80' },
      (controller) => {
        settled = true;
        window.clearTimeout(timeout);
        resolve({
          play: () => controller.play(),
          pause: () => controller.pause(),
          togglePlay: () => controller.togglePlay(),
          seek: (seconds: number) => controller.seek(Math.max(0, seconds)),
          destroy: () => {
            try {
              controller.pause();
            } catch {
              /* ignore */
            }
            host.innerHTML = '';
          },
        });
      },
    );
  });
}

export function encoreSpotifyPlaybackErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Could not play this Spotify track in Encore.';
}
