import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { memo, useCallback, type MouseEvent, type ReactElement } from 'react';
import { chordProLyricSnippet } from '../../../shared/music/chordPro/chordProText';
import AppTooltip from '../../../shared/components/AppTooltip';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { HighlightedText } from '../../ui/HighlightedText';
import { encoreHairline } from '../../theme/encoreUiTokens';
import { useOriginalTakePlayable } from '../hooks/useOriginalTakePlayable';
import { navigateToOriginalFromLibrary } from '../originalsLibraryNavigation';
import { isOriginalDemoReady, originalsLibraryStageLabel, originalsLibraryStageProgressDetail } from '../originalsWorkflowCompletion';
import { originalsLibraryStageChipSx } from '../originalsLibraryUi';
import type { EncoreOriginalSong } from '../types';

export type OriginalsGridTakePlaybackState = 'idle' | 'loading' | 'playing' | 'error';

export type OriginalsLibraryGridCardProps = {
  song: EncoreOriginalSong;
  search: string;
  selected: boolean;
  listActive: boolean;
  takePlayback: OriginalsGridTakePlaybackState;
  onToggleSelect: (songId: string) => void;
  onSaveSong: (song: EncoreOriginalSong) => void;
  onPlayTake: (song: EncoreOriginalSong) => void;
  onStopTake: () => void;
};

export const OriginalsLibraryGridCard = memo(function OriginalsLibraryGridCard({
  song,
  search,
  selected,
  listActive,
  takePlayback,
  onToggleSelect,
  onSaveSong,
  onPlayTake,
  onStopTake,
}: OriginalsLibraryGridCardProps): ReactElement {
  const theme = useTheme();
  const { googleAccessToken } = useEncoreAuth();
  const { playbackTake, canPlayPlaybackTake } = useOriginalTakePlayable(song, listActive);
  const title = song.title.trim() || 'Untitled';
  const demoReady = isOriginalDemoReady(song);
  const stageLabel = originalsLibraryStageLabel(song);
  const stageProgress = originalsLibraryStageProgressDetail(song);
  const stageChipLabel = stageProgress ? `${stageLabel} · ${stageProgress}` : stageLabel;
  const lyricSnippet = chordProLyricSnippet(song.lyricsAndChords, 96);
  const isPlaying = takePlayback === 'playing';
  const isLoading = takePlayback === 'loading';

  const patchSong = useCallback(
    (patch: Partial<EncoreOriginalSong>) => onSaveSong({ ...song, ...patch }),
    [onSaveSong, song],
  );

  const onPlayClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!playbackTake || !canPlayPlaybackTake) return;
      if (isPlaying) onStopTake();
      else onPlayTake(song);
    },
    [canPlayPlaybackTake, isPlaying, onPlayTake, onStopTake, playbackTake, song],
  );

  const onDownloadClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!playbackTake) return;
      const target = encoreResourceDownloadTargetFromTake(playbackTake);
      if (target) void triggerEncoreResourceDownload(target, googleAccessToken);
    },
    [googleAccessToken, playbackTake],
  );

  const downloadGate = playbackTake
    ? encoreResourceDownloadDisabled({ driveFileId: playbackTake.driveFileId }, googleAccessToken)
    : { disabled: true, reason: 'No demo take' };

  const openSong = useCallback(() => navigateToOriginalFromLibrary(song), [song]);

  return (
    <Card
      elevation={0}
      onClick={openSong}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        border: 1,
        borderColor: selected ? 'primary.main' : encoreHairline,
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
        boxShadow: '0 1px 2px rgba(15, 15, 20, 0.04)',
        transition: (t) => t.transitions.create(['box-shadow', 'border-color'], { duration: 180 }),
        cursor: 'pointer',
        minHeight: 210,
        overflow: 'hidden',
        '&:hover': {
          borderColor: (t) => alpha(t.palette.primary.main, 0.28),
          boxShadow: '0 4px 16px rgba(15, 15, 20, 0.06)',
        },
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Chip
            size="small"
            label={stageChipLabel}
            variant="outlined"
            sx={{ ...originalsLibraryStageChipSx(demoReady, theme), maxWidth: 'calc(100% - 36px)' }}
          />
          <Checkbox
            size="small"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect(song.id)}
            sx={{ mt: -0.5, mr: -0.5, p: 0.25 }}
            inputProps={{ 'aria-label': `Select ${title}` }}
          />
        </Stack>
        <AppTooltip title={title}>
          <Box component="span" sx={{ display: 'block', mt: 1.25, mb: 1.25, minWidth: 0 }}>
            <HighlightedText
              text={title}
              highlight={search}
              variant="subtitle1"
              component="span"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            />
          </Box>
        </AppTooltip>
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          flexWrap="wrap"
          alignItems="center"
          onClick={(e) => e.stopPropagation()}
        >
          <EncoreKeyChip
            value={song.key}
            placeholder="Set key"
            displayMode="compact"
            onChange={(next) => patchSong({ key: next })}
          />
          <EncoreBpmChip value={song.tempo} onChange={(next) => patchSong({ tempo: next })} />
          {song.takes.length > 0 ? (
            <Chip
              size="small"
              label={`${song.takes.length} take${song.takes.length === 1 ? '' : 's'}`}
              variant="outlined"
              sx={{ height: 28 }}
            />
          ) : null}
        </Stack>
      </Box>

      {lyricSnippet ? (
        <Box sx={{ px: 2, pb: 1.5, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontStyle: 'italic',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {lyricSnippet}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}

      <Divider />
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ px: 1.5, py: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip
          title={
            !playbackTake
              ? 'Add a demo take in Record takes'
              : !canPlayPlaybackTake
                ? 'Sign in to Google or add local audio to play'
                : isPlaying
                  ? 'Stop demo'
                  : 'Play preferred demo'
          }
        >
          <span>
            <IconButton
              size="medium"
              disabled={!canPlayPlaybackTake || isLoading}
              aria-label={isPlaying ? 'Stop demo' : 'Play demo'}
              onClick={onPlayClick}
              sx={{ color: 'text.secondary' }}
            >
              {isLoading ? (
                <CircularProgress size={22} color="inherit" />
              ) : isPlaying ? (
                <StopIcon />
              ) : (
                <PlayArrowIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
        {playbackTake ? (
          <Tooltip title={downloadGate.reason ?? 'Download demo take'}>
            <span>
              <IconButton
                size="medium"
                disabled={downloadGate.disabled}
                aria-label="Download demo take"
                onClick={onDownloadClick}
                sx={{ color: 'text.secondary' }}
              >
                <FileDownloadOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Box sx={{ flex: 1 }} />
        {takePlayback === 'error' ? (
          <Typography variant="caption" color="error">
            Playback failed
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
});
