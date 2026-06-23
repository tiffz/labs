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
import { encorePerformanceDropHintSx, encorePerformanceListRowSx } from '../../theme/encoreUiTokens';
import { PERF_LOCAL_VIDEO_ACCEPT } from '../../utils/performanceVideoAccept';
import { PerformanceExtraVideosChip } from '../performance/PerformanceExtraVideosChip';
import { PerformanceMediaActions } from '../performance/PerformanceMediaActions';
import { PerformanceVideoPlayableThumb } from '../performance/PerformanceVideoPlayableThumb';
import { dataTransferHasPerformanceVideoFile } from './encoreDragPayload';

export type SongPerformancesCompactPanelProps = {
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

function CompactPerformanceRow(props: {
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
        position: 'relative',
        ...encorePerformanceListRowSx(theme, { dragActive }),
      }}
    >
      <PerformanceVideoPlayableThumb
        performance={p}
        width={72}
        alt={`Performance on ${p.date}`}
        googleAccessToken={googleAccessToken}
        playProps={playProps}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" useFlexGap>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}
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
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={p.venueTag}>
          {p.venueTag?.trim() || 'Venue'}
        </Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
        <PerformanceMediaActions performance={p} playProps={playProps} compact hidePlay />
        <Button
          size="small"
          variant="text"
          aria-label={`Edit performance on ${p.date}`}
          onClick={() => onEditPerformance(p)}
          sx={{ minWidth: 0, px: 0.75 }}
        >
          <EditIcon sx={{ fontSize: 18 }} />
        </Button>
      </Stack>
      {dragActive ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
            zIndex: 1,
          }}
        >
          <Typography variant="caption" sx={encorePerformanceDropHintSx(theme)}>
            Add video to this performance
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export function SongPerformancesCompactPanel(props: SongPerformancesCompactPanelProps): ReactElement {
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
        sx={{ mb: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {performances.length > 0 ? `${performances.length} logged` : 'None yet.'}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<EventNoteIcon sx={{ fontSize: 18 }} />}
          onClick={onAddPerformance}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Log performance
        </Button>
      </Stack>

      {venueBreakdown.length > 0 ? (
        <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap sx={{ mb: 1.5, alignItems: 'center' }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
            None yet at this venue.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {filteredPerformances.map((p) => (
              <CompactPerformanceRow
                key={p.id}
                performance={p}
                songTitle={songTitle}
                googleAccessToken={googleAccessToken}
                onEditPerformance={onEditPerformance}
                onAddVideoToPerformance={onAddVideoToPerformance}
                onSetPrimaryVideo={onSetPrimaryVideo}
              />
            ))}
          </Stack>
        )
      ) : null}
    </>
  );
}
