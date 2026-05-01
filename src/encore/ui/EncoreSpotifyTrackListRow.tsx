import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';

export type EncoreSpotifyTrackListRowProps = {
  track: SpotifySearchTrack;
  /** Optional trailing slot (e.g. action button). */
  trailing?: ReactNode;
};

/**
 * Reusable Spotify track row: album thumbnail + title + artist meta line.
 * Used inside MUI `Autocomplete` (`renderSpotifyTrackAutocompleteOption`) and
 * inside the standalone Spotify search list in `PlaylistImportDialog`.
 */
export function EncoreSpotifyTrackListRow(props: EncoreSpotifyTrackListRowProps): ReactElement {
  const { track, trailing } = props;
  const artistLine = (track.artists ?? []).map((a) => a.name).join(', ');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: 1, minWidth: 0 }}>
      {track.album?.images?.[0]?.url ? (
        <Box
          component="img"
          src={track.album.images[0].url}
          alt=""
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: 'action.hover',
            flexShrink: 0,
          }}
        />
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {track.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {artistLine}
        </Typography>
      </Box>
      {trailing}
    </Box>
  );
}
