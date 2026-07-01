import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import { SpotifyBrandIcon } from '../components/EncoreBrandIcon';
import {
  encoreMediaTrackMenuInputAdornmentSx,
  encoreMediaTrackMenuPasteFieldSx,
} from './EncoreMediaUrlPasteField';
import { EncoreSpotifyTrackListRow } from './EncoreSpotifyTrackListRow';

const MENU_SPOTIFY_RESULTS_MAX_HEIGHT_PX = 220;

export type EncoreSpotifyMenuSearchFieldProps = {
  options: SpotifySearchTrack[];
  loading: boolean;
  inputValue: string;
  onInputChange: (next: string) => void;
  onPickTrack: (track: SpotifySearchTrack) => void;
  /** Prefill and search when focused while empty. */
  searchSeed?: string;
  placeholder?: string;
};

function stopMenuClose(event: { preventDefault: () => void }) {
  event.preventDefault();
}

/** Spotify track search for add-track menus — results float in a portaled popper so the menu stays compact. */
export function EncoreSpotifyMenuSearchField(props: EncoreSpotifyMenuSearchFieldProps): ReactElement {
  const {
    options,
    loading,
    inputValue,
    onInputChange,
    onPickTrack,
    searchSeed = '',
    placeholder = 'Title or artist',
  } = props;

  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchorWidth, setAnchorWidth] = useState<number | undefined>(undefined);
  const queryActive = inputValue.trim().length >= 2;
  const showPopper = queryActive || loading || options.length > 0;

  const seedOnFocus = () => {
    if (inputValue.trim()) return;
    const seed = searchSeed.trim();
    if (seed.length >= 2) onInputChange(seed);
  };

  useLayoutEffect(() => {
    if (!showPopper) return;
    const el = anchorRef.current;
    if (!el) return;
    setAnchorWidth(el.offsetWidth);
  }, [showPopper, inputValue]);

  return (
    <Box ref={anchorRef} sx={{ width: 1, mt: 1 }}>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder={placeholder}
        value={inputValue}
        sx={encoreMediaTrackMenuPasteFieldSx}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={seedOnFocus}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start" sx={encoreMediaTrackMenuInputAdornmentSx}>
              <SpotifyBrandIcon sx={{ fontSize: 18, display: 'block' }} aria-hidden />
            </InputAdornment>
          ),
          endAdornment: loading ? (
            <CircularProgress color="inherit" size={16} sx={{ mr: 0.75 }} />
          ) : null,
        }}
      />
      <Popper
        open={showPopper}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      >
        <Paper
          elevation={4}
          aria-label="Spotify search results"
          onMouseDown={stopMenuClose}
          sx={{
            width: anchorWidth,
            maxHeight: MENU_SPOTIFY_RESULTS_MAX_HEIGHT_PX,
            overflow: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <List dense disablePadding>
            {loading && options.length === 0 ? (
              <ListItemButton dense disabled sx={{ py: 1, px: 1.25, opacity: 1 }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Searching…
              </ListItemButton>
            ) : null}
            {!loading && options.length === 0 ? (
              <ListItemButton dense disabled sx={{ py: 1, px: 1.25, opacity: 1 }}>
                No matches
              </ListItemButton>
            ) : null}
            {options.map((track) => (
              <ListItemButton
                key={track.id}
                dense
                onClick={() => onPickTrack(track)}
                sx={{ py: 0.75, px: 1.25, alignItems: 'flex-start' }}
              >
                <EncoreSpotifyTrackListRow track={track} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
}
