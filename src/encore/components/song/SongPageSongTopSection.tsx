import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';

import { SongPageMediaHubCards, type SongPageMediaHubFileDropConfig, type SongPageMediaSlots } from './SongPageMediaHubCards';

export type SongPageHeroBlocks = {
  albumArt: ReactNode;
  titleField: ReactNode;
  artistField: ReactNode;
  tagsKeyPractice: ReactNode;
};

export type SongPageTopHalfBlocks = SongPageHeroBlocks & {
  /** Spotify song info source row (metadata / sync / default art), below title + artist. */
  catalogStrip: ReactNode;
  spotifyAlerts: ReactNode;
  mediaSlots: SongPageMediaSlots;
  /** De-emphasized web search links below the main song surface. */
  searchWebFooter: ReactNode;
};

/**
 * Song identity + media hub: large cover + tags; title/artist; song info source strip; hub cards; optional web footer.
 */
export function SongPageSongTopSection(props: {
  blocks: SongPageTopHalfBlocks;
  /** When set, hub cards accept drag-and-drop uploads (Song page only). */
  mediaHubFileDrop?: SongPageMediaHubFileDropConfig;
}): ReactElement {
  const { blocks, mediaHubFileDrop } = props;
  const { spotifyAlerts, mediaSlots, catalogStrip, searchWebFooter, ...heroBlocks } = blocks;
  const { albumArt, titleField, artistField, tagsKeyPractice } = heroBlocks;
  const theme = useTheme();

  const fieldShellSx = {
    '& .MuiTextField-root': { width: 1 },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.25,
      bgcolor: 'transparent',
      transition: theme.transitions.create(['border-color', 'box-shadow'], {
        duration: theme.transitions.duration.shorter,
      }),
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: alpha(theme.palette.text.primary, 0.12),
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: alpha(theme.palette.text.primary, 0.2),
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: 1,
      borderColor: alpha(theme.palette.primary.main, 0.42),
    },
    '& .MuiInputLabel-root': {
      fontWeight: 600,
      letterSpacing: '0.03em',
      fontSize: theme.typography.caption.fontSize,
      color: 'text.secondary',
    },
  } as const;

  /**
   * Softer than the previous `0 28px 56px -12px rgba(0,0,0,0.22)` — that read like a heavy product
   * shot. A short, slightly diffused shadow keeps the cover anchored without competing with the
   * panel's content density.
   */
  const artShadow = `0 8px 20px -12px ${alpha(theme.palette.common.black, 0.22)}, 0 2px 6px -2px ${alpha(theme.palette.common.black, 0.06)}`;

  return (
    <Stack spacing={2.5} sx={{ width: 1, minWidth: 0 }}>
      {spotifyAlerts}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 3, md: 4 }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        sx={{ width: 1, minWidth: 0 }}
      >
        <Stack
          spacing={2}
          sx={{
            flexShrink: 0,
            width: { xs: 1, md: 'auto' },
            maxWidth: { xs: '100%', md: 308 },
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Box
            sx={{
              lineHeight: 0,
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: artShadow,
              alignSelf: { xs: 'center', md: 'flex-start' },
            }}
          >
            {albumArt}
          </Box>
          <Box sx={{ width: 1, alignSelf: 'stretch', minWidth: 0, pt: 0.25 }}>{tagsKeyPractice}</Box>
          {searchWebFooter ? (
            <Box
              component="footer"
              sx={{
                width: 1,
                minWidth: 0,
                pt: 1.25,
                borderTop: 1,
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {searchWebFooter}
            </Box>
          ) : null}
        </Stack>

        <Stack spacing={2.25} sx={{ flex: 1, minWidth: 0, width: 1 }}>
          <Stack spacing={2} sx={fieldShellSx}>
            {titleField}
            {artistField}
          </Stack>
          <Box sx={{ width: 1, minWidth: 0 }}>{catalogStrip}</Box>
          <SongPageMediaHubCards slots={mediaSlots} fileDrop={mediaHubFileDrop} />
        </Stack>
      </Stack>
    </Stack>
  );
}
