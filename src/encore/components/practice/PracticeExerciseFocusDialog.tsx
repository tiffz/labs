import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UndoIcon from '@mui/icons-material/Undo';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Slide from '@mui/material/Slide';
import LabsFeedbackToast from '../../../shared/components/LabsFeedbackToast';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import {
  forwardRef,
  Fragment,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import {
  ENCORE_CHARACTER_NINE_QUESTION_COUNT,
  ENCORE_CHARACTER_NINE_QUESTION_TITLES,
  ENCORE_PRACTICE_EXERCISE_CATALOG,
  applyPositionalLyricsFallback,
  effectiveGeniusLyricsSource,
  effectiveLyricsSections,
  geniusSearchUrlForSong,
  lyricsExerciseSectionDisplayLabel,
  lyricsRewriteProgressFromSections,
  lyricsSectionNarrativeProgress,
  markExerciseRunCompleted,
  mergeParsedNarrativeSectionsWithExisting,
  mergeParsedSectionsWithExisting,
  nineQuestionsProgress,
  parseGeniusLyricsIntoSections,
  serializeLyricsSectionsToRaw,
  setSingleRunForKind,
  songWithSyncedLyricsInOwnWordsAndResyncNarrative,
  touchExerciseRun,
  unmarkExerciseRunCompleted,
} from '../../practice/encorePracticeExerciseModel';
import {
  buildPracticeExercisePdfBytes,
  downloadPracticeExercisePdf,
} from '../../practice/encorePracticeExerciseExport';
import { syncPracticeExerciseGoogleDoc } from '../../practice/googleDocsExerciseExport';
import { EncoreTiptapAnswerField } from '../../ui/EncoreTiptapAnswerField';
import type { EncoreBlockingJobsApi } from '../../context/EncoreBlockingJobContext';
import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsExerciseSection,
  EncoreLyricsInOwnWordsExerciseRun,
  EncoreLyricsSectionNarrativeExerciseRun,
  EncorePracticeExerciseRun,
  EncoreSong,
} from '../../types';

export type PracticeExerciseFocusDialogProps = {
  open: boolean;
  song: EncoreSong;
  songTitle: string;
  songArtist: string;
  run: EncorePracticeExerciseRun;
  readOnly: boolean;
  googleAccessToken: string | null;
  /**
   * Interactive Google sign-in. Used when the user picks "Save to Google Docs" without a
   * Drive token — instead of leaving the menu item disabled, we run sign-in inline so the
   * one-click intent ("save this") just works.
   */
  signInWithGoogle: () => Promise<void>;
  withBlockingJob: EncoreBlockingJobsApi['withBlockingJob'];
  onClose: () => void;
  onPersistSong: (next: EncoreSong) => void | Promise<void>;
  onClearDraft: () => void;
};

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function stampUpdatedAt(song: EncoreSong): EncoreSong {
  return { ...song, updatedAt: new Date().toISOString() };
}

function cloneRun(run: EncorePracticeExerciseRun): EncorePracticeExerciseRun {
  if (run.kind === 'lyricsInOwnWords') {
    return {
      ...run,
      sections: effectiveLyricsSections(run),
      lines: undefined,
    };
  }
  if (run.kind === 'lyricsSectionNarrative') {
    return {
      ...run,
      sections: run.sections.map((s) => ({ ...s })),
    };
  }
  return { ...run, answers: [...run.answers] };
}

export function PracticeExerciseFocusDialog({
  open,
  song,
  songTitle,
  songArtist,
  run,
  readOnly,
  googleAccessToken,
  signInWithGoogle,
  withBlockingJob,
  onClose,
  onPersistSong,
  onClearDraft,
}: PracticeExerciseFocusDialogProps): ReactElement {
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportFeedback, setExportFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  // Snapshot of `drivePracticeExportGoogleDocId` mirrored from the editor's live run, used for
  // the export menu label ("Save to" vs "Update"). Updated only when the underlying id changes,
  // so typing in the editor doesn't re-render the dialog shell. See `onDirty` below.
  const [googleDocIdMirror, setGoogleDocIdMirror] = useState<string | null>(
    run.drivePracticeExportGoogleDocId?.trim() ?? null,
  );
  useEffect(() => {
    setGoogleDocIdMirror(run.drivePracticeExportGoogleDocId?.trim() ?? null);
  }, [run.drivePracticeExportGoogleDocId]);

  // The initial state the editor mounts with — computed once per (run id, song id, lyrics
  // source) tuple, so the editor remounts only when the user opens a different exercise or
  // external lyrics change. The editor owns `local` from then on and the dialog only reads
  // through `latestRunRef` / `editorRef.getCurrentRun()`.
  const initialRun = useMemo(() => {
    const base = cloneRun(run);
    if (base.kind === 'lyricsInOwnWords') {
      const src = effectiveGeniusLyricsSource(song, base);
      if (effectiveLyricsSections(base).length === 0 && src.trim()) {
        return { ...base, sections: parseGeniusLyricsIntoSections(src), pastedLyrics: undefined };
      }
    }
    if (base.kind === 'lyricsSectionNarrative') {
      const src = song.lyricsSourceGenius?.trim() ?? '';
      const parsed = parseGeniusLyricsIntoSections(src);
      return { ...base, sections: mergeParsedNarrativeSectionsWithExisting(parsed, base.sections) };
    }
    return base;
    // Omit `run.updatedAt`: autosave bumps it and we would otherwise wipe the editor mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps (see above)
  }, [run.id, run.kind, song.lyricsSourceGenius, song.id]);

  const geniusUrl = useMemo(() => geniusSearchUrlForSong(songTitle, songArtist), [songTitle, songArtist]);
  const catalog = ENCORE_PRACTICE_EXERCISE_CATALOG[run.kind];

  const persistSong = useCallback(
    (next: EncoreSong): void | Promise<void> => onPersistSong(stampUpdatedAt(next)),
    [onPersistSong],
  );

  const songRef = useRef(song);
  songRef.current = song;
  // Mirrors `googleAccessToken` so the Google Doc export handler can re-read the token after
  // an interactive sign-in resolves (the prop will have updated by the next render, but the
  // click closure captured the old value).
  const googleAccessTokenRef = useRef(googleAccessToken);
  googleAccessTokenRef.current = googleAccessToken;
  // The editor is the source of truth for the in-progress run; this ref mirrors its latest
  // value so the dialog's export / mark-complete / autosave handlers can read it without
  // forcing the dialog to re-render on every keystroke. Seeded once at mount — the dialog
  // remounts when the user opens a different exercise (parent passes `key={focusedRun.id}`),
  // so subsequent updates only ever come from the editor via `onEditorDirty`. We never
  // re-sync from `initialRun` because doing so could overwrite an in-flight typing snapshot
  // with the version reflected back through Dexie after autosave.
  const latestRunRef = useRef<EncorePracticeExerciseRun>(initialRun);
  const editorRef = useRef<EncoreExerciseEditorHandle | null>(null);
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;
  const autosaveTimerRef = useRef<number | null>(null);

  /** Writes the current dialog draft to Dexie via `saveSong` (awaitable for crash / tab-hide safety). */
  const flushDraftToDb = useCallback(async (): Promise<void> => {
    if (readOnlyRef.current) return;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const latestSong = songRef.current;
    const latestRun = latestRunRef.current;
    if (latestRun.kind === 'lyricsInOwnWords') {
      await Promise.resolve(
        persistSong(
          songWithSyncedLyricsInOwnWordsAndResyncNarrative(
            latestSong,
            latestRun as EncoreLyricsInOwnWordsExerciseRun,
          ),
        ),
      );
      return;
    }
    await Promise.resolve(persistSong(setSingleRunForKind(latestSong, touchExerciseRun(latestRun))));
  }, [persistSong]);

  const persistDraft = useCallback(() => {
    void flushDraftToDb();
  }, [flushDraftToDb]);

  /** Debounced autosave: fewer Dexie live-query churns than sub-second while typing. */
  const AUTOSAVE_MS = 1100;

  /**
   * Editor-driven dirty notification. Stays entirely ref-based: updating `latestRunRef` and
   * rescheduling the autosave timer never triggers a dialog re-render, so typing only re-renders
   * the editor that actually changed. We mirror the Google Doc id into React state only when
   * it actually changes (export flow), which keeps the menu label accurate without per-keystroke
   * dialog work.
   */
  const onEditorDirty = useCallback<EncoreExerciseDirtyCallback>(
    (newRun) => {
      latestRunRef.current = newRun;
      const nextId = newRun.drivePracticeExportGoogleDocId?.trim() ?? null;
      setGoogleDocIdMirror((prev) => (prev === nextId ? prev : nextId));
      if (readOnlyRef.current) return;
      if (autosaveTimerRef.current != null) window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = window.setTimeout(() => {
        autosaveTimerRef.current = null;
        void flushDraftToDb();
      }, AUTOSAVE_MS);
    },
    [flushDraftToDb],
  );

  // Cancel any pending autosave on unmount (e.g. user closes the dialog before the debounce fires).
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open || readOnly) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flushDraftToDb();
    };
    const onPageHide = () => {
      void flushDraftToDb();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [open, readOnly, flushDraftToDb]);

  const handleRequestClose = useCallback(() => {
    void flushDraftToDb().finally(() => onClose());
  }, [flushDraftToDb, onClose]);

  const handleMarkComplete = useCallback(async () => {
    if (readOnlyRef.current) return;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const current = editorRef.current?.getCurrentRun() ?? latestRunRef.current;
    const latestSong = songRef.current;
    try {
      if (current.kind === 'lyricsInOwnWords') {
        const completed = markExerciseRunCompleted(touchExerciseRun(current));
        await Promise.resolve(
          persistSong(
            songWithSyncedLyricsInOwnWordsAndResyncNarrative(
              latestSong,
              completed as EncoreLyricsInOwnWordsExerciseRun,
            ),
          ),
        );
      } else {
        await Promise.resolve(
          persistSong(setSingleRunForKind(latestSong, markExerciseRunCompleted(touchExerciseRun(current)))),
        );
      }
    } finally {
      onClose();
    }
  }, [onClose, persistSong]);

  const handleClearDraft = useCallback(() => {
    if (readOnlyRef.current) return;
    onClearDraft();
  }, [onClearDraft]);

  /**
   * Reverts a completed exercise to a draft so the user can keep editing. We patch the
   * editor's local snapshot through the imperative handle (otherwise the editor would still
   * autosave back the `status: 'completed'` it captured at mount) and persist immediately —
   * the dialog stays open and the parent re-renders with `readOnly=false`.
   */
  const handleReopenForEditing = useCallback(async () => {
    const current = editorRef.current?.getCurrentRun() ?? latestRunRef.current;
    if (current.status !== 'completed') return;
    const reopened = unmarkExerciseRunCompleted(current);
    editorRef.current?.replaceRun(reopened);
    latestRunRef.current = reopened;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const latestSong = songRef.current;
    if (reopened.kind === 'lyricsInOwnWords') {
      await Promise.resolve(
        persistSong(
          songWithSyncedLyricsInOwnWordsAndResyncNarrative(
            latestSong,
            reopened as EncoreLyricsInOwnWordsExerciseRun,
          ),
        ),
      );
      return;
    }
    await Promise.resolve(persistSong(setSingleRunForKind(latestSong, reopened)));
  }, [persistSong]);

  const handleDownloadPdf = useCallback(async () => {
    setExportMenuAnchor(null);
    const current = editorRef.current?.getCurrentRun() ?? latestRunRef.current;
    const latestSong = songRef.current;
    try {
      await withBlockingJob('Building PDF…', async () => {
        const bytes = await buildPracticeExercisePdfBytes(latestSong, current);
        downloadPracticeExercisePdf(latestSong, current, bytes);
      });
    } catch (e) {
      setExportFeedback({
        severity: 'error',
        message: e instanceof Error ? e.message : 'Could not build PDF.',
      });
    }
  }, [withBlockingJob]);

  /**
   * "Save to Google Docs" handler. When the user clicks this without a Drive token, run the
   * Google sign-in flow inline (popup) before falling through to the export — much friendlier
   * than leaving the option disabled and asking the user to find the account menu themselves.
   * A cancelled or failed sign-in surfaces a snackbar and bails without touching the run.
   */
  const handleGoogleDocExport = useCallback(async () => {
    setExportMenuAnchor(null);

    if (!googleAccessTokenRef.current) {
      try {
        await withBlockingJob('Signing in to Google…', async () => {
          await signInWithGoogle();
        });
      } catch (e) {
        setExportFeedback({
          severity: 'error',
          message: e instanceof Error ? e.message : 'Could not sign in to Google.',
        });
        return;
      }
      if (!googleAccessTokenRef.current) {
        // Sign-in window closed / dismissed without granting Drive scope.
        return;
      }
    }

    const accessToken = googleAccessTokenRef.current;
    const current = editorRef.current?.getCurrentRun() ?? latestRunRef.current;
    const latestSong = songRef.current;
    const hadDoc = Boolean(current.drivePracticeExportGoogleDocId?.trim());
    try {
      await withBlockingJob(
        hadDoc ? 'Updating Google Doc…' : 'Creating Google Doc…',
        async () => {
          const res = await syncPracticeExerciseGoogleDoc({
            accessToken,
            song: latestSong,
            run: current,
          });
          const next = { ...current, ...res } as EncorePracticeExerciseRun;
          editorRef.current?.replaceRun(next);
          latestRunRef.current = next;
          setGoogleDocIdMirror(next.drivePracticeExportGoogleDocId?.trim() ?? null);
          persistSong(setSingleRunForKind(latestSong, touchExerciseRun(next)));
        },
      );
      setExportFeedback({
        severity: 'success',
        message: hadDoc ? 'Google Doc updated.' : 'Google Doc created.',
      });
    } catch (e) {
      setExportFeedback({
        severity: 'error',
        message: e instanceof Error ? e.message : 'Could not sync Google Doc.',
      });
    }
  }, [persistSong, signInWithGoogle, withBlockingJob]);

  const googleDocWebUrl = googleDocIdMirror
    ? `https://docs.google.com/document/d/${encodeURIComponent(googleDocIdMirror)}/edit`
    : null;

  const lyricsMainLayout = run.kind === 'lyricsInOwnWords';

  // Stable handler for the commit-canonical-lyrics flow used by inline blur + Apply Full Lyrics.
  // Closes over `songRef` so a new `song` from autosave doesn't recreate the callback.
  const handleCommitLyrics = useCallback(
    (nextRun: EncoreLyricsInOwnWordsExerciseRun) => {
      persistSong(songWithSyncedLyricsInOwnWordsAndResyncNarrative(songRef.current, nextRun));
    },
    [persistSong],
  );

  const body =
    initialRun.kind === 'lyricsInOwnWords' ? (
      <LyricsExerciseEditor
        key={initialRun.id}
        ref={editorRef}
        readOnly={readOnly}
        initialRun={initialRun}
        geniusUrl={geniusUrl}
        onDirty={onEditorDirty}
        onCommitLyrics={handleCommitLyrics}
      />
    ) : initialRun.kind === 'lyricsSectionNarrative' ? (
      <SectionNarrativeEditor
        key={initialRun.id}
        ref={editorRef}
        readOnly={readOnly}
        song={song}
        initialRun={initialRun}
        geniusUrl={geniusUrl}
        onDirty={onEditorDirty}
        onPersistSong={persistSong}
      />
    ) : (
      <NineQuestionsEditor
        key={initialRun.id}
        ref={editorRef}
        readOnly={readOnly}
        initialRun={initialRun}
        onDirty={onEditorDirty}
      />
    );

  return (
    <Dialog
      open={open}
      onClose={handleRequestClose as (event: object, reason: 'backdropClick' | 'escapeKeyDown') => void}
      fullScreen
      TransitionComponent={SlideUpTransition}
      aria-labelledby="practice-exercise-focus-title"
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar
          sx={{
            gap: 1.5,
            flexWrap: 'wrap',
            py: { xs: 1, sm: 0.5 },
          }}
        >
          <IconButton edge="start" onClick={handleRequestClose} aria-label="Close exercise">
            <CloseIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              id="practice-exercise-focus-title"
              component="span"
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, lineHeight: 1, display: 'block' }}
            >
              Guided exercise
            </Typography>
            <Typography component="span" variant="h6" sx={{ fontWeight: 800, display: 'block', lineHeight: 1.25 }}>
              {catalog.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {songTitle} · {songArtist}
            </Typography>
          </Box>
          {/*
            Menu lives outside this Stack so it cannot insert an invisible flex sibling.
            Export sits after Clear (destructive / secondary first, then export, then saves).
          */}
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
            sx={{
              flexShrink: 0,
              ml: { xs: 0, sm: 'auto' },
              maxWidth: '100%',
              rowGap: 0.5,
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
            }}
          >
            {readOnly ? (
              <>
                <Tooltip title="Reopen this exercise so you can keep editing it">
                  <Button
                    onClick={() => void handleReopenForEditing()}
                    startIcon={<UndoIcon />}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      flexShrink: 0,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    Mark in progress
                  </Button>
                </Tooltip>
                <Button onClick={handleRequestClose} sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}>
                  Close
                </Button>
              </>
            ) : (
              <Tooltip title="Discard everything in this exercise and remove it">
                <Button
                  onClick={handleClearDraft}
                  color="inherit"
                  startIcon={<RestartAltIcon />}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'text.secondary',
                    flexShrink: 0,
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  Clear
                </Button>
              </Tooltip>
            )}
            <Button
              variant="outlined"
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
              aria-haspopup="true"
              aria-expanded={Boolean(exportMenuAnchor)}
              aria-controls={exportMenuAnchor ? 'practice-exercise-export-menu' : undefined}
            >
              Export
            </Button>
            {!readOnly ? (
              <>
                <Button
                  variant="outlined"
                  onClick={persistDraft}
                  sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                  Save draft
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void handleMarkComplete()}
                  sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                  Mark complete
                </Button>
              </>
            ) : null}
          </Stack>
        </Toolbar>
      </AppBar>
      <Menu
        id="practice-exercise-export-menu"
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => void handleDownloadPdf()}>
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" aria-hidden />
          </ListItemIcon>
          <ListItemText primary="Download PDF" secondary="Plain layout, opens from Downloads" />
        </MenuItem>
        <MenuItem onClick={() => void handleGoogleDocExport()}>
          <ListItemIcon>
            <AddToDriveIcon fontSize="small" aria-hidden />
          </ListItemIcon>
          <ListItemText
            primary={googleDocIdMirror ? 'Update Google Doc' : 'Save to Google Docs'}
            secondary={
              googleAccessToken
                ? 'Same Doc is updated each time you sync'
                : "We'll sign you in to Google first"
            }
          />
        </MenuItem>
              {googleDocWebUrl && googleAccessToken ? (
                <MenuItem
                  onClick={() => {
                    setExportMenuAnchor(null);
                    window.open(googleDocWebUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <ListItemIcon>
                    <OpenInNewIcon fontSize="small" aria-hidden />
                  </ListItemIcon>
                  <ListItemText primary="Open in Google Docs" />
                </MenuItem>
              ) : null}
      </Menu>
      <LabsFeedbackToast
        message={exportFeedback?.message ?? null}
        severity={exportFeedback?.severity ?? 'success'}
        autoHideDuration={exportFeedback?.severity === 'error' ? 9000 : 5000}
        onClose={() => setExportFeedback(null)}
      />
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: lyricsMainLayout ? 'background.paper' : 'background.default',
          px: lyricsMainLayout ? { xs: 1.25, sm: 2, md: 3 } : { xs: 2, sm: 3, md: 4 },
          py: lyricsMainLayout ? { xs: 1, sm: 1.35 } : { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ maxWidth: lyricsMainLayout ? 'none' : 1280, mx: 'auto', width: 1 }}>{body}</Box>
      </Box>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lyrics — one scroll; CSS grid pairs each source line with its rewrite; section headers span both columns.
// Canonical originals live on {@link EncoreSong.lyricsSourceGenius} (Genius-style markers).
// ─────────────────────────────────────────────────────────────────────────────

/** Lyrics body fills the modal. no nested “card”; chrome comes from the modal shell. */
function lyricsWritelyMainSx(): object {
  return {
    width: 1,
    maxWidth: 1,
    bgcolor: 'transparent',
    border: 'none',
    borderRadius: 0,
    boxShadow: 'none',
    px: 0,
    py: 0,
    boxSizing: 'border-box',
  };
}

function lyricsDocInputSx(theme: Theme): object {
  return {
    width: '100%',
    display: 'block',
    fontSize: '1.03125rem',
    lineHeight: 1.52,
    fontFamily: theme.typography.body1.fontFamily ?? 'system-ui',
    letterSpacing: '0.008em',
    color: theme.palette.text.primary,
    py: 0.05,
    px: 0,
    border: 'none',
    borderRadius: 0,
    outline: 'none',
    bgcolor: 'transparent',
    resize: 'none' as const,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    '&:focus': { outline: 'none' },
    '&:focus-visible': {
      boxShadow: `inset 0 -1px 0 0 ${alpha(theme.palette.primary.main, 0.5)}`,
    },
    '&::placeholder': {
      color: alpha(theme.palette.text.secondary, 0.4),
      fontStyle: 'italic',
    },
  };
}

/** Section label. no rules, only space + muted primary. */
function lyricsWritelySectionHeadingSx(theme: Theme, opts: { isFirst: boolean }): object {
  return {
    mt: opts.isFirst ? 0.125 : 1.65,
    mb: 0.55,
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.11em',
    color: alpha(theme.palette.primary.main, 0.72),
    textTransform: 'uppercase',
    display: 'block',
    userSelect: 'none',
  };
}

/** Highlight fill only while empty (no stroke. reads as highlighter, not a form field). */
function lyricsWritelyRewriteShellSx(theme: Theme, unfilled: boolean): object {
  if (unfilled) {
    return {
      borderRadius: 0,
      px: 0.5,
      py: 0.15,
      bgcolor: alpha(theme.palette.primary.main, 0.1),
      boxShadow: 'none',
      transition: 'background-color 90ms ease',
      '&:focus-within': {
        bgcolor: alpha(theme.palette.primary.main, 0.14),
      },
    };
  }
  return {
    borderRadius: 0,
    px: 0.5,
    py: 0.15,
    bgcolor: 'transparent',
    boxShadow: 'none',
    transition: 'background-color 90ms ease',
  };
}

function lyricsWritelySourceInputSx(theme: Theme): object {
  return {
    ...lyricsDocInputSx(theme),
    color: alpha(theme.palette.text.primary, 0.92),
    '&:focus-visible': {
      boxShadow: `inset 0 -1px 0 0 ${alpha(theme.palette.primary.main, 0.3)}`,
    },
  };
}

function lyricsWritelyRewriteInputSx(theme: Theme): object {
  return {
    ...lyricsDocInputSx(theme),
    '&:focus-visible': {
      boxShadow: 'none',
    },
  };
}

/** Plain lines for one parsed section. shown beside section narrative notes. */
function sourceBodyTextForLyricsSection(sec: EncoreLyricsExerciseSection | undefined): string {
  if (!sec?.lines?.length) return '';
  return sec.lines.map((l) => l.original).join('\n');
}

/**
 * Imperative handle each editor exposes so the dialog can read the in-progress run on demand
 * (for export, mark-complete, autosave flush) without having to mirror typing state back up.
 * Keeping `local` inside the editor is what stops every keystroke from re-rendering the dialog
 * shell (AppBar, Toolbar, Buttons, Menu, Snackbar) — see {@link PracticeExerciseFocusDialog}.
 *
 * `replaceRun` is used by Google Doc export to splice the returned doc id into the live run.
 */
type EncoreExerciseEditorHandle = {
  getCurrentRun: () => EncorePracticeExerciseRun;
  replaceRun: (run: EncorePracticeExerciseRun) => void;
};

/** Per-edit callback the editor fires whenever its local run state changes (typing, etc.). */
type EncoreExerciseDirtyCallback = (run: EncorePracticeExerciseRun) => void;

const LyricsSideBySideLineRow = memo(function LyricsSideBySideLineRow({
  sectionIdx,
  lineIdx,
  original,
  rewrite,
  readOnly,
  onPatch,
  onBlurOriginal,
}: {
  sectionIdx: number;
  lineIdx: number;
  original: string;
  rewrite: string;
  readOnly: boolean;
  onPatch: (si: number, li: number, p: Partial<{ original: string; rewrite: string }>) => void;
  onBlurOriginal: () => void;
}): ReactElement {
  const theme = useTheme();
  const minRows = useMemo(() => Math.max(1, original.split(/\r?\n/).length), [original]);
  const label = useMemo(() => original.slice(0, 120).replace(/\s+/g, ' '), [original]);
  const unfilled = rewrite.trim().length === 0;
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        gap: { xs: 0.75, sm: 2 },
        alignItems: 'flex-start',
        mb: 0.35,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 0.5 } }}>
        <InputBase
          multiline
          minRows={minRows}
          maxRows={8}
          readOnly={readOnly}
          value={original}
          onChange={(e) => onPatch(sectionIdx, lineIdx, { original: e.target.value })}
          onBlur={onBlurOriginal}
          inputProps={{ 'aria-label': `Source line: ${label}` }}
          sx={lyricsWritelySourceInputSx(theme)}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={lyricsWritelyRewriteShellSx(theme, unfilled)}>
          <InputBase
            multiline
            minRows={minRows}
            maxRows={8}
            readOnly={readOnly}
            value={rewrite}
            onChange={(e) => onPatch(sectionIdx, lineIdx, { rewrite: e.target.value })}
            inputProps={{ 'aria-label': `Rewrite for: ${label}` }}
            sx={lyricsWritelyRewriteInputSx(theme)}
          />
        </Box>
      </Box>
    </Stack>
  );
});

/**
 * Modal for editing the full Genius-formatted lyrics block in one shot. Shared by the lyrics
 * rewriter and the section-by-section narrative editor so the bulk-edit UX (copy, layout,
 * "Apply & save to song" button) stays in lock-step. The caller owns the draft state and the
 * apply handler — that's where the per-exercise merge logic lives (rewrite-aware vs.
 * narrative-aware).
 */
const BulkLyricsEditDialog = memo(function BulkLyricsEditDialog({
  open,
  onClose,
  readOnly,
  value,
  onChange,
  onApply,
  description,
}: {
  open: boolean;
  onClose: () => void;
  readOnly: boolean;
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  description: ReactNode;
}): ReactElement {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="lyrics-bulk-dialog-title"
    >
      <DialogTitle id="lyrics-bulk-dialog-title">Edit full lyrics</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
          {description}
        </Typography>
        <InputBase
          multiline
          minRows={16}
          maxRows={32}
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputProps={{ 'aria-label': 'Full lyrics in Genius format' }}
          sx={{ ...lyricsDocInputSx(theme), width: 1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onApply} disabled={readOnly} sx={{ textTransform: 'none' }}>
          Apply &amp; save to song
        </Button>
      </DialogActions>
    </Dialog>
  );
});

/**
 * Editable section heading for the lyrics rewriter. The input inherits the heading typography so
 * a custom title (e.g. "Verse 1") and the placeholder auto-label (e.g. "Section 2") render
 * identically. We only paint a subtle underline on hover / focus so the affordance reads as
 * "this small caps label is clickable" rather than a stand-out form field. Read-only mode
 * collapses to a non-interactive Typography so guests / completed runs stay quiet.
 */
const LyricsSectionTitleInput = memo(function LyricsSectionTitleInput({
  value,
  placeholder,
  readOnly,
  sectionIdx,
  isFirst,
  onPatchTitle,
}: {
  value: string;
  placeholder: string;
  readOnly: boolean;
  sectionIdx: number;
  isFirst: boolean;
  onPatchTitle: (sectionIdx: number, title: string) => void;
}): ReactElement {
  const theme = useTheme();
  const headingSx = lyricsWritelySectionHeadingSx(theme, { isFirst });

  if (readOnly) {
    return (
      <Typography component="h3" sx={headingSx}>
        {value.trim() || placeholder}
      </Typography>
    );
  }

  return (
    <InputBase
      value={value}
      placeholder={placeholder}
      onChange={(e) => onPatchTitle(sectionIdx, e.target.value)}
      inputProps={{
        'aria-label': `Section ${sectionIdx + 1} title (defaults to "${placeholder}")`,
        maxLength: 120,
      }}
      sx={{
        ...headingSx,
        display: 'block',
        // The Typography heading was `display: 'block'`; preserve that vertical rhythm while
        // letting the input shrink-wrap to its content via an inner max-width on the editable
        // element below.
        width: 1,
        userSelect: 'auto',
        '& .MuiInputBase-input': {
          // Inherit the heading typography (small caps, primary-tinted) directly so the value
          // and placeholder render identically to the legacy non-editable heading.
          font: 'inherit',
          color: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          padding: 0,
          paddingBottom: '2px',
          borderBottom: '1px dashed transparent',
          transition: 'border-color 120ms ease',
          maxWidth: 'fit-content',
          minWidth: '6ch',
          '&::placeholder': {
            color: 'inherit',
            opacity: 0.6,
          },
        },
        '&:hover .MuiInputBase-input': {
          borderBottomColor: (th) => alpha(th.palette.primary.main, 0.4),
        },
        '&.Mui-focused .MuiInputBase-input': {
          borderBottomColor: (th) => th.palette.primary.main,
        },
      }}
    />
  );
});

/**
 * Owns its `local` state so the parent dialog never re-renders on a keystroke. Exposes the
 * current run + a replacer through {@link EncoreExerciseEditorHandle}, and notifies the parent
 * via `onDirty` after each change. `onCommitLyrics` is reserved for the "commit canonical
 * lyrics to the song" flow (inline-blur + Apply Full Lyrics) — autosave handles routine
 * persistence on its own debounce.
 */
const LyricsExerciseEditor = forwardRef<
  EncoreExerciseEditorHandle,
  {
    readOnly: boolean;
    initialRun: EncoreLyricsInOwnWordsExerciseRun;
    geniusUrl: string;
    onDirty: EncoreExerciseDirtyCallback;
    onCommitLyrics: (nextRun: EncoreLyricsInOwnWordsExerciseRun) => void;
  }
>(function LyricsExerciseEditor(
  { readOnly, initialRun, geniusUrl, onDirty, onCommitLyrics },
  ref,
): ReactElement {
  const theme = useTheme();
  const [local, setLocal] = useState<EncoreLyricsInOwnWordsExerciseRun>(initialRun);
  const localRef = useRef(local);
  localRef.current = local;

  useImperativeHandle(
    ref,
    () => ({
      getCurrentRun: () => localRef.current,
      replaceRun: (run) => {
        if (run.kind !== 'lyricsInOwnWords') return;
        setLocal(run);
      },
    }),
    [],
  );

  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const firstDirtyTickSkipped = useRef(false);
  useEffect(() => {
    if (!firstDirtyTickSkipped.current) {
      firstDirtyTickSkipped.current = true;
      return;
    }
    onDirtyRef.current(local);
  }, [local]);

  const sections = useMemo(() => effectiveLyricsSections(local), [local]);
  const sourceText = local.pastedLyrics ?? '';

  const handleSourceLyricsChange = useCallback(
    (raw: string) => {
      if (readOnly) return;
      setLocal((prev) => {
        const sectionsNow = effectiveLyricsSections(prev);
        const parsed = parseGeniusLyricsIntoSections(raw);
        const merged = mergeParsedSectionsWithExisting(parsed, sectionsNow);
        const withPos = applyPositionalLyricsFallback(merged, sectionsNow);
        return { ...prev, pastedLyrics: raw, sections: withPos, lines: undefined };
      });
    },
    [readOnly],
  );

  const handleInitialSourceBlur = useCallback(() => {
    if (readOnly) return;
    const r = localRef.current;
    const raw = r.pastedLyrics ?? '';
    const existing = effectiveLyricsSections(r);
    const parsed = parseGeniusLyricsIntoSections(raw);
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    const withPos = applyPositionalLyricsFallback(merged, existing);
    const nextRun: EncoreLyricsInOwnWordsExerciseRun = {
      ...r,
      pastedLyrics: undefined,
      sections: withPos,
      lines: undefined,
    };
    setLocal(nextRun);
    onCommitLyrics(nextRun);
  }, [readOnly, onCommitLyrics]);

  const patchLine = useCallback(
    (sectionIdx: number, lineIdx: number, patch: Partial<{ original: string; rewrite: string }>) => {
      if (readOnly) return;
      setLocal((prev) => {
        const secs = effectiveLyricsSections(prev);
        const sec = secs[sectionIdx];
        if (!sec) return prev;
        const line = sec.lines[lineIdx];
        if (!line) return prev;
        const nextLine = { ...line, ...patch };
        if (nextLine.original === line.original && nextLine.rewrite === line.rewrite) return prev;
        const newLines = sec.lines.map((l, j) => (j === lineIdx ? nextLine : l));
        const newSecs = secs.map((s, i) => (i === sectionIdx ? { ...s, lines: newLines } : s));
        return { ...prev, sections: newSecs, lines: undefined };
      });
    },
    [readOnly],
  );

  /**
   * Patches a section's `title` in place (no re-serialize / re-parse). Going through the parser
   * would mangle adjacent untitled sections in the mixed-state case; titles are pure metadata
   * so a direct state patch is correct here.
   */
  const patchSectionTitle = useCallback(
    (sectionIdx: number, title: string) => {
      if (readOnly) return;
      setLocal((prev) => {
        const secs = effectiveLyricsSections(prev);
        const sec = secs[sectionIdx];
        if (!sec || sec.title === title) return prev;
        const newSecs = secs.map((s, i) => (i === sectionIdx ? { ...s, title } : s));
        return { ...prev, sections: newSecs, lines: undefined };
      });
    },
    [readOnly],
  );

  /** Re-parse after inline source edits (markers may move). Does not persist to the song. use Save draft or bulk Apply. */
  const handleInlineSourceBlur = useCallback(() => {
    if (readOnly) return;
    setLocal((prev) => {
      const existing = effectiveLyricsSections(prev);
      const raw = serializeLyricsSectionsToRaw(existing);
      const parsed = parseGeniusLyricsIntoSections(raw);
      const merged = mergeParsedSectionsWithExisting(parsed, existing);
      const withPos = applyPositionalLyricsFallback(merged, existing);
      return { ...prev, sections: withPos, pastedLyrics: undefined, lines: undefined };
    });
  }, [readOnly]);

  const { done, total } = lyricsRewriteProgressFromSections(sections);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState('');

  const openBulkDialog = useCallback(() => {
    setBulkDraft(serializeLyricsSectionsToRaw(effectiveLyricsSections(localRef.current)));
    setBulkDialogOpen(true);
  }, []);

  const applyBulkDialog = useCallback(() => {
    if (readOnly) return;
    const r = localRef.current;
    const existing = effectiveLyricsSections(r);
    const parsed = parseGeniusLyricsIntoSections(bulkDraft);
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    const withPos = applyPositionalLyricsFallback(merged, existing);
    const nextRun: EncoreLyricsInOwnWordsExerciseRun = {
      ...r,
      pastedLyrics: undefined,
      sections: withPos,
      lines: undefined,
    };
    setLocal(nextRun);
    onCommitLyrics(nextRun);
    setBulkDialogOpen(false);
  }, [bulkDraft, readOnly, onCommitLyrics]);

  return (
    <Stack spacing={2} sx={{ width: 1 }}>
      <Box
        sx={[
          lyricsWritelyMainSx(),
          {
            maxHeight: { xs: 'none', sm: 'min(88dvh - 80px, 900px)' },
            overflowY: { xs: 'visible', sm: 'auto' },
            overflowX: 'hidden',
          },
        ]}
      >
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45, maxWidth: 960 }}>
            Optional{' '}
            <Link href={geniusUrl} target="_blank" rel="noopener noreferrer">
              Genius
              <OpenInNewIcon sx={{ fontSize: 14, ml: 0.25, verticalAlign: '-2px' }} aria-hidden />
            </Link>
            . Edit originals inline or use <strong>Full lyrics</strong> for big pastes. Sections split on{' '}
            <code>[Verse]</code> / <code>[Chorus]</code> lines or on a blank line between paragraphs. rename
            any auto-labeled section by clicking its title. <strong>Save draft</strong> stores rewrites and
            syncs lyrics to the song.
          </Typography>

          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {total > 0 ? `${done} of ${total} lines` : 'No lines yet.'}
            </Typography>
            {!readOnly && sections.length > 0 ? (
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={openBulkDialog}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minWidth: 0, px: 0.75 }}
              >
                Full lyrics…
              </Button>
            ) : null}
          </Stack>

          {sections.length === 0 ? (
            <Stack spacing={1.25}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                Paste lyrics to begin. add a <code>[Section]</code> marker per heading, or just leave a blank
                line between paragraphs and we&rsquo;ll split them into sections you can rename.
              </Typography>
              <InputBase
                multiline
                minRows={14}
                maxRows={36}
                readOnly={readOnly}
                value={sourceText}
                onChange={(e) => handleSourceLyricsChange(e.target.value)}
                onBlur={handleInitialSourceBlur}
                placeholder={'[Verse 1]\nFirst line…\n\n[Chorus]\nHook line…'}
                inputProps={{ 'aria-label': 'Original song lyrics' }}
                sx={lyricsDocInputSx(theme)}
              />
            </Stack>
          ) : (
            <Stack spacing={0}>
              <Stack
                direction="row"
                spacing={0}
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  gap: 2,
                  alignItems: 'baseline',
                  mb: 1,
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ flex: 1, letterSpacing: '0.16em', fontWeight: 600, fontSize: '0.62rem', opacity: 0.75 }}
                >
                  Source
                </Typography>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ flex: 1, letterSpacing: '0.16em', fontWeight: 600, fontSize: '0.62rem', opacity: 0.75 }}
                >
                  Your words
                </Typography>
              </Stack>

              {sections.map((section, sectionIdx) => {
                const autoLabel = lyricsExerciseSectionDisplayLabel(
                  section,
                  sectionIdx,
                  sections.length,
                );
                return (
                  <Fragment key={`sec-${sectionIdx}`}>
                    <LyricsSectionTitleInput
                      value={section.title}
                      placeholder={autoLabel}
                      readOnly={readOnly}
                      sectionIdx={sectionIdx}
                      isFirst={sectionIdx === 0}
                      onPatchTitle={patchSectionTitle}
                    />
                    {section.lines.map((line, lineIdx) => (
                      <LyricsSideBySideLineRow
                        key={`${sectionIdx}-${lineIdx}`}
                        sectionIdx={sectionIdx}
                        lineIdx={lineIdx}
                        original={line.original}
                        rewrite={line.rewrite}
                        readOnly={readOnly}
                        onPatch={patchLine}
                        onBlurOriginal={handleInlineSourceBlur}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Box>

      <BulkLyricsEditDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        readOnly={readOnly}
        value={bulkDraft}
        onChange={setBulkDraft}
        onApply={applyBulkDialog}
        description={
          <>
            Put <code>[Verse 1]</code>, <code>[Chorus]</code>, etc. on their own line, or leave a blank line
            between paragraphs to split implicitly. Apply merges your rewrites into the new structure and
            saves originals to the song.
          </>
        }
      />
    </Stack>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section narrative — free text per Genius section; shared lyrics on the song.
// ─────────────────────────────────────────────────────────────────────────────

const SectionNarrativeAnswerRow = memo(function SectionNarrativeAnswerRow({
  title,
  placeholder,
  displayLabel,
  sourceBody,
  sourceEmptyKind,
  narrative,
  readOnly,
  sectionIndex,
  patchNarrative,
  patchTitle,
  patchSourceBody,
  onSourceBodyBlur,
  isFirst,
}: {
  title: string;
  placeholder: string;
  displayLabel: string;
  sourceBody: string;
  sourceEmptyKind: 'mismatch' | 'no-lines' | null;
  narrative: string;
  readOnly: boolean;
  sectionIndex: number;
  patchNarrative: (i: number, html: string) => void;
  patchTitle: (i: number, title: string) => void;
  patchSourceBody: (i: number, body: string) => void;
  onSourceBodyBlur: () => void;
  isFirst: boolean;
}): ReactElement {
  const theme = useTheme();
  const sourceAria = `Original lyrics for ${displayLabel}`;
  const onHtml = useCallback((html: string) => patchNarrative(sectionIndex, html), [patchNarrative, sectionIndex]);
  const onSourceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patchSourceBody(sectionIndex, e.target.value),
    [patchSourceBody, sectionIndex],
  );
  // Mismatch == we don't even have a parsed section at this index to attach the edit to, so
  // inline editing is disabled (the bulk dialog or the "Lyrics in your own words" editor is
  // the right escape hatch). Everything else — including empty `no-lines` sections — is
  // editable so the user can fill it in directly.
  const sourceEditable = !readOnly && sourceEmptyKind !== 'mismatch';
  return (
    <Box>
      <LyricsSectionTitleInput
        value={title}
        placeholder={placeholder}
        readOnly={readOnly}
        sectionIdx={sectionIndex}
        isFirst={isFirst}
        onPatchTitle={patchTitle}
      />
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 3 }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        sx={{ mt: 1.125 }}
      >
        <Box component="section" aria-label={sourceAria} sx={{ flex: 1, minWidth: 0, pr: { md: 0.5 } }}>
          {sourceEditable ? (
            <InputBase
              multiline
              minRows={Math.max(2, sourceBody.split(/\r?\n/).length)}
              value={sourceBody}
              onChange={onSourceChange}
              onBlur={onSourceBodyBlur}
              placeholder="Add the lines for this section…"
              inputProps={{ 'aria-label': sourceAria }}
              sx={{
                ...lyricsWritelySourceInputSx(theme),
                width: 1,
              }}
            />
          ) : sourceBody ? (
            <Typography
              component="div"
              variant="body2"
              sx={(t) => ({
                ...lyricsWritelySourceInputSx(t),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              })}
            >
              {sourceBody}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic' }}>
              {sourceEmptyKind === 'mismatch'
                ? 'This section no longer matches the saved lyrics. Use Full lyrics… to re-sync.'
                : 'No lines in this section.'}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, width: { xs: 1, md: 'auto' } }}>
          <EncoreTiptapAnswerField
            value={narrative}
            onChange={onHtml}
            readOnly={readOnly}
            placeholder="What is happening in the story here. moment, stakes, imagery?"
            aria-label={`Narrative for ${displayLabel}`}
          />
        </Box>
      </Stack>
    </Box>
  );
});

/**
 * Owns its `local` state so the parent dialog never re-renders on a keystroke. Exposes the
 * current run + a replacer through {@link EncoreExerciseEditorHandle}, and notifies the parent
 * via `onDirty` after each change.
 *
 * Note: `lyricsSourceGenius` is read off the live `song` prop (which the dialog passes through
 * stably). When the user pastes brand-new lyrics in the empty state, the editor calls
 * `onPersistSong` directly — that persist will re-flow `song` from the parent and the
 * conditional below detects the now-present lyrics on the next render.
 */
const SectionNarrativeEditor = forwardRef<
  EncoreExerciseEditorHandle,
  {
    readOnly: boolean;
    song: EncoreSong;
    initialRun: EncoreLyricsSectionNarrativeExerciseRun;
    geniusUrl: string;
    onDirty: EncoreExerciseDirtyCallback;
    onPersistSong: (next: EncoreSong) => void | Promise<void>;
  }
>(function SectionNarrativeEditor(
  { readOnly, song, initialRun, geniusUrl, onDirty, onPersistSong },
  ref,
): ReactElement {
  const theme = useTheme();
  const [local, setLocal] = useState<EncoreLyricsSectionNarrativeExerciseRun>(initialRun);
  const localRef = useRef(local);
  localRef.current = local;
  const songRef = useRef(song);
  songRef.current = song;

  useImperativeHandle(
    ref,
    () => ({
      getCurrentRun: () => localRef.current,
      replaceRun: (run) => {
        if (run.kind !== 'lyricsSectionNarrative') return;
        setLocal(run);
      },
    }),
    [],
  );

  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const firstDirtyTickSkipped = useRef(false);
  useEffect(() => {
    if (!firstDirtyTickSkipped.current) {
      firstDirtyTickSkipped.current = true;
      return;
    }
    onDirtyRef.current(local);
  }, [local]);

  const { done, total } = lyricsSectionNarrativeProgress(local.sections);
  const hasLyrics = Boolean(song.lyricsSourceGenius?.trim());
  const [pasteDraft, setPasteDraft] = useState(song.lyricsSourceGenius ?? '');
  const parsedLyricsSections = useMemo(
    () => parseGeniusLyricsIntoSections(song.lyricsSourceGenius?.trim() ?? ''),
    [song.lyricsSourceGenius],
  );

  useEffect(() => {
    if (!hasLyrics) setPasteDraft(song.lyricsSourceGenius ?? '');
  }, [hasLyrics, song.lyricsSourceGenius]);

  /**
   * Re-parses raw Genius lyrics into sections, merges existing narrative content by section
   * occurrence (preserving renamed titles), and persists the canonical lyrics + updated run to
   * the song. Shared by the empty-state paste box and the "Full lyrics…" bulk editor.
   */
  const commitRawLyrics = useCallback(
    (raw: string) => {
      if (readOnly) return;
      const trimmed = raw.trim();
      if (!trimmed) return;
      const parsed = parseGeniusLyricsIntoSections(trimmed);
      const canon = serializeLyricsSectionsToRaw(parsed);
      const currentRun = localRef.current;
      const mergedNarrative = mergeParsedNarrativeSectionsWithExisting(parsed, currentRun.sections);
      const nextRun = touchExerciseRun({ ...currentRun, sections: mergedNarrative });
      setLocal(nextRun as EncoreLyricsSectionNarrativeExerciseRun);
      const nextSong = setSingleRunForKind({ ...songRef.current, lyricsSourceGenius: canon }, nextRun);
      onPersistSong(nextSong);
    },
    [onPersistSong, readOnly],
  );

  const handlePasteLyricsBlur = useCallback(() => {
    commitRawLyrics(pasteDraft);
  }, [commitRawLyrics, pasteDraft]);

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState('');

  const openBulkDialog = useCallback(() => {
    // Seed from the canonical serialization (not the raw saved string) so the dialog opens with
    // the same `[Section]\n…` shape the parser will round-trip cleanly.
    const seed = serializeLyricsSectionsToRaw(parsedLyricsSections);
    setBulkDraft(seed);
    setBulkDialogOpen(true);
  }, [parsedLyricsSections]);

  const applyBulkDialog = useCallback(() => {
    commitRawLyrics(bulkDraft);
    setBulkDialogOpen(false);
  }, [bulkDraft, commitRawLyrics]);

  // ── Per-section inline source-body editing ────────────────────────────────────
  // `parsedLyricsSections` is the source of truth; an entry in `sourceDrafts` is the user's
  // unsaved edit for that section. On blur of any source field we flush all pending drafts as
  // a single `commitRawLyrics` call (so editing two sections back-to-back never silently drops
  // one), then clear the draft map — the next render reads the canonical bodies from the
  // freshly-persisted song.
  const [sourceDrafts, setSourceDrafts] = useState<Record<number, string>>({});
  const sourceDraftsRef = useRef(sourceDrafts);
  sourceDraftsRef.current = sourceDrafts;
  const parsedLyricsSectionsRef = useRef(parsedLyricsSections);
  parsedLyricsSectionsRef.current = parsedLyricsSections;

  const patchSourceBody = useCallback(
    (sectionIndex: number, body: string) => {
      if (readOnly) return;
      setSourceDrafts((prev) => {
        if (prev[sectionIndex] === body) return prev;
        return { ...prev, [sectionIndex]: body };
      });
    },
    [readOnly],
  );

  const onSourceBodyBlur = useCallback(() => {
    if (readOnly) return;
    const drafts = sourceDraftsRef.current;
    if (Object.keys(drafts).length === 0) return;
    const parsed = parsedLyricsSectionsRef.current;
    // Rebuild raw Genius lyrics from the parsed structure, substituting any draft body.
    // Use the parsed title (not the narrative title) so implicit sections stay implicit —
    // narrative-side renames are preserved through the merge's index fallback for empty
    // titles in `mergeParsedNarrativeSectionsWithExisting`.
    const blocks: string[] = [];
    for (let i = 0; i < parsed.length; i += 1) {
      const sec = parsed[i]!;
      const body = drafts[i] ?? sec.lines.map((l) => l.original).join('\n');
      const title = sec.title.trim();
      const block: string[] = [];
      if (title) block.push(`[${title}]`);
      for (const chunk of body.split(/\r?\n/)) {
        const t = chunk.trim();
        if (t) block.push(t);
      }
      if (block.length > 0) blocks.push(block.join('\n'));
    }
    const raw = blocks.join('\n\n');
    commitRawLyrics(raw);
    setSourceDrafts({});
  }, [commitRawLyrics, readOnly]);

  const patchNarrative = useCallback(
    (sectionIndex: number, html: string) => {
      if (readOnly) return;
      setLocal((prev) => {
        if (prev.sections[sectionIndex]?.narrative === html) return prev;
        const nextSections = prev.sections.map((s, j) => (j === sectionIndex ? { ...s, narrative: html } : s));
        return { ...prev, sections: nextSections };
      });
    },
    [readOnly],
  );

  /**
   * Patches a narrative section's title in place. Survival across re-syncs is handled by the
   * index-fallback branch of {@link mergeParsedNarrativeSectionsWithExisting}, so a user rename
   * sticks even when the underlying lyrics source still has the section as an untitled paragraph.
   */
  const patchNarrativeSectionTitle = useCallback(
    (sectionIndex: number, title: string) => {
      if (readOnly) return;
      setLocal((prev) => {
        const cur = prev.sections[sectionIndex];
        if (!cur || cur.title === title) return prev;
        const nextSections = prev.sections.map((s, j) => (j === sectionIndex ? { ...s, title } : s));
        return { ...prev, sections: nextSections };
      });
    },
    [readOnly],
  );

  if (!hasLyrics) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          This exercise uses the same Genius-style lyrics as <strong>Lyrics in your own words</strong>. Paste them here
          first (or finish that exercise) so each <code>[Verse]</code> / <code>[Chorus]</code> block becomes its own
          prompt. Optional{' '}
          <Link href={geniusUrl} target="_blank" rel="noopener noreferrer">
            Genius
            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.25, verticalAlign: '-2px' }} aria-hidden />
          </Link>
          .
        </Typography>
        <InputBase
          multiline
          minRows={16}
          readOnly={readOnly}
          value={pasteDraft}
          onChange={(e) => setPasteDraft(e.target.value)}
          onBlur={handlePasteLyricsBlur}
          placeholder={'[Verse 1]\nLine one…\n\n[Chorus]\nHook…'}
          inputProps={{ 'aria-label': 'Song lyrics in Genius format' }}
          sx={lyricsDocInputSx(theme)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ maxWidth: { xs: 1, md: 1100 }, mx: 'auto', width: 1 }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {ENCORE_PRACTICE_EXERCISE_CATALOG.lyricsSectionNarrative.description} If the same chorus returns later, treat
          it as a new beat: how has the story shifted since the last time we heard it? Edit a section&rsquo;s source
          lines inline to fix typos, or use <strong>Full lyrics&hellip;</strong> for a bigger rewrite.
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          sx={{ mt: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            {total > 0 ? `${done} of ${total} sections` : 'No sections in saved lyrics.'}
          </Typography>
          {!readOnly ? (
            <Button
              type="button"
              variant="text"
              size="small"
              onClick={openBulkDialog}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minWidth: 0, px: 0.75 }}
            >
              Full lyrics…
            </Button>
          ) : null}
        </Stack>
      </Box>

      <Stack
        direction="row"
        spacing={0}
        sx={{
          display: { xs: 'none', md: 'flex' },
          gap: 3,
          alignItems: 'baseline',
          mb: 0.5,
        }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ flex: 1, letterSpacing: '0.16em', fontWeight: 600, fontSize: '0.62rem', opacity: 0.75 }}
        >
          Source
        </Typography>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ flex: 1, letterSpacing: '0.16em', fontWeight: 600, fontSize: '0.62rem', opacity: 0.75 }}
        >
          Your notes
        </Typography>
      </Stack>

      <Stack spacing={3}>
        {local.sections.map((sec, i) => {
          const lyricSec = parsedLyricsSections[i];
          const parsedSourceBody = sourceBodyTextForLyricsSection(lyricSec);
          // A pending in-flight edit for this section overrides the parsed body until blur
          // flushes drafts. Skip the draft entirely when the section has no parsed counterpart
          // (mismatch) so the row stays read-only and prompts the user toward Full lyrics.
          const draft = sourceDrafts[i];
          const sourceBody = lyricSec !== undefined && draft !== undefined ? draft : parsedSourceBody;
          // Narrative sections store `{title, narrative}`; adapt to the section-shape the label
          // helpers expect (only `.title` is read).
          const sectionShape = { title: sec.title, lines: [] };
          const displayLabel = lyricsExerciseSectionDisplayLabel(sectionShape, i, local.sections.length);
          const sourceEmptyKind: 'mismatch' | 'no-lines' | null = sourceBody
            ? null
            : lyricSec === undefined
              ? 'mismatch'
              : 'no-lines';
          return (
            <SectionNarrativeAnswerRow
              key={`narrative-sec-${i}`}
              title={sec.title}
              placeholder={displayLabel}
              displayLabel={displayLabel}
              sourceBody={sourceBody}
              sourceEmptyKind={sourceEmptyKind}
              narrative={sec.narrative}
              readOnly={readOnly}
              sectionIndex={i}
              patchNarrative={patchNarrative}
              patchTitle={patchNarrativeSectionTitle}
              patchSourceBody={patchSourceBody}
              onSourceBodyBlur={onSourceBodyBlur}
              isFirst={i === 0}
            />
          );
        })}
      </Stack>

      <BulkLyricsEditDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        readOnly={readOnly}
        value={bulkDraft}
        onChange={setBulkDraft}
        onApply={applyBulkDialog}
        description={
          <>
            Put <code>[Verse 1]</code>, <code>[Chorus]</code>, etc. on their own line, or leave a blank line
            between paragraphs to split implicitly. Apply re-syncs section prompts and keeps the notes you
            already wrote for each section.
          </>
        }
      />
    </Stack>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Nine-questions editor
// ─────────────────────────────────────────────────────────────────────────────

const CharacterNineQuestionItem = memo(function CharacterNineQuestionItem({
  title,
  answerHtml,
  readOnly,
  index,
  patchAnswer,
}: {
  title: string;
  answerHtml: string;
  readOnly: boolean;
  index: number;
  patchAnswer: (i: number, html: string) => void;
}): ReactElement {
  const onFieldChange = useCallback((html: string) => patchAnswer(index, html), [patchAnswer, index]);
  return (
    <Box>
      <Typography
        variant="subtitle2"
        component="h3"
        sx={{ fontWeight: 700, mb: 0.75, color: 'text.primary', letterSpacing: '-0.01em' }}
      >
        {title}
      </Typography>
      <EncoreTiptapAnswerField
        value={answerHtml}
        onChange={onFieldChange}
        readOnly={readOnly}
        placeholder="Write as much as helps. paragraphs are welcome."
        aria-label={title}
      />
    </Box>
  );
});

/**
 * Owns its `local` state so the parent dialog never re-renders on a keystroke. Exposes the
 * current run + a replacer through {@link EncoreExerciseEditorHandle}, and notifies the parent
 * via `onDirty` after each change (the dialog uses that for autosave and to keep
 * `latestRunRef` warm for export / mark-complete handlers).
 */
const NineQuestionsEditor = forwardRef<
  EncoreExerciseEditorHandle,
  {
    readOnly: boolean;
    initialRun: EncoreCharacterNineQuestionsExerciseRun;
    onDirty: EncoreExerciseDirtyCallback;
  }
>(function NineQuestionsEditor({ readOnly, initialRun, onDirty }, ref): ReactElement {
  const [local, setLocal] = useState<EncoreCharacterNineQuestionsExerciseRun>(initialRun);
  const localRef = useRef(local);
  localRef.current = local;

  useImperativeHandle(
    ref,
    () => ({
      getCurrentRun: () => localRef.current,
      replaceRun: (run) => {
        if (run.kind !== 'characterNineQuestions') return;
        setLocal(run);
      },
    }),
    [],
  );

  // Notify the dialog about edits after commit (skip the mount fire — the initial run is
  // already known upstream). Reads onDirty through a ref so prop instability does not re-fire
  // the effect after every keystroke.
  const onDirtyRef = useRef(onDirty);
  onDirtyRef.current = onDirty;
  const firstDirtyTickSkipped = useRef(false);
  useEffect(() => {
    if (!firstDirtyTickSkipped.current) {
      firstDirtyTickSkipped.current = true;
      return;
    }
    onDirtyRef.current(local);
  }, [local]);

  const { done, total } = nineQuestionsProgress(local.answers);
  const padded = useMemo(() => {
    const a = [...local.answers];
    while (a.length < ENCORE_CHARACTER_NINE_QUESTION_COUNT) a.push('');
    return a.slice(0, ENCORE_CHARACTER_NINE_QUESTION_COUNT);
  }, [local.answers]);

  const patchAnswer = useCallback(
    (index: number, html: string) => {
      if (readOnly) return;
      setLocal((prev) => {
        const pad = [...prev.answers];
        while (pad.length < ENCORE_CHARACTER_NINE_QUESTION_COUNT) pad.push('');
        const base = pad.slice(0, ENCORE_CHARACTER_NINE_QUESTION_COUNT);
        if ((base[index] ?? '') === html) return prev;
        const next = [...base];
        next[index] = html;
        return { ...prev, answers: next };
      });
    },
    [readOnly],
  );

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
          {ENCORE_PRACTICE_EXERCISE_CATALOG.characterNineQuestions.description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {done} of {total} answered
        </Typography>
      </Box>
      <Stack spacing={2.75}>
        {ENCORE_CHARACTER_NINE_QUESTION_TITLES.map((qTitle, i) => (
          <CharacterNineQuestionItem
            key={qTitle}
            title={qTitle}
            answerHtml={padded[i] ?? ''}
            readOnly={readOnly}
            index={i}
            patchAnswer={patchAnswer}
          />
        ))}
      </Stack>
    </Stack>
  );
});
