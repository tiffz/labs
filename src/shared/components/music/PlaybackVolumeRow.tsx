import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import type { SliderProps } from '@mui/material/Slider';
import AppLinearVolumeSlider from '../AppLinearVolumeSlider';

export type PlaybackVolumeRowProps = {
  label: string;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMutedChange: (muted: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
  sliderColor?: SliderProps['color'];
  'aria-label'?: string;
};

export function PlaybackVolumeRow({
  label,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  disabled = false,
  compact = false,
  sliderColor = 'primary',
  'aria-label': ariaLabel,
}: PlaybackVolumeRowProps): ReactElement {
  const gain = Math.max(0, Math.min(1, volume / 100));

  return (
    <Box
      className={['shared-playback-volume-row', compact ? 'shared-playback-volume-row--compact' : '']
        .filter(Boolean)
        .join(' ')}
      sx={{ display: 'flex', alignItems: 'center', gap: compact ? 0.75 : 1, minHeight: compact ? 24 : 28 }}
    >
      <Tooltip title={muted ? `Unmute ${label.toLowerCase()}` : `Mute ${label.toLowerCase()}`}>
        <IconButton
          size="small"
          aria-label={muted ? `Unmute ${label.toLowerCase()}` : `Mute ${label.toLowerCase()}`}
          disabled={disabled}
          onClick={() => onMutedChange(!muted)}
          sx={{ p: 0.35, alignSelf: 'center', flexShrink: 0, color: 'text.secondary' }}
        >
          {muted ? (
            <VolumeOffOutlinedIcon sx={{ fontSize: 18 }} />
          ) : (
            <VolumeUpOutlinedIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      </Tooltip>
      <Typography
        component="span"
        variant="caption"
        noWrap
        sx={{
          fontWeight: 600,
          flex: '0 0 auto',
          minWidth: compact ? '3rem' : '4.25rem',
          color: 'text.secondary',
          fontSize: compact ? '0.6875rem' : undefined,
        }}
      >
        {label}
      </Typography>
      <AppLinearVolumeSlider
        value={gain}
        disabled={disabled}
        color={sliderColor}
        aria-label={ariaLabel ?? `${label} volume`}
        onChange={(_, next) => onVolumeChange(Math.round((next as number) * 100))}
        sx={{
          alignSelf: 'center',
          opacity: muted || disabled ? 0.42 : 1,
          transition: 'opacity 0.15s ease',
        }}
      />
    </Box>
  );
}
