import CloseIcon from '@mui/icons-material/Close';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { originalTakeDisplayName } from '../originalsTakeDisplay';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';

export function EncoreOriginalsPlaybackBar(): ReactElement | null {
  const theme = useTheme();
  const { target, phase, errorMessage, objectUrl, audioRef, stopPlayback } = useEncoreOriginalsPlayback();

  if (!target) return null;

  const songTitle = target.songTitle.trim() || 'Untitled';
  const takeName = originalTakeDisplayName(target.takeLabel);
  const showControls = phase === 'playing' && Boolean(objectUrl);

  return (
    <Box className="encore-originals-playback-bar encore-originals-no-print">
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
          }}
          aria-hidden
        >
          {phase === 'loading' ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <GraphicEqIcon sx={{ fontSize: 18 }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {songTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {phase === 'loading'
              ? 'Loading demo…'
              : phase === 'error'
                ? errorMessage ?? 'Could not play'
                : takeName}
          </Typography>
        </Box>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- demo take audio */}
        <audio
          ref={audioRef}
          src={objectUrl ?? undefined}
          controls={showControls}
          className={
            showControls ? 'encore-originals-playback-bar-controls' : 'encore-originals-playback-audio-hidden'
          }
        />
        <Tooltip title="Stop">
          <IconButton size="small" aria-label="Stop playback" onClick={stopPlayback} sx={{ flexShrink: 0 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
