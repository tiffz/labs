import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ENCORE_PRACTICE_EXERCISE_CATALOG,
  formatExerciseRunSummary,
  getSingleRunForKind,
  newCharacterNineQuestionsRun,
  newLyricsInOwnWordsRun,
  newLyricsSectionNarrativeRun,
  removeRunForKind,
  setSingleRunForKind,
} from '../../practice/encorePracticeExerciseModel';
import type { EncoreBlockingJobsApi } from '../../context/EncoreBlockingJobContext';
import { encoreRadius } from '../../theme/encoreUiTokens';
import type { EncorePracticeExerciseKind, EncorePracticeExerciseRun, EncoreSong } from '../../types';
import { PracticeExerciseFocusDialog } from './PracticeExerciseFocusDialog';

export type PracticeExercisesSectionProps = {
  song: EncoreSong;
  onPersistSong: (next: EncoreSong) => void | Promise<void>;
  googleAccessToken: string | null;
  withBlockingJob: EncoreBlockingJobsApi['withBlockingJob'];
};

const KIND_ICONS: Record<EncorePracticeExerciseKind, ReactElement> = {
  lyricsInOwnWords: <EditNoteIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />,
  lyricsSectionNarrative: <AutoStoriesIcon sx={{ fontSize: 16, color: 'text.secondary' }} aria-hidden />,
  characterNineQuestions: <AutoAwesomeIcon sx={{ fontSize: 15, color: 'text.secondary' }} aria-hidden />,
};

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PracticeExercisesSection({
  song,
  onPersistSong,
  googleAccessToken,
  withBlockingJob,
}: PracticeExercisesSectionProps): ReactElement {
  const [focusKind, setFocusKind] = useState<EncorePracticeExerciseKind | null>(null);

  const closeDialog = useCallback(() => setFocusKind(null), []);

  /**
   * "Start" / "Continue" — same primary action, different label depending on whether a run
   * already exists. We only ever keep one run per kind (see `setSingleRunForKind`), so starting
   * fresh requires Clear first.
   */
  const onPrimaryActionForKind = useCallback(
    (kind: EncorePracticeExerciseKind) => {
      const existing = getSingleRunForKind(song, kind);
      if (existing) {
        setFocusKind(kind);
        return;
      }
      const run =
        kind === 'lyricsInOwnWords'
          ? newLyricsInOwnWordsRun()
          : kind === 'lyricsSectionNarrative'
            ? newLyricsSectionNarrativeRun(song)
            : newCharacterNineQuestionsRun();
      const nextSong = setSingleRunForKind(song, run);
      onPersistSong({ ...nextSong, updatedAt: new Date().toISOString() });
      setFocusKind(kind);
    },
    [song, onPersistSong],
  );

  const onClearKind = useCallback(
    (kind: EncorePracticeExerciseKind) => {
      const nextSong = removeRunForKind(song, kind);
      onPersistSong({ ...nextSong, updatedAt: new Date().toISOString() });
    },
    [song, onPersistSong],
  );

  const kinds = useMemo(() => Object.keys(ENCORE_PRACTICE_EXERCISE_CATALOG) as EncorePracticeExerciseKind[], []);
  const focusedRun = focusKind ? getSingleRunForKind(song, focusKind) : null;

  return (
    <Stack spacing={0}>
      <Box sx={{ mb: 1.25 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.35, lineHeight: 1.2 }}>
          Guided exercises
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', lineHeight: 1.45, fontSize: '0.72rem', maxWidth: 560 }}
        >
          Short prompts to connect lyrics and character to how you perform the song.
        </Typography>
      </Box>
      <Box
        sx={{
          border: 1,
          borderStyle: 'solid',
          borderColor: 'divider',
          borderRadius: encoreRadius,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        {kinds.map((kind, index) => {
          const meta = ENCORE_PRACTICE_EXERCISE_CATALOG[kind];
          const run = getSingleRunForKind(song, kind);
          return (
            <ExerciseListRow
              key={kind}
              showDivider={index > 0}
              meta={meta}
              icon={KIND_ICONS[kind]}
              run={run}
              onPrimary={() => onPrimaryActionForKind(kind)}
              onClear={() => onClearKind(kind)}
            />
          );
        })}
      </Box>
      {focusKind && focusedRun ? (
        <PracticeExerciseFocusDialog
          key={focusedRun.id}
          open
          song={song}
          songTitle={song.title}
          songArtist={song.artist}
          run={focusedRun}
          readOnly={focusedRun.status === 'completed'}
          googleAccessToken={googleAccessToken}
          withBlockingJob={withBlockingJob}
          onClose={closeDialog}
          onPersistSong={onPersistSong}
          onClearDraft={() => {
            onClearKind(focusKind);
            closeDialog();
          }}
        />
      ) : null}
    </Stack>
  );
}

function ExerciseListRow({
  showDivider,
  meta,
  icon,
  run,
  onPrimary,
  onClear,
}: {
  showDivider: boolean;
  meta: { title: string; description: string };
  icon: ReactElement;
  run: EncorePracticeExerciseRun | undefined;
  onPrimary: () => void;
  onClear: () => void;
}): ReactElement {
  const summary = run ? formatExerciseRunSummary(run) : null;
  const summaryTrimmed = summary?.trim() ?? '';
  const showStatus = Boolean(run && (run.status === 'completed' || summaryTrimmed.length > 0));
  const completed = run?.status === 'completed';

  const primaryLabel = !run ? 'Start exercise' : completed ? 'Open' : 'Continue';

  const statusPrimary = completed ? 'Completed' : summary;
  const statusSecondary = completed ? summary : null;

  const openExercise = useCallback(() => {
    onPrimary();
  }, [onPrimary]);

  const statusLine =
    showStatus && run ? (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap', rowGap: 0.25 }}>
        {completed ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 14, color: 'success.main', opacity: 0.88 }} aria-hidden />
        ) : null}
        <Typography
          variant="caption"
          sx={{
            fontWeight: completed ? 600 : 500,
            color: completed ? 'success.dark' : 'text.secondary',
            fontSize: '0.68rem',
            lineHeight: 1.4,
          }}
        >
          {completed ? (
            <>
              {statusPrimary}
              {statusSecondary ? (
                <>
                  {' · '}
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {statusSecondary}
                  </Box>
                </>
              ) : null}
            </>
          ) : (
            summaryTrimmed
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.88, ml: 0.25 }}>
          {formatTimestamp(completed ? run.completedAt : run.updatedAt)}
        </Typography>
      </Stack>
    ) : null;

  return (
    <Box
      onClick={openExercise}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 0.75, sm: 1.5 },
        px: { xs: 1.25, sm: 1.5 },
        py: { xs: 0.9, sm: 0.875 },
        cursor: 'pointer',
        textAlign: 'left',
        borderTop: showDivider ? 1 : 0,
        borderTopStyle: 'solid',
        borderColor: 'divider',
        transition: 'background-color 100ms ease-out',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            flexShrink: 0,
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, py: 0.1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'text.primary',
              fontSize: '0.8125rem',
            }}
          >
            {meta.title}
          </Typography>
          <Tooltip title={meta.description} placement="top" enterDelay={400}>
            <Typography
              variant="caption"
              component="p"
              color="text.secondary"
              sx={{
                m: 0,
                mt: 0.2,
                fontSize: '0.7rem',
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {meta.description}
            </Typography>
          </Tooltip>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>{statusLine}</Box>
        </Box>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
        sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 0.5 }}
      >
        {showStatus && run ? (
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              minWidth: 0,
              maxWidth: { sm: 220, md: 300 },
              textAlign: 'right',
              gap: 0.25,
            }}
          >
            {statusLine}
          </Box>
        ) : null}
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
          {run ? (
            <Tooltip title={completed ? 'Discard completed exercise' : 'Discard draft'}>
              <IconButton
                size="small"
                aria-label="Clear exercise"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main', bgcolor: 'action.hover' },
                }}
              >
                <RestartAltIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPrimary();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 1.25,
              py: 0.45,
              fontSize: '0.75rem',
              minWidth: 124,
              whiteSpace: 'nowrap',
            }}
          >
            {primaryLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
