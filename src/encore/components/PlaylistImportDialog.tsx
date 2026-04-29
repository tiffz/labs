import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { collectUniquePlaylistIdsFromMixedPaste } from '../import/collectPlaylistIdsFromText';
import {
  buildPlaylistImportRows,
  encoreSongFromImportRow,
  parseYoutubeTitleForSongWithContext,
  type PlaylistImportRow,
} from '../import/matchPlaylists';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyPlaylistTracks, searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';
import { encoreLoopbackUrlFromCurrent } from '../spotify/spotifyRedirectUri';
import { readAndClearSpotifyOAuthFlashError } from '../spotify/completeOAuthFromUrl';
import { startSpotifyOAuthFlow } from '../spotify/startSpotifyOAuthFlow';
import { fetchYouTubePlaylistItems, type YouTubePlaylistItemRow } from '../youtube/youtubePlaylistApi';
import type { SpotifyPlaylistTrackRow } from '../spotify/spotifyApi';
import type { EncoreSong } from '../types';

type Step = 'urls' | 'review';

export function PlaylistImportDialog(props: {
  open: boolean;
  onClose: () => void;
  googleAccessToken: string | null;
  /** From Encore context; avoids showing "Connect Spotify" when the user is already linked. */
  spotifyLinked: boolean;
  onSaveSong: (song: EncoreSong) => Promise<void>;
}): ReactElement {
  const { open, onClose, googleAccessToken, spotifyLinked, onSaveSong } = props;
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';

  const [step, setStep] = useState<Step>('urls');
  const [playlistPaste, setPlaylistPaste] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [youtubeItems, setYoutubeItems] = useState<YouTubePlaylistItemRow[] | null>(null);
  const [rows, setRows] = useState<PlaylistImportRow[]>([]);
  const [spotifySuggest, setSpotifySuggest] = useState<{
    rowId: string;
    anchorEl: HTMLElement;
    query: string;
    results: SpotifySearchTrack[];
    loading: boolean;
  } | null>(null);

  const youtubeOptions = useMemo(() => youtubeItems ?? [], [youtubeItems]);
  const loopbackHref = useMemo(() => encoreLoopbackUrlFromCurrent(), []);

  useEffect(() => {
    if (!open || step !== 'urls') return;
    const flash = readAndClearSpotifyOAuthFlashError();
    if (flash) setMsg(flash);
  }, [open, step]);

  const reset = useCallback(() => {
    setStep('urls');
    setPlaylistPaste('');
    setMsg(null);
    setLoadWarnings([]);
    setBusy(false);
    setYoutubeItems(null);
    setRows([]);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const load = useCallback(async () => {
    setMsg(null);
    setLoadWarnings([]);
    const { spotifyIds: spIds, youtubeIds: ytIds } = collectUniquePlaylistIdsFromMixedPaste(playlistPaste);
    if (!spIds.length && !ytIds.length) {
      setMsg('Paste at least one Spotify or YouTube playlist URL or id (one per line or comma-separated).');
      return;
    }
    if (spIds.length && !clientId) {
      setMsg('Spotify playlist import needs VITE_SPOTIFY_CLIENT_ID in your env.');
      return;
    }
    if (ytIds.length && !googleAccessToken) {
      setMsg('YouTube import needs Google sign-in (YouTube readonly scope).');
      return;
    }
    setBusy(true);
    try {
      if (spIds.length) {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) {
          setMsg(
            spotifyLinked
              ? 'Spotify could not refresh your session. Use "Sign in to Spotify again" below, then try Load playlists.'
              : 'Tap Connect Spotify below, finish sign-in, then tap Load playlists again.',
          );
          return;
        }
      }

      const warnings: string[] = [];
      const mergedSp: SpotifyPlaylistTrackRow[] = [];
      const seenTrack = new Set<string>();
      for (const id of spIds) {
        try {
          const chunk = await fetchSpotifyPlaylistTracks(clientId, id);
          for (const row of chunk) {
            if (seenTrack.has(row.trackId)) continue;
            seenTrack.add(row.trackId);
            mergedSp.push(row);
          }
        } catch (e) {
          warnings.push(`Spotify playlist ${id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      const mergedYt: YouTubePlaylistItemRow[] = [];
      const seenVideo = new Set<string>();
      if (googleAccessToken) {
        for (const id of ytIds) {
          try {
            const chunk = await fetchYouTubePlaylistItems(googleAccessToken, id);
            for (const row of chunk) {
              if (seenVideo.has(row.videoId)) continue;
              seenVideo.add(row.videoId);
              mergedYt.push(row);
            }
          } catch (e) {
            warnings.push(`YouTube playlist ${id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      const sp = mergedSp.length ? mergedSp : null;
      const yt = mergedYt.length ? mergedYt : null;
      setYoutubeItems(yt);
      const built = buildPlaylistImportRows(sp, yt);
      setRows(built);
      if (!built.length) {
        setMsg(
          warnings.length
            ? 'No tracks or videos could be loaded. Fix the errors below or check your playlists.'
            : 'No tracks or videos found in those playlists.',
        );
        if (warnings.length) setLoadWarnings(warnings);
        return;
      }
      if (warnings.length) setLoadWarnings(warnings);
      setStep('review');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [clientId, googleAccessToken, playlistPaste, spotifyLinked]);

  const connectSpotify = useCallback(async () => {
    setMsg(null);
    const result = await startSpotifyOAuthFlow(clientId);
    if (!result.ok) setMsg(result.message);
  }, [clientId]);

  const pickYoutubeForRow = useCallback((rowId: string, videoId: string | null, pool: YouTubePlaylistItemRow[]) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        if (!videoId) return { ...r, youtubeVideoId: null, youtube: undefined, spotifyEnrichment: undefined };
        const item = pool.find((y) => y.videoId === videoId);
        const videoChanged = videoId !== r.youtubeVideoId;
        return {
          ...r,
          youtubeVideoId: videoId,
          youtube: item ?? r.youtube,
          ...(videoChanged ? { spotifyEnrichment: undefined } : {}),
        };
      }),
    );
  }, []);

  const openSpotifySuggest = useCallback((anchorEl: HTMLElement, row: PlaylistImportRow) => {
    if (!row.youtube) return;
    const parsed = parseYoutubeTitleForSongWithContext(row.youtube.title, { description: row.youtube.description });
    const q = [parsed.songTitle, parsed.artist || row.youtube.channelTitle].filter(Boolean).join(' ');
    setSpotifySuggest({ rowId: row.id, anchorEl, query: q, results: [], loading: false });
  }, []);

  const runSpotifySuggestSearch = useCallback(async () => {
    if (!spotifySuggest || !clientId) return;
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) {
      setMsg(
        spotifyLinked
          ? 'Spotify could not refresh your session. Use "Sign in to Spotify again" on the first import step, then search here.'
          : 'Connect Spotify to search.',
      );
      return;
    }
    const q = spotifySuggest.query.trim();
    if (!q) return;
    setSpotifySuggest((s) => (s ? { ...s, loading: true } : s));
    try {
      const tracks = await searchTracks(token, q, 8);
      setSpotifySuggest((s) => (s ? { ...s, results: tracks, loading: false } : s));
    } catch (e) {
      setSpotifySuggest((s) => (s ? { ...s, results: [], loading: false } : s));
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [spotifySuggest, clientId, spotifyLinked]);

  const applySpotifyEnrichment = useCallback((rowId: string, track: SpotifySearchTrack) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              spotifyEnrichment: {
                spotifyTrackId: track.id,
                title: track.name,
                artist: track.artists.map((a) => a.name).join(', '),
                albumArtUrl: track.album.images?.[0]?.url,
              },
            }
          : r,
      ),
    );
    setSpotifySuggest(null);
  }, []);

  const clearSpotifyEnrichment = useCallback((rowId: string) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, spotifyEnrichment: undefined } : r)));
  }, []);

  const applyImport = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      for (const r of rows) {
        const song = encoreSongFromImportRow(r);
        if (song) await onSaveSong(song);
      }
      reset();
      onClose();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [rows, onSaveSong, onClose, reset]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      aria-labelledby="playlist-import-title"
      slotProps={{
        paper: {
          sx: {
            m: { xs: 2, md: 2 },
            maxHeight: { xs: 'calc(100% - 32px)', md: 'min(90vh, 960px)' },
            alignSelf: { md: 'flex-start' },
          },
        },
      }}
    >
      <DialogTitle id="playlist-import-title">Import playlists</DialogTitle>
      <DialogContent>
        {step === 'urls' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Paste Spotify and/or YouTube playlist links or ids together (one per line, or comma-separated). Encore
              detects the platform from each URL. If both sides have tracks, Encore suggests matches from titles; you
              can fix links in the next step before saving.
            </Typography>
            <TextField
              label="Playlist URLs or ids"
              value={playlistPaste}
              onChange={(e) => setPlaylistPaste(e.target.value)}
              fullWidth
              multiline
              minRows={5}
              placeholder={
                'https://open.spotify.com/playlist/…\nhttps://www.youtube.com/playlist?list=…\nhttps://open.spotify.com/playlist/…'
              }
              helperText="Mix Spotify and YouTube in any order. Duplicate tracks or videos across lists are merged once. Bare 22-character ids are treated as Spotify."
            />
            {clientId ? (
              spotifyLinked ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 1, columnGap: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Spotify is connected. Paste Spotify playlist URLs to load them (including private playlists in your
                    account).
                  </Typography>
                  <Button variant="text" size="small" onClick={() => void connectSpotify()} sx={{ fontWeight: 600 }}>
                    Sign in to Spotify again
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={() => void connectSpotify()}>
                    Connect Spotify
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Sign in here to load Spotify playlists (including private ones you can open in Spotify).
                  </Typography>
                </Box>
              )
            ) : null}
            {loopbackHref ? (
              <Alert severity="warning">
                Spotify requires a loopback redirect host (<code>127.0.0.1</code>), not <code>localhost</code>. For
                Spotify in dev, use <a href={loopbackHref}>this same page on 127.0.0.1</a> and register{' '}
                <code>{new URL(loopbackHref).origin}/encore/</code> in your Spotify app redirect URIs.
              </Alert>
            ) : null}
            {!clientId && (
              <Alert severity="info">Spotify import is disabled until VITE_SPOTIFY_CLIENT_ID is set.</Alert>
            )}
            {!googleAccessToken && (
              <Alert severity="info">YouTube import requires Google sign-in with YouTube access.</Alert>
            )}
            {msg && <Alert severity="error">{msg}</Alert>}
            {loadWarnings.length > 0 && (
              <Alert severity="warning">
                Per-playlist errors:
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                  {loadWarnings.map((w, i) => (
                    <li key={`${i}-${w.slice(0, 48)}`}>
                      <Typography variant="body2" component="span">
                        {w}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
          </Box>
        )}
        {step === 'review' && (
          <Box sx={{ pt: 1 }}>
            {loadWarnings.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Some playlists did not load completely.
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                  {loadWarnings.map((w, i) => (
                    <li key={`${i}-${w.slice(0, 48)}`}>
                      <Typography variant="body2" component="span">
                        {w}
                      </Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {rows.length} row(s). Adjust YouTube links per song. For YouTube-only rows you can optionally match a
              Spotify track for saved metadata. Then import.
            </Typography>
            {msg && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {msg}
              </Alert>
            )}
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Spotify</TableCell>
                  <TableCell>YouTube title</TableCell>
                  <TableCell width={100}>Match</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Spotify match (optional)</TableCell>
                  <TableCell>Link YouTube</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.spotify ? (
                        <>
                          <Typography variant="body2" fontWeight={600}>
                            {r.spotify.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.spotify.artist}
                          </Typography>
                        </>
                      ) : r.youtube ? (
                        <Typography variant="body2" color="text.secondary">
                          (YouTube only)
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {r.youtube ? (
                        <>
                          <Typography variant="body2">{r.youtube.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.youtube.channelTitle}
                          </Typography>
                          {r.kind === 'youtube_only' ? (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Import as:{' '}
                              {(() => {
                                const p = parseYoutubeTitleForSongWithContext(r.youtube.title, {
                                  description: r.youtube.description,
                                });
                                return `${p.artist ? `${p.artist} — ` : ''}${p.songTitle}`;
                              })()}
                            </Typography>
                          ) : null}
                        </>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.kind === 'paired' ? `${Math.round(r.matchScore * 100)}%` : r.kind === 'spotify_only' ? '—' : '—'}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: 'top' }}>
                      {r.kind === 'youtube_only' && r.youtube ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.75 }}>
                          {r.spotifyEnrichment ? (
                            <>
                              <Chip size="small" color="primary" variant="outlined" label={r.spotifyEnrichment.title} />
                              <Button size="small" onClick={() => clearSpotifyEnrichment(r.id)}>
                                Clear Spotify
                              </Button>
                            </>
                          ) : clientId ? (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => openSpotifySuggest(e.currentTarget, r)}
                              disabled={busy}
                            >
                              Find on Spotify…
                            </Button>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Set Spotify client id to search
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      {r.spotify || r.kind === 'youtube_only' ? (
                        <FormControl size="small" fullWidth>
                          <InputLabel id={`yt-${r.id}`}>Video</InputLabel>
                          <Select
                            labelId={`yt-${r.id}`}
                            label="Video"
                            value={r.youtubeVideoId ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              pickYoutubeForRow(r.id, v === '' ? null : v, youtubeOptions);
                              setSpotifySuggest(null);
                            }}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {youtubeOptions.map((y) => (
                              <MenuItem key={y.videoId} value={y.videoId}>
                                {y.title.slice(0, 48)}
                                {y.title.length > 48 ? '…' : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
        <Popover
          open={Boolean(spotifySuggest)}
          anchorEl={spotifySuggest?.anchorEl ?? null}
          onClose={() => setSpotifySuggest(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{ paper: { sx: { p: 2, width: 360, maxWidth: '90vw' } } }}
        >
          {spotifySuggest ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2">Spotify search</Typography>
              <TextField
                size="small"
                label="Query"
                value={spotifySuggest.query}
                onChange={(e) => setSpotifySuggest((s) => (s ? { ...s, query: e.target.value } : s))}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="contained" onClick={() => void runSpotifySuggestSearch()} disabled={busy}>
                  Search
                </Button>
                <Button size="small" onClick={() => setSpotifySuggest(null)}>
                  Close
                </Button>
              </Box>
              {spotifySuggest.loading ? (
                <CircularProgress size={28} />
              ) : spotifySuggest.results.length > 0 ? (
                <List dense sx={{ maxHeight: 280, overflow: 'auto' }}>
                  {spotifySuggest.results.map((t) => (
                    <ListItemButton key={t.id} onClick={() => applySpotifyEnrichment(spotifySuggest.rowId, t)}>
                      <ListItemText
                        primary={t.name}
                        secondary={t.artists.map((a) => a.name).join(', ')}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : null}
            </Box>
          ) : null}
        </Popover>
      </DialogContent>
      <DialogActions>
        {step === 'review' && (
          <Button onClick={() => setStep('urls')} disabled={busy}>
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        {step === 'urls' ? (
          <Button variant="contained" onClick={() => void load()} disabled={busy}>
            {busy ? 'Loading…' : 'Load playlists'}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => void applyImport()} disabled={busy}>
            {busy ? 'Saving…' : `Import ${rows.length} songs`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
