import EditIcon from '@mui/icons-material/Edit';
import EventNoteIcon from '@mui/icons-material/EventNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { EncorePerformance } from '../../types';
import { encoreRadius, encoreShadowSurface } from '../../theme/encoreUiTokens';
import { performanceVideoOpenUrl } from '../../utils/performanceVideoUrl';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';

export type SongPerformancesPanelProps = {
  performances: EncorePerformance[];
  filteredPerformances: EncorePerformance[];
  venueBreakdown: Array<[venue: string, count: number]>;
  venueFilter: string | null;
  googleAccessToken: string | null;
  onSelectVenueFilter: (venue: string | null) => void;
  onAddPerformance: () => void;
  onEditPerformance: (perf: EncorePerformance) => void;
};

/**
 * The "Performances" tab body for SongPage. Renders the venue filter, the
 * performance card grid, and the per-card actions (Open / Edit). State
 * (selected venue, currently-edited performance) lives in the parent SongPage.
 */
export function SongPerformancesPanel(props: SongPerformancesPanelProps): ReactElement {
  const {
    performances,
    filteredPerformances,
    venueBreakdown,
    venueFilter,
    googleAccessToken,
    onSelectVenueFilter,
    onAddPerformance,
    onEditPerformance,
  } = props;
  const theme = useTheme();
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
            <Chip
              size="small"
              label={`${performances.length} logged`}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              None yet.
            </Typography>
          )}
        </Stack>
        <Button
          size="small"
          variant="contained"
          startIcon={<EventNoteIcon />}
          onClick={onAddPerformance}
        >
          Add performance
        </Button>
      </Stack>
      {venueBreakdown.length > 0 ? (
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={0.75}
          useFlexGap
          sx={{ mb: 2, alignItems: 'center' }}
        >
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
            {filteredPerformances.map((p) => {
              const url = performanceVideoOpenUrl(p);
              return (
                <Box
                  key={p.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: encoreRadius,
                    p: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    minHeight: 120,
                    overflow: 'hidden',
                    transition: (t) =>
                      t.transitions.create(['box-shadow', 'border-color'], {
                        duration: 200,
                      }),
                    '&:hover': {
                      boxShadow: encoreShadowSurface,
                      borderColor: alpha(theme.palette.primary.main, 0.25),
                    },
                  }}
                >
                  <PerformanceVideoThumb
                    performance={p}
                    fluid
                    alt={
                      url
                        ? `Video thumbnail for performance on ${p.date}`
                        : `Performance on ${p.date}`
                    }
                    googleAccessToken={googleAccessToken}
                  />
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
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {p.venueTag?.trim() || 'Venue'}
                  </Typography>
                  {p.notes ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ lineHeight: 1.45 }}
                    >
                      {p.notes.length > 140 ? `${p.notes.slice(0, 140)}…` : p.notes}
                    </Typography>
                  ) : null}
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.75}
                    sx={{ mt: 'auto', pt: 0.5 }}
                  >
                    {url ? (
                      <Button
                        size="small"
                        variant="outlined"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      >
                        Open
                      </Button>
                    ) : null}
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
            })}
          </Box>
        )
      ) : null}
    </>
  );
}
