import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  ENCORE_PRACTICE_EXERCISE_CATALOG,
  formatExerciseRunSummary,
  getSingleRunForKind,
  newCharacterNineQuestionsRun,
  newLyricsInOwnWordsRun,
  removeRunForKind,
  setSingleRunForKind,
} from '../../practice/encorePracticeExerciseModel';
import type { EncorePracticeExerciseKind, EncorePracticeExerciseRun, EncoreSong } from '../../types';
import { PracticeExerciseFocusDialog } from './PracticeExerciseFocusDialog';

export type PracticeExercisesSectionProps = {
  song: EncoreSong;
  onPersistSong: (next: EncoreSong) => void;
};

const KIND_ICONS: Record<EncorePracticeExerciseKind, ReactElement> = {
  lyricsInOwnWords: <EditNoteIcon sx={{ fontSize: 22 }} aria-hidden />,
  characterNineQuestions: <AutoAwesomeIcon sx={{ fontSize: 20 }} aria-hidden />,
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

export function PracticeExercisesSection({ song, onPersistSong }: PracticeExercisesSectionProps): ReactElement {
  const [focusKind, setFocusKind] = useState<EncorePracticeExerciseKind | null>(null);

  const persistRun = useCallback(
    (run: EncorePracticeExerciseRun) => {
      const nextSong = setSingleRunForKind(song, run);
      onPersistSong({ ...nextSong, updatedAt: new Date().toISOString() });
    },
    [song, onPersistSong],
  );

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
      const run = kind === 'lyricsInOwnWords' ? newLyricsInOwnWordsRun() : newCharacterNineQuestionsRun();
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
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 2.25 },
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.005em' }}>
            Guided exercises
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            Short, focused workouts that get the meaning of the song into your body.
          </Typography>
        </Box>
        <Stack
          spacing={1.25}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 1.25, md: 1.5 },
          }}
        >
          {kinds.map((kind) => {
            const meta = ENCORE_PRACTICE_EXERCISE_CATALOG[kind];
            const run = getSingleRunForKind(song, kind);
            return (
              <ExerciseCard
                key={kind}
                meta={meta}
                icon={KIND_ICONS[kind]}
                run={run}
                onPrimary={() => onPrimaryActionForKind(kind)}
                onClear={() => onClearKind(kind)}
              />
            );
          })}
        </Stack>
      </Stack>
      {focusKind && focusedRun ? (
        <PracticeExerciseFocusDialog
          key={focusedRun.id}
          open
          songTitle={song.title}
          songArtist={song.artist}
          run={focusedRun}
          readOnly={focusedRun.status === 'completed'}
          onClose={closeDialog}
          onSaveDraft={persistRun}
          onMarkComplete={(r) => {
            persistRun(r);
            closeDialog();
          }}
          onClearDraft={() => {
            onClearKind(focusKind);
            closeDialog();
          }}
        />
      ) : null}
    </Paper>
  );
}

function ExerciseCard({
  meta,
  icon,
  run,
  onPrimary,
  onClear,
}: {
  meta: { title: string; description: string };
  icon: ReactElement;
  run: EncorePracticeExerciseRun | undefined;
  onPrimary: () => void;
  onClear: () => void;
}): ReactElement {
  const summary = run ? formatExerciseRunSummary(run) : null;
  const completed = run?.status === 'completed';

  /**
   * Primary button copy is intentionally action-first ("Start exercise" / "Continue" / "Open"),
   * not contextual nouns. The user pointed out the old "New" CTA felt buried in the corner;
   * here the button is the most prominent thing on the card so it's unmissable.
   */
  const primaryLabel = !run ? 'Start exercise' : completed ? 'Open' : 'Continue';

  return (
    <Box
      sx={{
        position: 'relative',
        p: 1.5,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        minHeight: 168,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.35 }}>
            {meta.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}
          >
            {meta.description}
          </Typography>
        </Box>
      </Stack>

      {run ? (
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: completed ? 'rgba(76, 175, 80, 0.08)' : 'action.hover',
          }}
        >
          {completed ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} aria-hidden />
          ) : null}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: completed ? 'success.dark' : 'text.primary',
              flex: 1,
              minWidth: 0,
            }}
          >
            {completed ? 'Completed' : 'In progress'} · {summary}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
            {formatTimestamp(completed ? run.completedAt : run.updatedAt)}
          </Typography>
        </Stack>
      ) : null}

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ mt: 'auto' }}>
        {run ? (
          <Tooltip title={completed ? 'Discard this completed exercise and start fresh' : 'Discard this draft and start fresh'}>
            <Button
              size="small"
              color="inherit"
              onClick={onClear}
              startIcon={<RestartAltIcon fontSize="small" />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'text.secondary',
                '&:hover': { color: 'error.main', bgcolor: 'error.light' },
              }}
            >
              Clear
            </Button>
          </Tooltip>
        ) : null}
        <Button
          variant="contained"
          size="medium"
          onClick={onPrimary}
          sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
        >
          {primaryLabel}
        </Button>
      </Stack>
    </Box>
  );
}
