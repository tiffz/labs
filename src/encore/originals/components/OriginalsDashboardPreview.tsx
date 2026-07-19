import CheckIcon from '@mui/icons-material/Check';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import LibraryMusicOutlinedIcon from '@mui/icons-material/LibraryMusicOutlined';
import LyricsOutlinedIcon from '@mui/icons-material/LyricsOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useState, type ReactElement } from 'react';
import { copyTextToClipboard } from '../originalsChartClipboard';
import { originalsDashboardPreviewActionButtonSx } from '../originalsDashboardUi';
import { originalTakeDisplayName } from '../originalsTakeDisplay';
import type { OriginalAudioTake } from '../types';

export type OriginalsDashboardPreviewProps = {
  lyrics: string;
  chordChart: string;
  playbackTake: OriginalAudioTake | null;
  isPreferredTake: boolean;
  canPlay: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  playbackError: string | null;
  downloadDisabled: boolean;
  downloadDisabledReason?: string;
  onPlayToggle: () => void;
  onDownload: () => void;
};

/** Unified listen + copy toolbar for the song dashboard preview band. */
export function OriginalsDashboardPreview({
  lyrics,
  chordChart,
  playbackTake,
  isPreferredTake,
  canPlay,
  isPlaying,
  isLoading,
  playbackError,
  downloadDisabled,
  downloadDisabledReason,
  onPlayToggle,
  onDownload,
}: OriginalsDashboardPreviewProps): ReactElement {
  const theme = useTheme();
  const actionSx = originalsDashboardPreviewActionButtonSx();
  const [copied, setCopied] = useState<'lyrics' | 'chart' | null>(null);
  const hasCopy = Boolean(lyrics || chordChart);
  const hasPlayback = Boolean(playbackTake);

  const onCopy = async (kind: 'lyrics' | 'chart', text: string) => {
    await copyTextToClipboard(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: 1.25, md: 2 }}
      useFlexGap
      className="encore-originals-dashboard-preview"
      sx={{
        alignItems: { xs: 'stretch', md: 'center' }
      }}
    >
      {hasPlayback && playbackTake ? (
        <Stack
          direction="row"
          spacing={1.25}
          useFlexGap
          sx={{
            alignItems: "center",
            flex: { md: '1 1 auto' },
            minWidth: 0
          }}>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              alignItems: "center",
              flexShrink: 0
            }}>
            {canPlay ? (
              <Button
                variant="outlined"
                size="small"
                onClick={onPlayToggle}
                disabled={isLoading}
                startIcon={
                  isLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : isPlaying ? (
                    <StopCircleOutlinedIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <HeadphonesOutlinedIcon sx={{ fontSize: 18 }} />
                  )
                }
                sx={actionSx}
              >
                {isLoading ? 'Loading…' : isPlaying ? 'Stop' : 'Listen'}
              </Button>
            ) : (
              <Button
                variant="outlined"
                size="small"
                disabled
                startIcon={<HeadphonesOutlinedIcon sx={{ fontSize: 18 }} />}
                sx={actionSx}
              >
                Listen
              </Button>
            )}
            <Tooltip title={downloadDisabledReason ?? 'Download demo take'}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={downloadDisabled}
                  aria-label="Download demo take"
                  onClick={onDownload}
                  sx={{ ...actionSx, minWidth: 32, px: 0.75 }}
                >
                  <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
                </Button>
              </span>
            </Tooltip>
          </Stack>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700, lineHeight: 1.35 }}>
              {originalTakeDisplayName(playbackTake.label)}
            </Typography>
            <Typography
              variant="caption"
              color={playbackError ? 'error' : 'text.secondary'}
              sx={{ display: 'block', lineHeight: 1.35 }}
            >
              {playbackError ?? (isPreferredTake ? 'Preferred demo' : 'Demo take')}
            </Typography>
          </Box>
        </Stack>
      ) : null}
      {hasPlayback && hasCopy ? (
        <Divider
          flexItem
          orientation="vertical"
          sx={{
            display: { xs: 'none', md: 'block' },
            borderColor: theme.palette.divider,
            alignSelf: 'stretch',
            my: 0.25,
          }}
        />
      ) : null}
      {hasPlayback && hasCopy ? (
        <Divider sx={{ display: { xs: 'block', md: 'none' }, borderColor: 'divider' }} />
      ) : null}
      {hasCopy ? (
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            flexShrink: 0,
            ml: { md: hasPlayback ? 'auto' : 0 }
          }}>
          {lyrics ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={
                copied === 'lyrics' ? (
                  <CheckIcon sx={{ fontSize: 16 }} aria-hidden />
                ) : (
                  <LyricsOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
                )
              }
              aria-label="Copy lyrics"
              onClick={() => void onCopy('lyrics', lyrics)}
              sx={actionSx}
            >
              {copied === 'lyrics' ? 'Copied' : 'Copy lyrics'}
            </Button>
          ) : null}
          {chordChart ? (
            <Button
              size="small"
              variant="outlined"
              startIcon={
                copied === 'chart' ? (
                  <CheckIcon sx={{ fontSize: 16 }} aria-hidden />
                ) : (
                  <LibraryMusicOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
                )
              }
              aria-label="Copy chart"
              onClick={() => void onCopy('chart', chordChart)}
              sx={actionSx}
            >
              {copied === 'chart' ? 'Copied' : 'Copy chart'}
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
