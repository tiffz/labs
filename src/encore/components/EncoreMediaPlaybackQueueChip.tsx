import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import QueueMusicOutlinedIcon from '@mui/icons-material/QueueMusicOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';
import type { EncoreMediaPlaybackTarget } from '../media/encorePlayableMedia';
import {
  encoreMediaQueueTakeHint,
} from '../media/encoreMediaQueueDisplay';
import { formatEncorePlaybackClock } from '../media/formatEncorePlaybackClock';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';

function formatQueueDuration(
  playbackId: string,
  knownDurationSec: (id: string) => number | undefined,
): string | null {
  const sec = knownDurationSec(playbackId);
  if (!sec || sec <= 0) return null;
  return formatEncorePlaybackClock(sec);
}

function QueueRowDuration({
  playbackId,
  knownDurationSec,
}: {
  playbackId: string;
  knownDurationSec: (id: string) => number | undefined;
}): ReactElement | null {
  const label = formatQueueDuration(playbackId, knownDurationSec);
  if (!label) return null;
  return (
    <Typography
      component="span"
      variant="caption"
      className="encore-media-playback-queue__row-duration"
      aria-label={`Duration ${label}`}
    >
      {label}
    </Typography>
  );
}

function QueueRow({
  item,
  index,
  isActive,
  knownDurationSec,
  onSelect,
}: {
  item: EncoreMediaPlaybackTarget;
  index: number;
  isActive: boolean;
  knownDurationSec: (id: string) => number | undefined;
  onSelect: (index: number) => void;
}): ReactElement {
  const title = item.title.trim() || 'Untitled';
  const takeHint = encoreMediaQueueTakeHint(item.subtitle, title);

  return (
    <ListItemButton
      selected={isActive}
      className="encore-media-playback-queue__row"
      onClick={() => onSelect(index)}
    >
      <ListItemIcon className="encore-media-playback-queue__row-icon" aria-hidden={!isActive}>
        {isActive ? <GraphicEqIcon fontSize="small" /> : null}
      </ListItemIcon>
      <ListItemText
        primary={title}
        secondary={takeHint ?? undefined}
        primaryTypographyProps={{
          noWrap: true,
          className: 'encore-media-playback-queue__row-title',
        }}
        secondaryTypographyProps={{
          noWrap: true,
          className: 'encore-media-playback-queue__row-meta',
        }}
      />
      <QueueRowDuration playbackId={item.playbackId} knownDurationSec={knownDurationSec} />
    </ListItemButton>
  );
}

/** Compact queue indicator for multi-item Encore playback. */
export function EncoreMediaPlaybackQueueChip(): ReactElement | null {
  const { playbackQueue, knownPlaybackDurationSec, playQueueAtIndex } = useEncoreMediaPlayback();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!playbackQueue || playbackQueue.items.length <= 1) return null;

  const current = playbackQueue.index + 1;
  const total = playbackQueue.items.length;

  const handleSelect = (index: number) => {
    playQueueAtIndex(index);
    setAnchorEl(null);
  };

  return (
    <>
      <Box className="encore-media-playback-queue-trigger">
        <IconButton
          size="small"
          className="encore-media-playback-queue-btn"
          aria-label={`Playback queue, item ${current} of ${total}`}
          aria-haspopup="true"
          aria-expanded={anchorEl ? 'true' : undefined}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <QueueMusicOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography
          component="span"
          className="encore-media-playback-queue-counter"
          aria-hidden
        >
          {current}/{total}
        </Typography>
      </Box>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            className: 'encore-media-playback-queue-popover',
            elevation: 3,
          },
        }}
      >
        <Box className="encore-media-playback-queue">
          <Box className="encore-media-playback-queue__header">
            <Typography component="h2" variant="subtitle2" className="encore-media-playback-queue__title">
              Queue
            </Typography>
            <Typography component="span" variant="caption" className="encore-media-playback-queue__count">
              {current} of {total}
            </Typography>
          </Box>
          <List
            dense
            disablePadding
            className="encore-media-playback-queue__list"
            aria-label="Playback queue"
          >
            {playbackQueue.items.map((item, index) => (
              <QueueRow
                key={item.playbackId}
                item={item}
                index={index}
                isActive={index === playbackQueue.index}
                knownDurationSec={knownPlaybackDurationSec}
                onSelect={handleSelect}
              />
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}
