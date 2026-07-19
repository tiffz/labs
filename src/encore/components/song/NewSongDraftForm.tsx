import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEncore } from '../../context/EncoreContext';
import { ensureSpotifyAccessToken } from '../../spotify/pkce';
import { searchTracks, type SpotifySearchTrack } from '../../spotify/spotifyApi';
import { renderSpotifyTrackAutocompleteOption } from '../../ui/renderSpotifyTrackAutocompleteOption';
import { SpotifyBrandIcon } from '../EncoreBrandIcon';
import { EncoreSpotifyConnectionChip } from '../../ui/EncoreSpotifyConnectionChip';
import { isNewSongDraftSubmittable, type NewSongDraft } from './newSongDraft';

export type NewSongDraftFormProps = {
  draft: NewSongDraft;
  onDraftChange: (draft: NewSongDraft) => void;
  /** Submit when the user hits Enter in Title or Artist. */
  onSubmit?: () => void;
  /**
   * When true, focuses the most relevant input on mount (Spotify search if available, else the
   * Title field). Default `true`. Renamed away from `autoFocus` to keep the prop name distinct
   * from the underlying HTML/MUI prop (which lints as a11y-hostile).
   */
  autoFocusOnMount?: boolean;
  /** Hide the Spotify connection chip + autocomplete (e.g. when the parent already renders it). */
  hideSpotifyControls?: boolean;
};

/**
 * Inline form fields for creating a new song. Shared by {@link AddSongDialog} and
 * {@link AddToPracticeDialog} so both surfaces stay aligned on field layout, validation, and
 * Spotify behaviour.
 *
 * Intentionally renders just the **fields** (not action buttons, not a wrapping dialog) so the
 * parent owns "what happens on submit" — historically `AddSongDialog` always navigated to the
 * song page after save, which is wrong for the Practice add flow.
 *
 * Draft state lives outside the component so the parent can prefill (e.g. the Practice flow
 * carries over the search query as the initial title).
 */
export function NewSongDraftForm({
  draft,
  onDraftChange,
  onSubmit,
  autoFocusOnMount = true,
  hideSpotifyControls = false,
}: NewSongDraftFormProps): React.ReactElement {
  const { spotifyLinked, clearSpotifyConnectError } = useEncore();
  const clientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ?? '';
  const spotifyAvailable = Boolean(clientId && spotifyLinked) && !hideSpotifyControls;

  const [spotifyOptions, setSpotifyOptions] = useState<SpotifySearchTrack[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!autoFocusOnMount) return;
    requestAnimationFrame(() => {
      const target = spotifyAvailable ? searchInputRef.current : titleInputRef.current;
      target?.focus();
    });
  }, [autoFocusOnMount, spotifyAvailable]);

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

  const applySpotifyTrack = useCallback(
    (t: SpotifySearchTrack) => {
      onDraftChange({
        title: t.name?.trim() ?? '',
        artist: t.artists?.map((a) => a.name).join(', ').trim() ?? '',
        albumArtUrl: t.album?.images?.[0]?.url ?? null,
        spotifyTrackId: t.id,
      });
    },
    [onDraftChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && onSubmit && isNewSongDraftSubmittable(draft)) {
        e.preventDefault();
        onSubmit();
      }
    },
    [draft, onSubmit],
  );

  const previewSrc = useMemo(() => draft.albumArtUrl ?? null, [draft.albumArtUrl]);

  return (
    <Stack spacing={2.5}>
      {!hideSpotifyControls && clientId ? (
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
              getOptionLabel={(o) => (typeof o === 'string' ? o : trackLabel(o))}
              isOptionEqualToValue={(a, b) =>
                typeof a !== 'string' && typeof b !== 'string' && a.id === b.id
              }
              inputValue={searchInput}
              onInputChange={(_e, v) => setSearchInput(v)}
              onChange={(_e, v) => {
                if (v && typeof v !== 'string') applySpotifyTrack(v);
              }}
              renderOption={(p, t) => renderSpotifyTrackAutocompleteOption(p, t)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Spotify"
                  placeholder="Title, artist, or both"
                  inputRef={(el: HTMLInputElement | null) => {
                    searchInputRef.current = el;
                  }}
                  helperText="Pick a track to fill title, artist, and album art."
                  slotProps={{
                    ...params.slotProps,

                    input: {
                      ...params.slotProps.input,
                      startAdornment: (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', mr: 0.5 }}>
                          <SpotifyBrandIcon sx={{ fontSize: 18 }} />
                        </Box>
                      ),
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress size={16} /> : null}
                          {params.slotProps.input.endAdornment}
                        </>
                      ),
                    }
                  }}
                />
              )}
            />
          ) : null}
        </>
      ) : !hideSpotifyControls ? (
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            lineHeight: 1.55
          }}>
          Spotify isn’t configured here. Fill in title and artist below.
        </Typography>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {previewSrc ? (
          <Box
            component="img"
            src={previewSrc}
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
            value={draft.title}
            onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
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
            value={draft.artist}
            onChange={(e) => onDraftChange({ ...draft, artist: e.target.value })}
            onKeyDown={onKeyDown}
            required
          />
        </Stack>
      </Stack>
      {draft.spotifyTrackId ? (
        <Link
          href={`https://open.spotify.com/track/${draft.spotifyTrackId}`}
          target="_blank"
          rel="noreferrer"
          variant="caption"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
        >
          Linked to Spotify track
          <OpenInNewIcon sx={{ fontSize: 12 }} />
        </Link>
      ) : null}
    </Stack>
  );
}
