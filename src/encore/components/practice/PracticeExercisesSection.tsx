import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
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
import { recordDeletedExerciseRunIds } from '../../drive/encoreExerciseRunTombstones';
import type { EncoreBlockingJobsApi } from '../../context/EncoreBlockingJobContext';
import type { EncorePracticeExerciseKind, EncorePracticeExerciseRun, EncoreSong } from '../../types';
import { PracticeExerciseFocusDialog } from './PracticeExerciseFocusDialog';

export type PracticeExercisesSectionProps = {
  song: EncoreSong;
  onPersistSong: (next: EncoreSong) => void | Promise<void>;
  googleAccessToken: string | null;
  /** Interactive Google sign-in, forwarded to the focus dialog so "Save to Google Docs"
   * can sign the user in inline instead of being disabled. */
  signInWithGoogle: () => Promise<void>;
  withBlockingJob: EncoreBlockingJobsApi['withBlockingJob'];
};

const KIND_ICONS: Record<EncorePracticeExerciseKind, ReactElement> = {
  lyricsInOwnWords: <EditNoteIcon sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />,
  lyricsSectionNarrative: <AutoStoriesIcon sx={{ fontSize: 18, color: 'text.secondary' }} aria-hidden />,
  characterNineQuestions: <AutoAwesomeIcon sx={{ fontSize: 17, color: 'text.secondary' }} aria-hidden />,
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
  signInWithGoogle,
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
      const removedIds = (song.practiceExerciseRuns ?? [])
        .filter((run) => run.kind === kind)
        .map((run) => run.id);
      void recordDeletedExerciseRunIds(removedIds);
      const nextSong = removeRunForKind(song, kind);
      onPersistSong({ ...nextSong, updatedAt: new Date().toISOString() });
    },
    [song, onPersistSong],
  );

  const kinds = useMemo(() => Object.keys(ENCORE_PRACTICE_EXERCISE_CATALOG) as EncorePracticeExerciseKind[], []);
  const focusedRun = focusKind ? getSingleRunForKind(song, focusKind) : null;

  return (
    <Stack spacing={0}>
      <Box sx={{ mb: 1.75 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.25 }}>
          Guided exercises
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            display: 'block',
            lineHeight: 1.5,
            maxWidth: 620
          }}>
          Short prompts to connect lyrics and character to how you perform the song.
        </Typography>
      </Box>
      {/*
        Flat list (no outer card, no rounded corners) so the section reads like the Milestones
        checklist directly below it — each exercise is its own row, separated by a hairline.
        See `STYLE_GUIDE.md` "Information density".
      */}
      <Box>
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
          signInWithGoogle={signInWithGoogle}
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
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          minWidth: 0,
          flexWrap: 'wrap',
          rowGap: 0.25
        }}>
        {completed ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main', opacity: 0.88 }} aria-hidden />
        ) : null}
        <Typography
          variant="caption"
          sx={{
            fontWeight: completed ? 600 : 500,
            color: completed ? 'success.dark' : 'text.secondary',
            fontSize: '0.8125rem',
            lineHeight: 1.45,
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
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontSize: '0.75rem',
            opacity: 0.88,
            ml: 0.25
          }}>
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
        gap: { xs: 1, sm: 1.75 },
        // No horizontal padding — the row sits flush with the section column so it reads as a
        // standalone list item (matches the Milestones checklist directly below).
        px: 0,
        py: { xs: 1.1, sm: 1.05 },
        cursor: 'pointer',
        textAlign: 'left',
        // Hairline divider between distinct items — there's no outer card wrapping them.
        borderTop: showDivider ? 1 : 0,
        borderTopStyle: 'solid',
        borderColor: 'divider',
        transition: 'opacity 100ms ease-out, background-color 100ms ease-out',
        // Completed rows recede via opacity + muted title (Encore's done idiom — same as
        // `MilestoneRow`). The "✓ Completed" status text carries the explicit signal; no
        // background tint or accent border, so pending rows pop simply by being at full
        // strength.
        opacity: completed ? 0.62 : 1,
        '&:hover': {
          opacity: completed ? 0.9 : 1,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          flex: 1,
          minWidth: 0
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            flexShrink: 0,
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1, py: 0.2 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.35,
              color: completed ? 'text.secondary' : 'text.primary',
              fontSize: '0.9375rem',
            }}
          >
            {meta.title}
          </Typography>
          <Tooltip title={meta.description} placement="top" enterDelay={400}>
            <Typography
              variant="body2"
              component="p"
              sx={{
                color: "text.secondary",
                m: 0,
                mt: 0.35,
                fontSize: '0.8125rem',
                lineHeight: 1.45,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
              {meta.description}
            </Typography>
          </Tooltip>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>{statusLine}</Box>
        </Box>
      </Stack>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: { xs: 'space-between', sm: 'flex-end' },
          flexShrink: 0,
          flexWrap: 'wrap',
          rowGap: 0.5
        }}>
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
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            justifyContent: "flex-end",
            flexShrink: 0
          }}>
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
                <RestartAltIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Button
            variant={completed ? 'text' : 'outlined'}
            color={completed ? 'inherit' : 'primary'}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPrimary();
            }}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 1.5,
              py: 0.55,
              fontSize: '0.8125rem',
              minWidth: 132,
              whiteSpace: 'nowrap',
              // The "Open" review action on a completed row is a low-priority CTA; the next
              // pending exercise's "Continue"/"Start" should be the one that pulls the eye.
              ...(completed
                ? {
                    color: 'text.secondary',
                    '&:hover': { bgcolor: (t) => alpha(t.palette.text.primary, 0.05), color: 'text.primary' },
                  }
                : null),
            }}
          >
            {primaryLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
