import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';

export type BulkVideoSongMatchDialogProps = {
  open: boolean;
  onClose: () => void;
  spotifyLinked: boolean;
  clientId: string;
  connectSpotify: () => void;
  /** Seed for the Spotify search box when the dialog opens. */
  initialSearchQuery: string;
  onPickSpotify: (track: SpotifySearchTrack) => void;
  onPickManual: (title: string, artist: string) => void;
};

/**
 * Spotify catalog search plus manual title/artist entry (bulk performance import).
 */
export function BulkVideoSongMatchDialog(props: BulkVideoSongMatchDialogProps): ReactElement {
  const { open, onClose, spotifyLinked, clientId, connectSpotify, initialSearchQuery, onPickSpotify, onPickManual } =
    props;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SpotifySearchTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');

  useEffect(() => {
    if (!open) return;
    setQ(initialSearchQuery.trim());
    setResults([]);
    setErr(null);
    setLoading(false);
    setManualTitle('');
    setManualArtist('');
  }, [open, initialSearchQuery]);

  const runSearch = useCallback(async () => {
    if (!clientId) {
      setErr('Spotify search needs VITE_SPOTIFY_CLIENT_ID.');
      return;
    }
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) {
      setErr(
        spotifyLinked
          ? 'Spotify could not refresh. Use Account → Disconnect Spotify, then Connect again, and retry search.'
          : 'Connect Spotify (Account menu) to search.',
      );
      return;
    }
    const query = q.trim();
    if (!query) return;
    setErr(null);
    setLoading(true);
    try {
      const tracks = await searchTracks(token, query, 12);
      setResults(tracks);
    } catch (e) {
      setResults([]);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [clientId, q, spotifyLinked]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="bulk-video-song-match-title">
      <DialogTitle id="bulk-video-song-match-title">Match song</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5, px: 3, pb: 1, overflow: 'visible' }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          Search Spotify for a track to create as a new library song for this performance, or enter a title and artist
          manually.
        </Typography>
        {err ? (
          <Alert severity="error" onClose={() => setErr(null)}>
            {err}
          </Alert>
        ) : null}
        {clientId ? (
          spotifyLinked ? (
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
                <TextField
                  size="small"
                  label="Spotify search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setErr(null);
                  }}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <Button variant="contained" onClick={() => void runSearch()} disabled={loading || !q.trim()}>
                  Search
                </Button>
                {loading ? <CircularProgress size={28} sx={{ alignSelf: 'center' }} /> : null}
              </Stack>
              <List dense sx={{ maxHeight: 280, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {results.length === 0 ? (
                  <Box sx={{ px: 2, py: 2.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Searching…' : 'No results yet. Run a search above.'}
                    </Typography>
                  </Box>
                ) : (
                  results.map((t) => {
                    const thumb = t.album.images?.[0]?.url;
                    return (
                      <ListItemButton
                        key={t.id}
                        onClick={() => {
                          onPickSpotify(t);
                          onClose();
                        }}
                        alignItems="flex-start"
                      >
                        <ListItemAvatar sx={{ minWidth: 56, mt: 0.5 }}>
                          <Avatar src={thumb} variant="rounded" alt="" sx={{ width: 44, height: 44 }} />
                        </ListItemAvatar>
                        <ListItemText
                          primary={t.name}
                          secondary={t.artists.map((a) => a.name).join(', ')}
                          primaryTypographyProps={{ noWrap: true, variant: 'subtitle2', fontWeight: 500 }}
                          secondaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                        />
                      </ListItemButton>
                    );
                  })
                )}
              </List>
            </Stack>
          ) : (
            <Button variant="outlined" size="small" onClick={() => void connectSpotify()}>
              Connect Spotify to search
            </Button>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            Spotify search is disabled until VITE_SPOTIFY_CLIENT_ID is set.
          </Typography>
        )}

        <Divider sx={{ my: 0.5 }} />

        <Box>
          <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', letterSpacing: '0.08em', fontWeight: 700, mb: 1 }}>
            Manual (no Spotify)
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              size="small"
              label="Song title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="Artist"
              value={manualArtist}
              onChange={(e) => setManualArtist(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                onPickManual(manualTitle.trim() || 'Untitled', manualArtist.trim() || 'Unknown artist');
                onClose();
              }}
            >
              Use manual title and artist
            </Button>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
