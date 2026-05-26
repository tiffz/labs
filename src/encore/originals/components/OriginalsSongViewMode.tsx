import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { parseChordProToChartLayout } from '../../../shared/music/chordPro/chordChartLayout';
import { chartLayoutToAsciiExport } from '../../../shared/music/chordChartAsciiExport';
import { layoutToWriteDocument } from '../../../shared/music/chordPro/chordChartLayout';
import { richTextPlainText } from '../../../shared/utils/richTextContent';
import { EncoreStaticResourceHoverCard } from '../../components/EncoreStreamingHoverCard';
import { EncoreResourceLinksPanel } from '../../components/EncoreResourceLinksPanel';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import { encoreMaxWidthPage } from '../../theme/encoreUiTokens';
import { useEncoreOriginalsPlayback } from '../context/EncoreOriginalsPlaybackContext';
import { isStageComplete } from '../originalsWorkflowCompletion';
import { ORIGINALS_WORKFLOW_STAGES, workflowStageShortLabel } from '../originalsWorkflowStages';
import { originalTakeListenHint } from '../originalsTakeDisplay';
import { preferredOriginalTake, type EncoreOriginalSong } from '../types';

export type OriginalsSongViewModeProps = {
  song: EncoreOriginalSong;
  onEdit: () => void;
};

export function OriginalsSongViewMode({ song, onEdit }: OriginalsSongViewModeProps): ReactElement {
  const theme = useTheme();
  const writeDoc = layoutToWriteDocument(parseChordProToChartLayout(song.lyricsAndChords));
  const ascii = chartLayoutToAsciiExport(parseChordProToChartLayout(song.lyricsAndChords));
  const brainstormPlain = richTextPlainText(song.brainstormHtml);
  const preferredTake = preferredOriginalTake(song);
  const { playTake, stopPlayback, isPlayingTake, isLoadingTake, phase, errorMessage, target } =
    useEncoreOriginalsPlayback();
  const preferredIsPlaying = preferredTake ? isPlayingTake(song.id, preferredTake.id) : false;
  const preferredIsLoading = preferredTake ? isLoadingTake(song.id, preferredTake.id) : false;
  const canPlayPreferred = Boolean(preferredTake?.driveFileId);
  const playbackErrorForPreferred =
    preferredTake && target?.takeId === preferredTake.id && phase === 'error' ? errorMessage : null;

  const onPreferredPlayClick = () => {
    if (!preferredTake?.driveFileId) return;
    if (preferredIsPlaying) {
      stopPlayback();
      return;
    }
    playTake({
      songId: song.id,
      songTitle: song.title,
      takeId: preferredTake.id,
      takeLabel: preferredTake.label,
      driveFileId: preferredTake.driveFileId,
      mimeType: preferredTake.mimeType,
    });
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', pb: 4 }}>
      <Stack spacing={3} sx={{ maxWidth: encoreMaxWidthPage, mx: 'auto', width: 1 }}>
        <Paper
          elevation={0}
          sx={(theme) => ({
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 1)} 55%)`,
          })}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                Original
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, mb: 1 }}>
                {song.title.trim() || 'Untitled original'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`Key ${song.key}`} />
                <Chip size="small" label={`${song.tempo} BPM`} variant="outlined" />
                {song.takes.length > 0 ? (
                  <Chip size="small" label={`${song.takes.length} take${song.takes.length === 1 ? '' : 's'}`} variant="outlined" />
                ) : null}
              </Stack>
              {preferredTake ? (
                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  flexWrap="wrap"
                  alignItems="center"
                  sx={{ mt: 1.75 }}
                >
                  {canPlayPreferred ? (
                    <Button
                      variant="outlined"
                      size="medium"
                      onClick={onPreferredPlayClick}
                      disabled={preferredIsLoading}
                      startIcon={
                        preferredIsLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : preferredIsPlaying ? (
                          <StopCircleOutlinedIcon />
                        ) : (
                          <HeadphonesOutlinedIcon />
                        )
                      }
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                        color: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        px: 1.75,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.09),
                        },
                      }}
                    >
                      {preferredIsLoading ? 'Loading…' : preferredIsPlaying ? 'Stop' : 'Listen'}
                    </Button>
                  ) : (
                    <Tooltip title="Sign in to Google to play this take in Encore">
                      <span>
                        <Button
                          variant="outlined"
                          size="medium"
                          disabled
                          startIcon={<HeadphonesOutlinedIcon />}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          Listen
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                  <Typography
                    variant="caption"
                    color={playbackErrorForPreferred ? 'error' : 'text.secondary'}
                    sx={{ lineHeight: 1.35, flex: '1 1 12rem', minWidth: 0 }}
                  >
                    {playbackErrorForPreferred ??
                      originalTakeListenHint(preferredTake, song.mainTakeId === preferredTake.id)}
                  </Typography>
                </Stack>
              ) : null}
            </Box>
            <Button
              variant={preferredTake ? 'outlined' : 'contained'}
              size="medium"
              onClick={onEdit}
              sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
            >
              Write
            </Button>
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            {ORIGINALS_WORKFLOW_STAGES.map((s) => (
              <Chip
                key={s.id}
                size="small"
                label={workflowStageShortLabel(s.id)}
                color={isStageComplete(song, s.id) ? 'primary' : 'default'}
                variant={isStageComplete(song, s.id) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Paper>

        {brainstormPlain || (song.brainstormResources?.length ?? 0) > 0 ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Brainstorm
            </Typography>
            {brainstormPlain ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
                {brainstormPlain}
              </Typography>
            ) : null}
            {(song.brainstormResources?.length ?? 0) > 0 ? (
              <Box sx={{ mt: brainstormPlain ? 1.5 : 0 }}>
                <EncoreResourceLinksPanel
                  resources={song.brainstormResources!}
                  onChange={() => {}}
                  onAddLink={() => {}}
                  onUploadFiles={() => {}}
                  readOnly
                  emptyHint=""
                />
              </Box>
            ) : null}
          </Paper>
        ) : null}

        {writeDoc.trim() ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Lyrics
            </Typography>
            <Typography
              component="pre"
              variant="body1"
              sx={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', m: 0, lineHeight: 1.65 }}
            >
              {writeDoc}
            </Typography>
          </Paper>
        ) : null}

        {ascii.trim() ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Chord chart
            </Typography>
            <Typography
              component="pre"
              variant="body2"
              sx={{ fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', m: 0, lineHeight: 1.5 }}
            >
              {ascii}
            </Typography>
          </Paper>
        ) : null}

        {song.takes.length > 0 ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Demo takes
            </Typography>
            <Stack spacing={0.75} alignItems="flex-start">
              {song.takes.map((t) => (
                <EncoreStaticResourceHoverCard key={t.id} title={t.label} subtitle="Demo take">
                  <EncoreMediaLinkRow
                    slot="reference"
                    isPrimary={song.mainTakeId === t.id}
                    caption={t.label}
                    openUrl={
                      t.driveFileId
                        ? `https://drive.google.com/file/d/${encodeURIComponent(t.driveFileId)}/view`
                        : undefined
                    }
                    openAriaLabel={`Open ${t.label}`}
                  />
                </EncoreStaticResourceHoverCard>
              ))}
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Box>
  );
}
