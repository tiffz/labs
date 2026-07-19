import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import type { EncoreHoverCardPlayProps } from '../../media/encoreMediaPlaybackTargets';
import { performanceVideoOpenLabel, performanceVideoOpenUrl } from '../../utils/performanceVideoUrl';
import type { EncorePerformance } from '../../types';

export type PerformanceMediaActionsProps = {
  performance: EncorePerformance;
  playProps: EncoreHoverCardPlayProps;
  /** When true, render Play as a full button; otherwise icon-only beside Open. */
  compact?: boolean;
  /** When true, omit the play control (e.g. play is on the thumbnail overlay). */
  hidePlay?: boolean;
};

export function PerformanceMediaActions(props: PerformanceMediaActionsProps): ReactElement | null {
  const { performance, playProps, compact = false, hidePlay = false } = props;
  const openUrl = performanceVideoOpenUrl(performance);
  const openLabel = performanceVideoOpenLabel(performance);
  const canPlay = Boolean(playProps.onPlay) && !hidePlay;
  if (!canPlay && !openUrl) return null;

  if (compact) {
    return (
      <Stack direction="row" spacing={0.5} sx={{
        alignItems: "center"
      }}>
        {canPlay ? (
          <Tooltip title={playProps.playDisabledReason ?? (playProps.isPlaying ? 'Pause' : 'Play')}>
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={playProps.playDisabled}
                aria-label={playProps.isPlaying ? 'Pause performance video' : 'Play performance video'}
                onClick={playProps.onPlay}
              >
                <PlayArrowIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        {openUrl ? (
          <Tooltip title={openLabel ?? 'Open video'}>
            <IconButton
              size="small"
              component="a"
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={openLabel ?? 'Open performance video externally'}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 0.75
      }}>
      {canPlay ? (
        <Tooltip title={playProps.playDisabledReason ?? ''}>
          <span>
            <Button
              size="small"
              variant="contained"
              disabled={playProps.playDisabled}
              startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
              onClick={playProps.onPlay}
            >
              {playProps.isPlaying ? 'Pause' : 'Play'}
            </Button>
          </span>
        </Tooltip>
      ) : null}
      {openUrl ? (
        <Button
          size="small"
          variant="outlined"
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
        >
          Open
        </Button>
      ) : null}
    </Stack>
  );
}
