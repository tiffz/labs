import { useEffect, useState } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';

const MENU_SPOTIFY_SEARCH_DEBOUNCE_MS = 250;

export type EncoreMenuSpotifySearchState = {
  options: SpotifySearchTrack[];
  loading: boolean;
};

/** Spotify track search scoped to an open add-track menu (not shared with song-info fields). */
export function useEncoreMenuSpotifySearch(args: {
  menuOpen: boolean;
  query: string;
  spotifyLinked: boolean;
  clientId: string;
  hubActive: boolean;
}): EncoreMenuSpotifySearchState {
  const { menuOpen, query, spotifyLinked, clientId, hubActive } = args;
  const [options, setOptions] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hubActive || !menuOpen || !spotifyLinked || !clientId) {
      setOptions([]);
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const token = await ensureSpotifyAccessToken(clientId);
          if (cancelled) return;
          if (!token) {
            setOptions([]);
            return;
          }
          const tracks = await searchTracks(token, q, 8);
          if (cancelled) return;
          setOptions(tracks);
        } catch {
          if (!cancelled) setOptions([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, MENU_SPOTIFY_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [menuOpen, query, spotifyLinked, clientId, hubActive]);

  return { options, loading };
}
