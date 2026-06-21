import QueueMusicOutlinedIcon from '@mui/icons-material/QueueMusicOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';

/** Compact queue indicator for multi-item Encore playback. */
export function EncoreMediaPlaybackQueueChip(): ReactElement | null {
  const { playbackQueue } = useEncoreMediaPlayback();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!playbackQueue || playbackQueue.items.length <= 1) return null;

  const current = playbackQueue.index + 1;
  const total = playbackQueue.items.length;

  return (
    <>
      <Button
        size="small"
        variant="text"
        className="encore-media-playback-queue-btn"
        aria-label={`Playback queue, item ${current} of ${total}`}
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={<QueueMusicOutlinedIcon sx={{ fontSize: 16 }} />}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          color: 'text.secondary',
          minWidth: 0,
          px: 1,
        }}
      >
        {current} / {total}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { width: 280, maxWidth: '92vw', p: 1.5 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
          Queue
        </Typography>
        <Stack component="ul" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 240, overflow: 'auto' }}>
          {playbackQueue.items.map((item, index) => {
            const active = index === playbackQueue.index;
            return (
              <Box
                component="li"
                key={item.playbackId}
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: active ? 'action.selected' : 'transparent',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: active ? 700 : 500 }} noWrap>
                  {item.title.trim() || 'Untitled'}
                </Typography>
                {item.subtitle?.trim() ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.subtitle}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      </Popover>
    </>
  );
}
