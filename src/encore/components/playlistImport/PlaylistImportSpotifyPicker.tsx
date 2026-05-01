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
import type { ReactElement } from 'react';
import type { SpotifySearchTrack } from '../../spotify/spotifyApi';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../../theme/encoreUiTokens';
import { EncoreSpotifyTrackListRow } from '../../ui/EncoreSpotifyTrackListRow';
import type { SpotifyPlaylistTrackRow } from '../../spotify/spotifyApi';

export type PlaylistImportSpotifyPickerProps = {
  open: boolean;
  importTracks: SpotifyPlaylistTrackRow[];
  searchResults: SpotifySearchTrack[];
  query: string;
  loading: boolean;
  busy: boolean;
  error: string | null;
  onChangeQuery: (value: string) => void;
  onClearError: () => void;
  onRunSearch: () => void;
  onPickImportTrack: (track: SpotifyPlaylistTrackRow) => void;
  onPickSearchResult: (track: SpotifySearchTrack) => void;
  onClose: () => void;
};

/**
 * "Link Spotify song" dialog used inside PlaylistImportDialog. Shows
 * Spotify-only rows already in this import (top section) plus live Spotify
 * search results (bottom section), and lets the user pick one to attach to
 * the row whose video had no paired Spotify entry. Pure presentational —
 * all state and the row mutations live in the parent.
 */
export function PlaylistImportSpotifyPicker(
  props: PlaylistImportSpotifyPickerProps,
): ReactElement {
  const {
    open,
    importTracks,
    searchResults,
    query,
    loading,
    busy,
    error,
    onChangeQuery,
    onClearError,
    onRunSearch,
    onPickImportTrack,
    onPickSearchResult,
    onClose,
  } = props;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="spotify-picker-title"
    >
      <DialogTitle id="spotify-picker-title" sx={encoreDialogTitleSx}>
        Link Spotify song
      </DialogTitle>
      <DialogContent
        sx={{
          ...encoreDialogContentSx,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflow: 'visible',
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
          {importTracks.length > 0
            ? 'Pick a track already in this import (Spotify-only rows), or search Spotify and choose a result.'
            : 'Search Spotify and pick a track to attach to this row. That helps match library songs and fills in catalog metadata on import.'}
        </Typography>
        {error ? (
          <Alert severity="error" onClose={onClearError}>
            {error}
          </Alert>
        ) : null}
        <Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'flex-start' }}
          >
            <TextField
              size="small"
              label="Spotify search"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <Button
              variant="contained"
              size="medium"
              onClick={onRunSearch}
              disabled={busy || !query.trim()}
              sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.25 } }}
            >
              Search Spotify
            </Button>
            {loading ? <CircularProgress size={28} sx={{ alignSelf: 'center' }} /> : null}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, lineHeight: 1.45 }}
          >
            {importTracks.length > 0
              ? 'Prefilled using track and artist hints from the YouTube title. Import-only rows below always show; rows matching your search text are sorted to the top.'
              : 'Prefilled where possible from the YouTube title. Rows matching your search are sorted to the top.'}
          </Typography>
        </Box>
        {importTracks.length > 0 ? (
          <Box>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'text.secondary',
                letterSpacing: '0.08em',
                fontWeight: 700,
                mb: 1,
              }}
            >
              From this import
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, lineHeight: 1.45 }}
            >
              Spotify-only rows with no video yet in this import.
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 220,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {importTracks.map((sp) => (
                <ListItemButton
                  key={sp.trackId}
                  onClick={() => onPickImportTrack(sp)}
                  alignItems="flex-start"
                >
                  <ListItemAvatar sx={{ minWidth: 56, mt: 0.5 }}>
                    <Avatar
                      src={sp.albumArtUrl}
                      variant="rounded"
                      alt=""
                      sx={{ width: 44, height: 44 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={sp.title}
                    secondary={sp.artist}
                    primaryTypographyProps={{
                      noWrap: true,
                      title: sp.title,
                      variant: 'subtitle2',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ) : null}
        {importTracks.length > 0 && searchResults.length > 0 ? (
          <Divider role="presentation" sx={{ borderColor: 'divider' }} />
        ) : null}
        {searchResults.length > 0 ? (
          <Box>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                color: 'text.secondary',
                letterSpacing: '0.08em',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Spotify catalog
            </Typography>
            <List
              dense
              sx={{
                maxHeight: 280,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              {searchResults.map((t) => (
                <ListItemButton
                  key={t.id}
                  onClick={() => onPickSearchResult(t)}
                  alignItems="center"
                  sx={{ py: 0.75 }}
                >
                  <EncoreSpotifyTrackListRow track={t} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
