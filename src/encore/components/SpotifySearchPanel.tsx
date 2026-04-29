import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { encoreLoopbackUrlFromCurrent } from '../spotify/spotifyRedirectUri';
import { readAndClearSpotifyOAuthFlashError } from '../spotify/completeOAuthFromUrl';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';
import { getAudioFeatures, searchTracks, spotifyKeyToName } from '../spotify/spotifyApi';
import type { EncoreSong } from '../types';

export function SpotifySearchPanel(props: {
  onApply: (patch: Partial<EncoreSong>) => void;
  currentTrackId?: string;
  /** When true, hide the primary “Connect Spotify” call-to-action (header already shows linked). */
  spotifyLinked?: boolean;
}): React.ReactElement {
  const { onApply, currentTrackId, spotifyLinked = false } = props;
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchTracks>>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loopbackHref = useMemo(() => encoreLoopbackUrlFromCurrent(), []);

  useEffect(() => {
    const flash = readAndClearSpotifyOAuthFlashError();
    if (flash) setMsg(flash);
  }, []);

  const connectSpotify = useCallback(async () => {
    setMsg(null);
    const result = await startSpotifyOAuthFlow(clientId);
    if (!result.ok) setMsg(result.message);
  }, [clientId]);

  const runSearch = useCallback(async () => {
    setMsg(null);
    if (!clientId) {
      setMsg('Set VITE_SPOTIFY_CLIENT_ID to search Spotify.');
      return;
    }
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) {
      setMsg('Connect Spotify first.');
      return;
    }
    if (!query.trim()) return;
    try {
      const tracks = await searchTracks(token, query.trim());
      setResults(tracks);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [clientId, query]);

  const applyTrack = useCallback(
    async (trackId: string) => {
      if (!clientId) return;
      const token = await ensureSpotifyAccessToken(clientId);
      if (!token) return;
      try {
        const feats = await getAudioFeatures(token, trackId);
        const track = results.find((t) => t.id === trackId);
        const img = track?.album.images?.[0]?.url;
        const artist = track?.artists.map((a) => a.name).join(', ') ?? '';
        const title = track?.name ?? '';
        onApply({
          spotifyTrackId: trackId,
          title: title || undefined,
          artist: artist || undefined,
          albumArtUrl: img,
          originalBpm: Math.round(feats.tempo),
          originalKey: spotifyKeyToName(feats.key, feats.mode),
        });
        setMsg('Applied track metadata.');
      } catch (e) {
        setMsg(e instanceof Error ? e.message : String(e));
      }
    },
    [clientId, onApply, results]
  );

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Spotify (optional)
      </Typography>
      {!clientId && <Alert severity="info">Add VITE_SPOTIFY_CLIENT_ID to enable metadata search.</Alert>}
      {loopbackHref && (
        <Alert severity="warning" sx={{ my: 1 }}>
          Spotify requires a loopback redirect host (<code>127.0.0.1</code>), not <code>localhost</code>. Google
          sign-in works on either origin if both are listed in the Google Cloud client. For Spotify in dev, use{' '}
          <a href={loopbackHref}>this same page on 127.0.0.1</a> and register{' '}
          <code>{new URL(loopbackHref).origin}/encore/</code> in your Spotify app redirect URIs.
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', my: 1 }}>
        {clientId && !spotifyLinked ? (
          <Button variant="outlined" size="small" onClick={() => void connectSpotify()}>
            Connect Spotify
          </Button>
        ) : null}
        {clientId && spotifyLinked ? (
          <Typography variant="caption" color="text.secondary">
            Spotify is linked — search uses your account.
            <Button size="small" onClick={() => void connectSpotify()} sx={{ ml: 0.5, fontWeight: 600 }}>
              Sign in again
            </Button>
          </Typography>
        ) : null}
        {currentTrackId ? (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            Linked track: {currentTrackId}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Search tracks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 160 }}
        />
        <Button variant="contained" size="small" onClick={() => void runSearch()}>
          Search
        </Button>
      </Box>
      {msg && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {msg}
        </Typography>
      )}
      {results.length > 0 && (
        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
          {results.map((t) => (
            <ListItemButton key={t.id} onClick={() => void applyTrack(t.id)}>
              <ListItemText primary={t.name} secondary={t.artists.map((a) => a.name).join(', ')} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
