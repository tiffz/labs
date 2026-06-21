import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { useOriginalTakePlayable } from '../hooks/useOriginalTakePlayable';
import { originalsLibraryStageChipSx } from '../originalsLibraryUi';
import type { EncoreOriginalSong } from '../types';
import type { OriginalsGridTakePlaybackState } from './OriginalsLibraryGridCard';

export type OriginalsTablePlayCellProps = {
  song: EncoreOriginalSong;
  listActive: boolean;
  playback: OriginalsGridTakePlaybackState;
  onPlayTake: (song: EncoreOriginalSong) => void;
  onStopTake: () => void;
};

export function OriginalsTablePlayCell({
  song,
  listActive,
  playback,
  onPlayTake,
  onStopTake,
}: OriginalsTablePlayCellProps): ReactElement | null {
  const { playbackTake, canPlayPlaybackTake } = useOriginalTakePlayable(song, listActive);
  if (!playbackTake) return null;

  const isPlaying = playback === 'playing';
  const isLoading = playback === 'loading';

  return (
    <Tooltip
      title={
        !canPlayPlaybackTake
          ? 'Sign in to Google or add local audio to play'
          : isPlaying
            ? 'Stop demo'
            : 'Play preferred demo'
      }
    >
      <span>
        <IconButton
          size="small"
          disabled={!canPlayPlaybackTake || isLoading}
          aria-label={isPlaying ? 'Stop demo' : 'Play demo'}
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) onStopTake();
            else onPlayTake(song);
          }}
          sx={{ flexShrink: 0, p: 0.35, color: 'text.secondary' }}
        >
          {isLoading ? (
            <CircularProgress size={16} />
          ) : isPlaying ? (
            <StopIcon sx={{ fontSize: 18 }} />
          ) : (
            <PlayArrowIcon sx={{ fontSize: 20 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export type OriginalsTableStageCellProps = {
  label: string;
  progressDetail: string | null;
  demoReady: boolean;
};

export function OriginalsTableStageCell({
  label,
  progressDetail,
  demoReady,
}: OriginalsTableStageCellProps): ReactElement {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Chip
        size="small"
        label={label}
        variant="outlined"
        sx={(theme) => ({
          maxWidth: '100%',
          ...originalsLibraryStageChipSx(demoReady, theme),
          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
        })}
      />
      {progressDetail ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {progressDetail}
        </Typography>
      ) : null}
    </Stack>
  );
}

export type OriginalsTableTakesCellProps = {
  song: EncoreOriginalSong;
  listActive: boolean;
};

export function OriginalsTableTakesCell({ song, listActive }: OriginalsTableTakesCellProps): ReactElement {
  const { googleAccessToken } = useEncoreAuth();
  const { playbackTake } = useOriginalTakePlayable(song, listActive);
  const count = song.takes.length;
  const downloadGate = playbackTake
    ? encoreResourceDownloadDisabled({ driveFileId: playbackTake.driveFileId }, googleAccessToken)
    : { disabled: true, reason: 'No demo take' };

  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 16 }}>
        {count}
      </Typography>
      {playbackTake ? (
        <Tooltip title={downloadGate.reason ?? 'Download demo take'}>
          <span>
            <IconButton
              size="small"
              disabled={downloadGate.disabled}
              aria-label="Download demo take"
              onClick={(e) => {
                e.stopPropagation();
                const target = encoreResourceDownloadTargetFromTake(playbackTake);
                if (target) void triggerEncoreResourceDownload(target, googleAccessToken);
              }}
              sx={{ p: 0.25, color: 'text.secondary' }}
            >
              <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
