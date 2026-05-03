import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEncore } from '../context/EncoreContext';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { searchTracks, type SpotifySearchTrack } from '../spotify/spotifyApi';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import type { EncoreSong } from '../types';
import { navigateEncore } from '../routes/encoreAppHash';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { SpotifyBrandIcon } from './EncoreBrandIcon';
import { EncoreSpotifyConnectionChip } from '../ui/EncoreSpotifyConnectionChip';
import { renderSpotifyTrackAutocompleteOption } from '../ui/renderSpotifyTrackAutocompleteOption';

/**
 * Minimal "Add song" flow:
 *  - If Spotify is connected, type to search and pick a track. Title, artist, and
 *    album art come from the Spotify result.
 *  - Otherwise (or to override the Spotify result), enter title + artist by hand.
 *
 * After submit we save the song locally and open its song page so the user can
 * fill in performance key, milestones, attachments, etc. there.
 */
export function AddSongDialog(props: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  const { open, onClose } = props;
  const {
    saveSong,
    repertoireExtras,
    spotifyLinked,
    clearSpotifyConnectError,
  } = useEncore();
  const clientId =
    (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ??
    '';
  const spotifyAvailable = Boolean(clientId && spotifyLinked);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);
  const [spotifyTrackId, setSpotifyTrackId] = useState<string | null>(null);
  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>(
    []
  );
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state whenever the dialog re-opens, then focus the right field.
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setArtist('');
    setAlbumArtUrl(null);
    setSpotifyTrackId(null);
    setSpotifyOptions([]);
    setSearchInput('');
    setError(null);
    requestAnimationFrame(() => {
      const target = spotifyAvailable
        ? searchInputRef.current
        : titleInputRef.current;
      target?.focus();
    });
  }, [open, spotifyAvailable]);

  // Debounced Spotify search.
  useEffect(() => {
    if (!spotifyAvailable) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = searchInput.trim();
    if (term.length < 2) {
      setSpotifyOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await ensureSpotifyAccessToken(clientId);
        if (!token) return;
        const results = await searchTracks(token, term, 8);
        setSpotifyOptions(results);
      } catch {
        /* search is best-effort; user can fall back to manual input */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, spotifyAvailable, clientId]);

  const trackLabel = useCallback((t: SpotifySearchTrack) => {
    const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
    return `${t.name} · ${artists}`;
  }, []);

  const applySpotifyTrack = useCallback((t: SpotifySearchTrack) => {
    setTitle(t.name?.trim() ?? '');
    setArtist(
      t.artists
        ?.map((a) => a.name)
        .join(', ')
        .trim() ?? ''
    );
    setAlbumArtUrl(t.album?.images?.[0]?.url ?? null);
    setSpotifyTrackId(t.id);
  }, []);

  const canSubmit =
    title.trim().length > 0 && artist.trim().length > 0 && !saving;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const now = new Date().toISOString();
    const draft: EncoreSong = {
      id: crypto.randomUUID(),
      title: title.trim(),
      artist: artist.trim(),
      albumArtUrl: albumArtUrl ?? undefined,
      spotifyTrackId: spotifyTrackId ?? undefined,
      journalMarkdown: '',
      createdAt: now,
      updatedAt: now,
    };
    try {
      const synced = applyTemplateProgressToSong(
        draft,
        repertoireExtras.milestoneTemplate
      );
      await saveSong(synced);
      onClose();
      // Open the song page so the user can fill in the rest at their leisure.
      navigateEncore({ kind: 'song', id: synced.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [
    albumArtUrl,
    artist,
    canSubmit,
    onClose,
    repertoireExtras.milestoneTemplate,
    saveSong,
    spotifyTrackId,
    title,
  ]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
        e.preventDefault();
        void submit();
      }
    },
    [canSubmit, submit]
  );

  const previewMeta = useMemo(() => {
    if (!albumArtUrl) return null;
    return albumArtUrl;
  }, [albumArtUrl]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="add-song-title"
      slotProps={{ paper: { sx: { overflow: 'visible' } } }}
    >
      <DialogTitle id="add-song-title" sx={encoreDialogTitleSx}>
        Add song
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          /* Outlined TextField labels extend above the input; DialogContent’s default overflow clips them. */
          overflow: 'visible',
          pt: 3,
        }}
      >
        <Stack spacing={2.5}>
          {clientId ? (
            <>
              <EncoreSpotifyConnectionChip
                onBeforeOAuth={clearSpotifyConnectError}
                description={
                  spotifyAvailable
                    ? undefined
                    : 'Connect to search Spotify and pre-fill title, artist, and album art.'
                }
              />
              {spotifyAvailable ? (
                <Autocomplete
                  freeSolo
                  fullWidth
                  loading={loading}
                  options={spotifyOptions}
                  filterOptions={(x) => x}
                  getOptionLabel={(o) =>
                    typeof o === 'string' ? o : trackLabel(o)
                  }
                  isOptionEqualToValue={(a, b) =>
                    typeof a !== 'string' &&
                    typeof b !== 'string' &&
                    a.id === b.id
                  }
                  inputValue={searchInput}
                  onInputChange={(_e, v) => setSearchInput(v)}
                  onChange={(_e, v) => {
                    if (v && typeof v !== 'string') applySpotifyTrack(v);
                  }}
                  renderOption={(p, t) =>
                    renderSpotifyTrackAutocompleteOption(p, t)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Spotify"
                      placeholder="Title, artist, or both"
                      inputRef={(el: HTMLInputElement | null) => {
                        searchInputRef.current = el;
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              mr: 0.5,
                            }}
                          >
                            <SpotifyBrandIcon sx={{ fontSize: 18 }} />
                          </Box>
                        ),
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      helperText="Pick a track to fill title, artist, and album art."
                    />
                  )}
                />
              ) : null}
            </>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1.55 }}
            >
              Spotify isn’t configured here. Fill in title and artist below.
            </Typography>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {previewMeta ? (
              <Box
                component="img"
                src={previewMeta}
                alt=""
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 1.5,
                  objectFit: 'cover',
                  flexShrink: 0,
                  alignSelf: 'flex-start',
                }}
              />
            ) : null}
            <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
              <TextField
                label="Title"
                size="small"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={onKeyDown}
                inputRef={(el: HTMLInputElement | null) => {
                  titleInputRef.current = el;
                }}
                required
              />
              <TextField
                label="Artist"
                size="small"
                fullWidth
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                onKeyDown={onKeyDown}
                required
              />
            </Stack>
          </Stack>

          {spotifyTrackId ? (
            <Link
              href={`https://open.spotify.com/track/${spotifyTrackId}`}
              target="_blank"
              rel="noreferrer"
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontWeight: 600,
              }}
            >
              Linked to Spotify track
              <OpenInNewIcon sx={{ fontSize: 12 }} />
            </Link>
          ) : null}

          {error ? (
            <Typography
              variant="caption"
              color="error"
              sx={{ lineHeight: 1.5 }}
            >
              {error}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() => void submit()}
          variant="contained"
          disabled={!canSubmit}
        >
          {saving ? 'Adding…' : 'Add song'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
