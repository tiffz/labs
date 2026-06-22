import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { memo, useCallback, useMemo, type ReactElement } from 'react';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { EncoreTimeSignatureChip } from '../../ui/EncoreTimeSignatureChip';
import { InlineChipDate } from '../../ui/InlineEditChip';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import { useOriginalTakePlayable } from '../hooks/useOriginalTakePlayable';
import {
  originalsDashboardPanelPaperSx,
  originalsDashboardPreviewBandSx,
  originalsDashboardSectionDividerSx,
} from '../originalsDashboardUi';
import { originalsLyricsChartTexts } from '../originalsLyricsChartTexts';
import { navigateToOriginalFromLibrary, navigateToOriginalStageEdit } from '../originalsLibraryNavigation';
import { originalsLibraryStageChipSx, originalsSongMetaChipRowSx } from '../originalsLibraryUi';
import { buildOriginalSongDashboardStatus } from '../originalsSongDashboardStatus';
import { inferredWorkflowStage, isOriginalDemoReady } from '../originalsWorkflowCompletion';
import { workflowStageShortLabel } from '../originalsWorkflowStages';
import { originalTakeBlobKey } from '../originalTakeLocalAudio';
import { originalSongStartedDate, originalSongTimeSignature, type EncoreOriginalSong, type OriginalAudioTake } from '../types';
import { OriginalsDashboardPreview } from './OriginalsDashboardPreview';
import { OriginalsDashboardSection } from './OriginalsDashboardSection';
import { OriginalsLyricsChartPanel } from './OriginalsLyricsChartPanel';
import { OriginalsWorkflowStepper } from './OriginalsWorkflowStepper';
import { OriginalsSongFilesPanel } from './OriginalsSongFilesPanel';

export type OriginalsSongDashboardPanelProps = {
  song: EncoreOriginalSong;
  listActive: boolean;
  onSaveSong: (song: EncoreOriginalSong) => void;
};

export const OriginalsSongDashboardPanel = memo(function OriginalsSongDashboardPanel({
  song,
  listActive,
  onSaveSong,
}: OriginalsSongDashboardPanelProps): ReactElement {
  const theme = useTheme();
  const { googleAccessToken } = useEncoreAuth();
  const status = useMemo(() => buildOriginalSongDashboardStatus(song), [song]);
  const demoReady = isOriginalDemoReady(song);
  const activeStage = inferredWorkflowStage(song);
  const chartTexts = useMemo(() => originalsLyricsChartTexts(song.lyricsAndChords), [song.lyricsAndChords]);
  const hasLyricsSection = Boolean(chartTexts.lyrics || chartTexts.chordChart);

  const { playbackTake, canPlayPlaybackTake } = useOriginalTakePlayable(song, listActive);
  const showPreviewBand = listActive && (hasLyricsSection || Boolean(playbackTake));
  const { playTake, stopPlayback, isPlayingTake, isLoadingTake, phase, errorMessage, target } =
    useEncoreOriginalsPlayback();

  const preferredIsPlaying = playbackTake ? isPlayingTake(song.id, playbackTake.id) : false;
  const preferredIsLoading = playbackTake ? isLoadingTake(song.id, playbackTake.id) : false;
  const playbackErrorForPreferred =
    playbackTake &&
    target?.playbackId === `original-take:${song.id}:${playbackTake.id}` &&
    phase === 'error'
      ? errorMessage
      : null;

  const downloadTarget = playbackTake ? encoreResourceDownloadTargetFromTake(playbackTake) : null;
  const downloadGate = encoreResourceDownloadDisabled(
    { driveFileId: playbackTake?.driveFileId },
    googleAccessToken,
  );

  const patchSong = useCallback(
    (patch: Partial<EncoreOriginalSong>) => onSaveSong({ ...song, ...patch }),
    [onSaveSong, song],
  );

  const onSongChange = useCallback(
    (next: EncoreOriginalSong) => {
      onSaveSong(next);
    },
    [onSaveSong],
  );

  const playOriginalTake = useCallback(
    (take: OriginalAudioTake) => {
      playTake({
        songId: song.id,
        songTitle: song.title,
        takeId: take.id,
        takeLabel: take.label,
        driveFileId: take.driveFileId,
        localTakeKey: originalTakeBlobKey(song.id, take.id),
        mimeType: take.mimeType,
      });
    },
    [playTake, song.id, song.title],
  );

  const onPreferredPlayClick = () => {
    if (!playbackTake || !canPlayPlaybackTake) return;
    if (preferredIsPlaying) stopPlayback();
    else playOriginalTake(playbackTake);
  };

  const primaryLabel = demoReady
    ? 'Open song'
    : `Continue · ${workflowStageShortLabel(activeStage)}`;
  const PrimaryIcon = demoReady ? OpenInNewIcon : ArrowForwardIcon;

  return (
    <Paper
      component="section"
      elevation={0}
      aria-label={`${song.title.trim() || 'Untitled'} dashboard`}
      sx={originalsDashboardPanelPaperSx(theme)}
    >
      <Stack spacing={2.25} divider={<Divider sx={originalsDashboardSectionDividerSx(theme)} />}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
            Original
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            justifyContent="space-between"
            gap={1.5}
            sx={{ mt: 0.5 }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <TextField
                value={song.title}
                onChange={(e) => patchSong({ title: e.target.value })}
                placeholder="Untitled original"
                variant="standard"
                fullWidth
                InputProps={{ disableUnderline: true }}
                inputProps={{
                  'aria-label': 'Song title',
                  style: {
                    fontSize: '1.375rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    padding: 0,
                    lineHeight: 1.2,
                  },
                }}
                sx={{ '& .MuiInput-root': { fontSize: 'inherit' } }}
              />
              <Stack
                direction="row"
                flexWrap="wrap"
                alignItems="center"
                gap={0.75}
                useFlexGap
                sx={{ ...originalsSongMetaChipRowSx(), mt: 1 }}
              >
                {demoReady ? (
                  <Chip
                    size="small"
                    label="Demo ready"
                    variant="outlined"
                    sx={{ ...originalsLibraryStageChipSx(true, theme), height: 28 }}
                  />
                ) : null}
                <EncoreKeyChip
                  value={song.key}
                  placeholder="Set key"
                  displayMode="compact"
                  onChange={(next) => patchSong({ key: next })}
                />
                <EncoreTimeSignatureChip
                  value={originalSongTimeSignature(song)}
                  onChange={(next) => patchSong({ timeSignature: next })}
                />
                <EncoreBpmChip value={song.tempo} onChange={(next) => patchSong({ tempo: next })} />
              </Stack>
            </Box>
            <Button
              variant="contained"
              size="medium"
              endIcon={<PrimaryIcon sx={{ fontSize: 18 }} />}
              onClick={() =>
                demoReady
                  ? navigateToOriginalFromLibrary(song)
                  : navigateToOriginalStageEdit(song.id, activeStage)
              }
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                flexShrink: 0,
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                px: 2,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              }}
            >
              {primaryLabel}
            </Button>
          </Stack>
        </Box>

        {showPreviewBand ? (
          <OriginalsDashboardSection title="Preview">
            <Box sx={originalsDashboardPreviewBandSx(theme)}>
              <OriginalsDashboardPreview
                lyrics={chartTexts.lyrics}
                chordChart={chartTexts.chordChart}
                playbackTake={playbackTake}
                isPreferredTake={song.mainTakeId === playbackTake?.id}
                canPlay={canPlayPlaybackTake}
                isPlaying={preferredIsPlaying}
                isLoading={preferredIsLoading}
                playbackError={playbackErrorForPreferred}
                downloadDisabled={downloadGate.disabled}
                downloadDisabledReason={downloadGate.reason}
                onPlayToggle={onPreferredPlayClick}
                onDownload={() => {
                  if (downloadTarget) {
                    void triggerEncoreResourceDownload(downloadTarget, googleAccessToken);
                  }
                }}
              />
            </Box>
          </OriginalsDashboardSection>
        ) : null}

        <OriginalsDashboardSection title="Workflow">
          <Box className="encore-originals-dashboard-workflow">
            <OriginalsWorkflowStepper
            song={song}
            stage={activeStage}
            highlightNextIncomplete
            onStageChange={(stage) => navigateToOriginalStageEdit(song.id, stage)}
            />
          </Box>
        </OriginalsDashboardSection>

        <OriginalsDashboardSection title="Dates">
          <Stack direction="row" flexWrap="wrap" spacing={0.75} useFlexGap alignItems="center">
            <InlineChipDate
              value={song.startedAt ?? originalSongStartedDate(song)}
              placeholder="Started writing"
              onChange={(next) => patchSong({ startedAt: next ?? undefined })}
            />
            <Chip
              size="small"
              label={`Updated ${status.updatedLabel}`}
              variant="outlined"
              sx={{ height: 28, borderColor: 'divider' }}
            />
          </Stack>
          {status.updatedBeforeStarted ? (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'warning.main', mt: 0.75 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
              <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.45 }}>
                Updated before started date — worth a quick check.
              </Typography>
            </Stack>
          ) : null}
        </OriginalsDashboardSection>

        <OriginalsDashboardSection title="Song files">
          {listActive ? (
            <OriginalsSongFilesPanel
              song={song}
              onChange={onSongChange}
              onOpenBrainstorm={() => navigateToOriginalStageEdit(song.id, 'brainstorm')}
            />
          ) : null}
        </OriginalsDashboardSection>

        {hasLyricsSection ? (
          <OriginalsDashboardSection title="Lyrics & chart">
            <OriginalsLyricsChartPanel
              lyricsAndChords={song.lyricsAndChords}
              songId={song.id}
              songKey={song.key}
              tempo={song.tempo}
              compactPlayback
              embedded
            />
          </OriginalsDashboardSection>
        ) : null}
      </Stack>
    </Paper>
  );
});
