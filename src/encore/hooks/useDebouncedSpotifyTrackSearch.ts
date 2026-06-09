import { useEffect, useRef, useState } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';

type UseDebouncedSpotifyTrackSearchOptions = {
  query: string;
  clientId: string;
  enabled: boolean;
  limit?: number;
  debounceMs?: number;
};

/** Debounced Spotify track search for Encore dialogs (Add to practice, etc.). */
export function useDebouncedSpotifyTrackSearch({
  query,
  clientId,
  enabled,
  limit = 8,
  debounceMs = 220,
}: UseDebouncedSpotifyTrackSearchOptions): { results: SpotifySearchTrack[]; loading: boolean } {
  const [results, setResults] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !clientId) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) {
          setResults([]);
          return;
        }
        const tracks = await searchTracks(token, term, limit);
        setResults(tracks);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clientId, debounceMs, enabled, limit, query]);

  return { results, loading };
}
