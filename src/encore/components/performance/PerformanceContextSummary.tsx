import MusicNoteIcon from '@mui/icons-material/MusicNote';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { EncorePerformance } from '../../types';
import { encorePerformanceVideoPanelSx, encoreRadius } from '../../theme/encoreUiTokens';
import { encoreNoAlbumArtIconSx, encoreNoAlbumArtSurfaceSx } from '../../utils/encoreNoAlbumArtSurface';
import { normalizeEncorePerformance } from '../../utils/performanceVideoModel';
import { PerformanceVideoCompactRow } from './PerformanceVideoCompactRow';

export type PerformanceContextSummarySong = {
  title: string;
  artist?: string | null;
  albumArtUrl?: string | null;
};

export type PerformanceContextSummaryProps = {
  performance: EncorePerformance;
  googleAccessToken: string | null;
  /** Song identity for visual verification alongside the logged performance. */
  song?: PerformanceContextSummarySong | null;
};

const CONTEXT_GROUP_LABEL_SX = {
  fontWeight: 700,
  letterSpacing: '0.08em',
  lineHeight: 1.3,
  display: 'block',
  mb: 0.875,
} as const;

function ContextSongArt(props: { song: PerformanceContextSummarySong; size?: number }): ReactElement {
  const theme = useTheme();
  const { song, size = 56 } = props;
  const alt = song.artist ? `${song.title} by ${song.artist}` : song.title;

  if (song.albumArtUrl?.trim()) {
    return (
      <Box
        component="img"
        src={song.albumArtUrl.trim()}
        alt={alt}
        sx={{
          width: size,
          height: size,
          borderRadius: encoreRadius,
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 1px 2px rgba(15, 15, 20, 0.05)',
        }}
      />
    );
  }

  return (
    <Box
      aria-hidden
      sx={{
        ...encoreNoAlbumArtSurfaceSx(theme),
        width: size,
        height: size,
        borderRadius: encoreRadius,
        flexShrink: 0,
      }}
    >
      <MusicNoteIcon sx={{ ...encoreNoAlbumArtIconSx(theme), fontSize: 22 }} />
    </Box>
  );
}

function ContextGroupLabel(props: { children: string }): ReactElement {
  return (
    <Typography
      component="h4"
      variant="overline"
      sx={[{
        color: "text.secondary"
      }, ...(Array.isArray(CONTEXT_GROUP_LABEL_SX) ? CONTEXT_GROUP_LABEL_SX : [CONTEXT_GROUP_LABEL_SX])]}>
      {props.children}
    </Typography>
  );
}

/** Read-only performance + song context for the add-video flow. */
export function PerformanceContextSummary(props: PerformanceContextSummaryProps): ReactElement {
  const theme = useTheme();
  const { performance, googleAccessToken, song } = props;
  const normalized = normalizeEncorePerformance(performance);
  const videos = normalized.videos ?? [];
  const primaryId = normalized.primaryVideoId ?? videos[0]?.id;
  const accompaniment = normalized.accompanimentTags ?? [];
  const venue = normalized.venueTag?.trim() || 'Venue';
  const notes = normalized.notes?.trim();
  const hasSong = Boolean(song);

  return (
    <Box sx={{ ...encorePerformanceVideoPanelSx(theme, { isPrimary: false }), p: 2 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          display: 'block',
          mb: 1.25
        }}>
        Adding to
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        sx={{
          alignItems: "flex-start"
        }}
      >
        {hasSong && song ? (
          <Box sx={{ flex: { sm: '0 0 38%' }, maxWidth: { sm: 260 }, minWidth: 0 }}>
            <ContextGroupLabel>Song</ContextGroupLabel>
            <Stack direction="row" spacing={1.25} sx={{
              alignItems: "center"
            }}>
              <ContextSongArt song={song} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.3 }} noWrap title={song.title}>
                  {song.title}
                </Typography>
                {song.artist?.trim() ? (
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500,
                      lineHeight: 1.35
                    }}>
                    {song.artist.trim()}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <ContextGroupLabel>{hasSong ? 'Performance' : 'Logged performance'}</ContextGroupLabel>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, lineHeight: 1.35, fontVariantNumeric: 'tabular-nums' }}
          >
            {normalized.date}
            <Box component="span" sx={{ fontWeight: 500, color: 'text.secondary' }}>
              {' '}
              · {venue}
            </Box>
          </Typography>

          {accompaniment.length > 0 ? (
            <Stack
              direction="row"
              useFlexGap
              sx={{
                flexWrap: "wrap",
                gap: 0.5,
                mt: 0.875
              }}>
              {accompaniment.map((tag) => (
                <Chip
                  key={tag}
                  size="small"
                  label={tag}
                  variant="outlined"
                  sx={{ height: 22, fontWeight: 600, fontSize: '0.75rem' }}
                />
              ))}
            </Stack>
          ) : null}

          {notes ? (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                lineHeight: 1.5,
                mt: accompaniment.length > 0 ? 0.875 : 0.625,
                fontSize: '0.8125rem'
              }}>
              {notes}
            </Typography>
          ) : null}

          {videos.length > 0 ? (
            <Box sx={{ mt: notes || accompaniment.length > 0 ? 1 : 0.875 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  display: 'block',
                  mb: 0.625,
                  letterSpacing: '0.02em'
                }}>
                {videos.length === 1 ? 'Existing video' : `${videos.length} existing videos`}
              </Typography>
              <Stack
                direction="row"
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  gap: 1,
                  alignItems: "center"
                }}>
                {videos.map((video) => (
                  <PerformanceVideoCompactRow
                    key={video.id}
                    variant="summary"
                    video={video}
                    performanceShell={normalized}
                    isPrimary={video.id === primaryId}
                    googleAccessToken={googleAccessToken}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
