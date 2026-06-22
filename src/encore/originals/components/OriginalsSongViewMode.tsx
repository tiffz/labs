import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useCallback, useMemo, type ReactElement } from 'react';
import { parseChordProToChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import {
  estimateChartPlaybackDurationMs,
  formatChartPlaybackDuration,
} from '../../../shared/music/chordPro/chartPlaybackSequence';
import { EncoreBpmChip } from '../../ui/EncoreBpmChip';
import { EncoreKeyChip } from '../../ui/EncoreKeyChip';
import { EncoreTimeSignatureChip } from '../../ui/EncoreTimeSignatureChip';
import { InlineChipDate } from '../../ui/InlineEditChip';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromTake,
  triggerEncoreResourceDownload,
} from '../../drive/encoreResourceDownload';
import { encoreMaxWidthPage } from '../../theme/encoreUiTokens';
import { encorePageSectionGap } from '../../theme/encoreM3Layout';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import { useOriginalTakePlayable } from '../hooks/useOriginalTakePlayable';
import { originalsLyricsChartTexts } from '../originalsLyricsChartTexts';
import {
  formatOriginalStageSummary,
  inferredWorkflowStage,
  isOriginalDemoReady,
} from '../originalsWorkflowCompletion';
import { workflowStageShortLabel, type OriginalsWorkflowStage } from '../originalsWorkflowStages';
import { originalTakeBlobKey } from '../originalTakeLocalAudio';
import { originalSongStartedDate, originalSongTimeSignature, type EncoreOriginalSong, type OriginalAudioTake } from '../types';
import {
  originalsLibraryStageChipSx,
  originalsSongHeroPaperSx,
  originalsSongMetaChipRowSx,
} from '../originalsLibraryUi';
import { OriginalsCopyChartButtons } from './OriginalsCopyChartButtons';
import { OriginalsLyricsChartPanel } from './OriginalsLyricsChartPanel';
import { OriginalsSongListenCard } from './OriginalsSongListenCard';
import { OriginalsSongFilesPanel } from './OriginalsSongFilesPanel';
import { OriginalsViewSection } from './OriginalsViewSection';

export type OriginalsSongViewModeProps = {
  song: EncoreOriginalSong;
  onEdit: () => void;
  onEditStage: (stage: OriginalsWorkflowStage) => void;
  onSongChange: (patch: Partial<EncoreOriginalSong>) => void;
};

export function OriginalsSongViewMode({
  song,
  onEdit,
  onEditStage,
  onSongChange,
}: OriginalsSongViewModeProps): ReactElement {
  const theme = useTheme();
  const { googleAccessToken } = useEncoreAuth();
  const chartLayout = useMemo(
    () => parseChordProToChartLayout(song.lyricsAndChords),
    [song.lyricsAndChords],
  );
  const playbackDurationLabel = useMemo(() => {
    const durationMs = estimateChartPlaybackDurationMs(chartLayout, song.tempo);
    if (durationMs <= 0) return null;
    return formatChartPlaybackDuration(durationMs);
  }, [chartLayout, song.tempo]);
  const chartTexts = useMemo(() => originalsLyricsChartTexts(song.lyricsAndChords), [song.lyricsAndChords]);
  const hasLyricsSection = Boolean(chartTexts.lyrics || chartTexts.chordChart);
  const demoReady = isOriginalDemoReady(song);
  const currentStage = inferredWorkflowStage(song);
  const { playbackTake, canPlayPlaybackTake } = useOriginalTakePlayable(song, true);
  const { playTake, stopPlayback, isPlayingTake, isLoadingTake, phase, errorMessage, target } =
    useEncoreOriginalsPlayback();

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

  const onPreferredPlayClick = () => {
    if (!playbackTake || !canPlayPlaybackTake) return;
    if (preferredIsPlaying) stopPlayback();
    else playOriginalTake(playbackTake);
  };

  const onSongFilesChange = useCallback(
    (next: EncoreOriginalSong) => {
      onSongChange({
        takes: next.takes,
        mainTakeId: next.mainTakeId,
        songReferences: next.songReferences,
        brainstormResources: next.brainstormResources,
      });
    },
    [onSongChange],
  );

  const copyButtons =
    hasLyricsSection && (chartTexts.lyrics || chartTexts.chordChart) ? (
      <OriginalsCopyChartButtons lyrics={chartTexts.lyrics} chordChart={chartTexts.chordChart} />
    ) : null;

  return (
    <Box>
      <Stack spacing={encorePageSectionGap} sx={{ maxWidth: encoreMaxWidthPage, mx: 'auto', width: 1 }}>
        <Paper elevation={0} sx={originalsSongHeroPaperSx(theme)}>
          <Stack direction="row" spacing={2} alignItems="flex-start" useFlexGap>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
                Original
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, mt: 0.5, mb: 1 }}>
                {song.title.trim() || 'Untitled original'}
              </Typography>
              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                flexWrap="wrap"
                alignItems="center"
                sx={originalsSongMetaChipRowSx()}
              >
                <EncoreKeyChip
                  value={song.key}
                  placeholder="Set key"
                  displayMode="compact"
                  onChange={(next) => onSongChange({ key: next })}
                />
                <EncoreTimeSignatureChip
                  value={originalSongTimeSignature(song)}
                  onChange={(next) => onSongChange({ timeSignature: next })}
                />
                <EncoreBpmChip value={song.tempo} onChange={(next) => onSongChange({ tempo: next })} />
                {playbackDurationLabel ? (
                  <Chip size="small" label={`~${playbackDurationLabel}`} variant="outlined" />
                ) : null}
                <InlineChipDate
                  value={originalSongStartedDate(song)}
                  placeholder="Started writing"
                  ariaLabel="Started writing date"
                  onChange={(d) => onSongChange({ startedAt: d ?? undefined })}
                />
                {song.takes.length > 0 ? (
                  <Chip
                    size="small"
                    label={`${song.takes.length} take${song.takes.length === 1 ? '' : 's'}`}
                    variant="outlined"
                  />
                ) : null}
              </Stack>
              {playbackTake ? (
                <OriginalsSongListenCard
                  take={playbackTake}
                  isPreferred={song.mainTakeId === playbackTake.id}
                  canPlay={canPlayPlaybackTake}
                  isPlaying={preferredIsPlaying}
                  isLoading={preferredIsLoading}
                  errorMessage={playbackErrorForPreferred}
                  downloadDisabled={downloadGate.disabled}
                  downloadDisabledReason={downloadGate.reason}
                  onPlayToggle={onPreferredPlayClick}
                  onDownload={() => {
                    if (downloadTarget) {
                      void triggerEncoreResourceDownload(downloadTarget, googleAccessToken);
                    }
                  }}
                />
              ) : null}
              <Box sx={{ mt: 1 }}>
                {demoReady ? (
                  <Chip
                    size="small"
                    label="Demo ready"
                    variant="outlined"
                    sx={originalsLibraryStageChipSx(true, theme)}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    {formatOriginalStageSummary(song)} · Continue{' '}
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onEditStage(currentStage)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        minWidth: 0,
                        p: 0,
                        verticalAlign: 'baseline',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                      }}
                    >
                      {workflowStageShortLabel(currentStage)}
                    </Button>
                  </Typography>
                )}
              </Box>
            </Box>
            <Button
              variant={playbackTake ? 'outlined' : 'contained'}
              size="medium"
              onClick={onEdit}
              sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
            >
              Write
            </Button>
          </Stack>
        </Paper>

        <OriginalsViewSection title="Song files" onEdit={() => onEditStage('takes')}>
          <OriginalsSongFilesPanel
            song={song}
            onChange={onSongFilesChange}
            onOpenBrainstorm={() => onEditStage('brainstorm')}
          />
        </OriginalsViewSection>

        <OriginalsViewSection
          title="Lyrics & chart"
          trailing={copyButtons}
          onEdit={() => onEditStage('write')}
        >
          {hasLyricsSection ? (
            <OriginalsLyricsChartPanel
              lyricsAndChords={song.lyricsAndChords}
              songId={song.id}
              songKey={song.key}
              tempo={song.tempo}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              No lyrics or chart yet. Edit to start writing.
            </Typography>
          )}
        </OriginalsViewSection>

      </Stack>
    </Box>
  );
}
