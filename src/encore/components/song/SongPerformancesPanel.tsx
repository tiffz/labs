import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { DragEvent, ReactElement } from 'react';
import { useDragDropHighlight } from '../../../shared/hooks/useDragDropHighlight';
import { fileMatchesAccept } from '../../../shared/utils/fileMatchesAccept';
import { useEncoreMediaPlaybackHoverProps } from '../../hooks/useEncoreMediaPlaybackHoverProps';
import type { EncorePerformance } from '../../types';
import { encorePerformanceVideoPanelSx } from '../../theme/encoreUiTokens';
import { PERF_LOCAL_VIDEO_ACCEPT } from '../../utils/performanceVideoAccept';
import { performanceVideoOpenUrl } from '../../utils/performanceVideoUrl';
import { PerformanceExtraVideosChip } from '../performance/PerformanceExtraVideosChip';
import { PerformanceMediaActions } from '../performance/PerformanceMediaActions';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';
import { dataTransferHasPerformanceVideoFile } from './encoreDragPayload';

export type SongPerformancesPanelProps = {
  performances: EncorePerformance[];
  filteredPerformances: EncorePerformance[];
  venueBreakdown: Array<[venue: string, count: number]>;
  venueFilter: string | null;
  songTitle?: string;
  googleAccessToken: string | null;
  onSelectVenueFilter: (venue: string | null) => void;
  onAddPerformance: () => void;
  onEditPerformance: (perf: EncorePerformance) => void;
  onAddVideoToPerformance?: (perf: EncorePerformance, file: File) => void;
  onSetPrimaryVideo?: (perf: EncorePerformance, videoId: string) => void;
};

function PerformanceCard(props: {
  performance: EncorePerformance;
  songTitle?: string;
  googleAccessToken: string | null;
  onEditPerformance: (perf: EncorePerformance) => void;
  onAddVideoToPerformance?: (perf: EncorePerformance, file: File) => void;
  onSetPrimaryVideo?: (perf: EncorePerformance, videoId: string) => void;
}): ReactElement {
  const {
    performance: p,
    songTitle,
    googleAccessToken,
    onEditPerformance,
    onAddVideoToPerformance,
    onSetPrimaryVideo,
  } = props;
  const theme = useTheme();
  const { propsForPerformance } = useEncoreMediaPlaybackHoverProps();
  const playProps = propsForPerformance(p, { songTitle });
  const url = performanceVideoOpenUrl(p);
  const cardDropEnabled = Boolean(googleAccessToken && onAddVideoToPerformance);

  const { dragActive, handlers, reset } = useDragDropHighlight({
    disabled: !cardDropEnabled,
    stopPropagation: true,
    onDrop: (e) => {
      if (!cardDropEnabled) return;
      const video = Array.from(e.dataTransfer.files).find((f) => fileMatchesAccept(f, PERF_LOCAL_VIDEO_ACCEPT));
      if (video) onAddVideoToPerformance?.(p, video);
    },
  });

  const onDragEnter = (e: DragEvent<HTMLElement>) => {
    if (!cardDropEnabled || !dataTransferHasPerformanceVideoFile(e.dataTransfer)) return;
    handlers.onDragEnter(e);
  };
  const onDragOver = (e: DragEvent<HTMLElement>) => {
    if (!cardDropEnabled || !dataTransferHasPerformanceVideoFile(e.dataTransfer)) return;
    handlers.onDragOver(e);
    try {
      e.dataTransfer.dropEffect = 'copy';
    } catch {
      /* non-fatal */
    }
  };
  const onDragLeave = (e: DragEvent<HTMLElement>) => handlers.onDragLeave(e);
  const onDrop = (e: DragEvent<HTMLElement>) => {
    handlers.onDrop(e);
    reset();
  };

  return (
    <Box
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      sx={{
        ...encorePerformanceVideoPanelSx(theme, { isPrimary: false }),
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 120,
        outline: dragActive ? '1px dashed' : 'none',
        outlineColor: dragActive ? alpha(theme.palette.primary.main, 0.32) : undefined,
        outlineOffset: dragActive ? -1 : undefined,
        bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.035) : undefined,
        transition: theme.transitions.create(['box-shadow', 'border-color', 'background-color'], {
          duration: 200,
        }),
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.24),
          boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.05)}`,
        },
      }}
    >
      <PerformanceVideoThumb
        performance={p}
        fluid
        alt={url ? `Video thumbnail for performance on ${p.date}` : `Performance on ${p.date}`}
        googleAccessToken={googleAccessToken}
      />
      <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" useFlexGap>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {p.date}
        </Typography>
        <PerformanceExtraVideosChip
          performance={p}
          googleAccessToken={googleAccessToken}
          songTitle={songTitle}
          onSetPrimaryVideo={onSetPrimaryVideo}
        />
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {p.venueTag?.trim() || 'Venue'}
      </Typography>
      {p.notes ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
          {p.notes.length > 140 ? `${p.notes.slice(0, 140)}…` : p.notes}
        </Typography>
      ) : null}
      <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center" sx={{ mt: 'auto', pt: 0.5 }}>
        <PerformanceMediaActions performance={p} playProps={playProps} />
        <Button
          size="small"
          variant="text"
          startIcon={<EditIcon sx={{ fontSize: 16 }} />}
          onClick={() => onEditPerformance(p)}
        >
          Edit
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * The "Performances" tab body for SongPage. Renders the venue filter, the
 * performance card grid, and the per-card actions (Play / Open / Edit). State
 * (selected venue, currently-edited performance) lives in the parent SongPage.
 */
export function SongPerformancesPanel(props: SongPerformancesPanelProps): ReactElement {
  const {
    performances,
    filteredPerformances,
    venueBreakdown,
    venueFilter,
    songTitle,
    googleAccessToken,
    onSelectVenueFilter,
    onAddPerformance,
    onEditPerformance,
    onAddVideoToPerformance,
    onSetPrimaryVideo,
  } = props;
  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
          {performances.length > 0 ? (
            <Chip size="small" label={`${performances.length} logged`} variant="outlined" sx={{ fontWeight: 600 }} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              None yet.
            </Typography>
          )}
        </Stack>
        <Button size="small" variant="contained" startIcon={<EventNoteIcon />} onClick={onAddPerformance}>
          Add performance
        </Button>
      </Stack>
      {venueBreakdown.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: 2, alignItems: 'center' }}>
          <Chip
            size="small"
            label="All venues"
            onClick={() => onSelectVenueFilter(null)}
            color={venueFilter == null ? 'primary' : 'default'}
            variant={venueFilter == null ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
          {venueBreakdown.map(([venue, n]) => (
            <Chip
              key={venue}
              size="small"
              label={`${venue} (${n})`}
              onClick={() => onSelectVenueFilter(venue)}
              color={venueFilter === venue ? 'primary' : 'default'}
              variant={venueFilter === venue ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      ) : null}
      {performances.length > 0 ? (
        filteredPerformances.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            None yet at this venue.
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {filteredPerformances.map((p) => (
              <PerformanceCard
                key={p.id}
                performance={p}
                songTitle={songTitle}
                googleAccessToken={googleAccessToken}
                onEditPerformance={onEditPerformance}
                onAddVideoToPerformance={onAddVideoToPerformance}
                onSetPrimaryVideo={onSetPrimaryVideo}
              />
            ))}
          </Box>
        )
      ) : null}
    </>
  );
}
