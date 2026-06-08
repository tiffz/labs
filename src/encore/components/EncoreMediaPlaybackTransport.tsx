import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import AppSlider from '../../shared/components/AppSlider';
import AppTooltip from '../../shared/components/AppTooltip';
import { formatEncorePlaybackClock } from '../media/formatEncorePlaybackClock';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';

export function EncoreMediaPlaybackTransport(): ReactElement {
  const {
    phase,
    transport,
    seekTo,
    seekToStart,
    seekToEnd,
    togglePlayPause,
  } = useEncoreMediaPlayback();

  const disabled = phase !== 'playing';
  const { currentTime, duration, isPlaying } = transport;
  const hasDuration = duration > 0;
  const scrubMax = hasDuration ? duration : 1;
  const scrubValue = hasDuration ? Math.min(currentTime, duration) : 0;

  return (
    <Box className="encore-media-playback-transport" role="group" aria-label="Playback transport">
      <Box className="encore-media-playback-chip">
        <AppTooltip title="Skip to start">
          <span>
            <IconButton
              size="small"
              className="encore-media-playback-chip-btn"
              aria-label="Skip to start"
              disabled={disabled || !hasDuration}
              onClick={seekToStart}
            >
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
          </span>
        </AppTooltip>
        <AppTooltip title={isPlaying ? 'Pause' : 'Play'}>
          <span>
            <IconButton
              size="small"
              className="encore-media-playback-chip-btn encore-media-playback-chip-btn--play"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={disabled}
              onClick={togglePlayPause}
            >
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </span>
        </AppTooltip>
        <AppTooltip title="Skip to end">
          <span>
            <IconButton
              size="small"
              className="encore-media-playback-chip-btn"
              aria-label="Skip to end"
              disabled={disabled || !hasDuration}
              onClick={seekToEnd}
            >
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </span>
        </AppTooltip>
        <span className="encore-media-playback-chip-divider" aria-hidden />
        <Typography component="span" className="encore-media-playback-time" aria-live="off">
          {formatEncorePlaybackClock(currentTime)} / {formatEncorePlaybackClock(duration)}
        </Typography>
      </Box>
      <Box className="encore-media-playback-scrub-wrap">
        <AppSlider
          className="encore-media-playback-scrub app-slider--compact"
          min={0}
          max={scrubMax}
          step={0.1}
          value={scrubValue}
          disabled={disabled || !hasDuration}
          aria-label="Playback position"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) seekTo(next);
          }}
        />
      </Box>
    </Box>
  );
}
