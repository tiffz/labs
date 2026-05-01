import type { HTMLAttributes, Key, ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SpotifySearchTrack } from '../spotify/spotifyApi';
import { EncoreSpotifyTrackListRow } from './EncoreSpotifyTrackListRow';

/**
 * Shared Spotify search row with album thumbnail — use with MUI `Autocomplete` `renderOption`
 * so track picking looks the same across Encore. Wraps {@link EncoreSpotifyTrackListRow}.
 */
export function renderSpotifyTrackAutocompleteOption(
  liProps: HTMLAttributes<HTMLLIElement> & { key?: Key },
  track: SpotifySearchTrack
): ReactNode {
  return (
    <Box component="li" {...liProps} key={track.id}>
      <EncoreSpotifyTrackListRow track={track} />
    </Box>
  );
}
