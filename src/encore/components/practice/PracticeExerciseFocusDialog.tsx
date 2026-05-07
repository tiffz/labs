import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import CloseIcon from '@mui/icons-material/Close';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AppBar from '@mui/material/AppBar';
import Alert from '@mui/material/Alert';
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
import Snackbar from '@mui/material/Snackbar';
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
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactElement,
  type Ref,
  type SetStateAction,
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
  withBlockingJob,
  onClose,
  onPersistSong,
  onClearDraft,
}: PracticeExerciseFocusDialogProps): ReactElement {
  const [local, setLocal] = useState(() => cloneRun(run));
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportFeedback, setExportFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setLocal(() => {
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
    });
    // Omit `run.updatedAt`: autosave bumps it and would overwrite faster typing. Sync on identity / external lyrics only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps (see above)
  }, [open, run.id, run.kind, song.lyricsSourceGenius, song.id]);

  const geniusUrl = useMemo(() => geniusSearchUrlForSong(songTitle, songArtist), [songTitle, songArtist]);
  const catalog = ENCORE_PRACTICE_EXERCISE_CATALOG[local.kind];

  const persistSong = useCallback(
    (next: EncoreSong): void | Promise<void> => onPersistSong(stampUpdatedAt(next)),
    [onPersistSong],
  );

  const songRef = useRef(song);
  songRef.current = song;
  const localRef = useRef(local);
  localRef.current = local;
  const autosaveTimerRef = useRef<number | null>(null);

  /** Writes the current dialog draft to Dexie via `saveSong` (awaitable for crash / tab-hide safety). */
  const flushDraftToDb = useCallback(async (): Promise<void> => {
    if (readOnly) return;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const latestSong = songRef.current;
    const latestLocal = localRef.current;
    if (latestLocal.kind === 'lyricsInOwnWords') {
      await Promise.resolve(
        persistSong(
          songWithSyncedLyricsInOwnWordsAndResyncNarrative(
            latestSong,
            latestLocal as EncoreLyricsInOwnWordsExerciseRun,
          ),
        ),
      );
      return;
    }
    await Promise.resolve(persistSong(setSingleRunForKind(latestSong, touchExerciseRun(latestLocal))));
  }, [readOnly, persistSong]);

  const persistDraft = useCallback(() => {
    void flushDraftToDb();
  }, [flushDraftToDb]);

  /** Debounced autosave: fewer Dexie live-query churns than sub-second while typing. */
  const AUTOSAVE_MS = 1100;

  useEffect(() => {
    if (!open || readOnly) return;
    if (autosaveTimerRef.current != null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushDraftToDb();
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [local, open, readOnly, flushDraftToDb]);

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
    if (readOnly) return;
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    try {
      if (local.kind === 'lyricsInOwnWords') {
        const completed = markExerciseRunCompleted(touchExerciseRun(local));
        await Promise.resolve(
          persistSong(
            songWithSyncedLyricsInOwnWordsAndResyncNarrative(song, completed as EncoreLyricsInOwnWordsExerciseRun),
          ),
        );
      } else {
        await Promise.resolve(
          persistSong(setSingleRunForKind(song, markExerciseRunCompleted(touchExerciseRun(local)))),
        );
      }
    } finally {
      onClose();
    }
  }, [local, onClose, persistSong, readOnly, song]);

  const handleClearDraft = useCallback(() => {
    if (readOnly) return;
    onClearDraft();
  }, [onClearDraft, readOnly]);

  const handleDownloadPdf = useCallback(async () => {
    setExportMenuAnchor(null);
    try {
      await withBlockingJob('Building PDF…', async () => {
        const bytes = await buildPracticeExercisePdfBytes(song, local);
        downloadPracticeExercisePdf(song, local, bytes);
      });
    } catch (e) {
      setExportFeedback({
        severity: 'error',
        message: e instanceof Error ? e.message : 'Could not build PDF.',
      });
    }
  }, [local, song, withBlockingJob]);

  const handleGoogleDocExport = useCallback(async () => {
    if (!googleAccessToken) return;
    setExportMenuAnchor(null);
    const hadDoc = Boolean(local.drivePracticeExportGoogleDocId?.trim());
    try {
      await withBlockingJob(
        hadDoc ? 'Updating Google Doc…' : 'Creating Google Doc…',
        async () => {
          const res = await syncPracticeExerciseGoogleDoc({
            accessToken: googleAccessToken,
            song,
            run: local,
          });
          const next = { ...local, ...res } as EncorePracticeExerciseRun;
          setLocal(next);
          persistSong(setSingleRunForKind(song, touchExerciseRun(next)));
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
  }, [googleAccessToken, local, persistSong, song, withBlockingJob]);

  const googleDocWebUrl = local.drivePracticeExportGoogleDocId?.trim()
    ? `https://docs.google.com/document/d/${encodeURIComponent(local.drivePracticeExportGoogleDocId.trim())}/edit`
    : null;

  const lyricsMainLayout = local.kind === 'lyricsInOwnWords';

  const body =
    local.kind === 'lyricsInOwnWords' ? (
      <LyricsExerciseEditor
        readOnly={readOnly}
        run={local}
        geniusUrl={geniusUrl}
        onChange={setLocal}
        onCommitLyrics={(nextRun) => {
          persistSong(songWithSyncedLyricsInOwnWordsAndResyncNarrative(song, nextRun));
        }}
      />
    ) : local.kind === 'lyricsSectionNarrative' ? (
      <SectionNarrativeEditor
        readOnly={readOnly}
        song={song}
        run={local}
        geniusUrl={geniusUrl}
        onChange={setLocal}
        onPersistSong={persistSong}
      />
    ) : (
      <NineQuestionsEditor readOnly={readOnly} run={local} onChange={setLocal} />
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
              <Button onClick={handleRequestClose} sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}>
                Close
              </Button>
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
        <Tooltip
          title={!googleAccessToken ? 'Sign in with Google (Account menu) to save to Drive.' : ''}
          placement="left"
        >
            <span>
                  <MenuItem onClick={() => void handleGoogleDocExport()} disabled={!googleAccessToken}>
                    <ListItemIcon>
                      <AddToDriveIcon fontSize="small" aria-hidden />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        local.drivePracticeExportGoogleDocId?.trim()
                          ? 'Update Google Doc'
                          : 'Save to Google Docs'
                      }
                      secondary="Same Doc is updated each time you sync"
                    />
                  </MenuItem>
                </span>
              </Tooltip>
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
      <Snackbar
        open={Boolean(exportFeedback)}
        autoHideDuration={exportFeedback?.severity === 'error' ? 9000 : 5000}
        onClose={() => setExportFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {exportFeedback ? (
          <Alert severity={exportFeedback.severity} onClose={() => setExportFeedback(null)} sx={{ width: '100%' }}>
            {exportFeedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
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

/** Lyrics body fills the modal — no nested “card”; chrome comes from the modal shell. */
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

/** Section label — no rules, only space + muted primary. */
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

/** Highlight fill only while empty (no stroke — reads as highlighter, not a form field). */
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

/** Plain lines for one parsed section — shown beside section narrative notes. */
function sourceBodyTextForLyricsSection(sec: EncoreLyricsExerciseSection | undefined): string {
  if (!sec?.lines?.length) return '';
  return sec.lines.map((l) => l.original).join('\n');
}

type EncoreRunDispatch = Dispatch<SetStateAction<EncorePracticeExerciseRun>>;

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

function LyricsExerciseEditor({
  readOnly,
  run,
  geniusUrl,
  onChange,
  onCommitLyrics,
}: {
  readOnly: boolean;
  run: EncoreLyricsInOwnWordsExerciseRun;
  geniusUrl: string;
  onChange: EncoreRunDispatch;
  onCommitLyrics: (nextRun: EncoreLyricsInOwnWordsExerciseRun) => void;
}): ReactElement {
  const theme = useTheme();
  const sections = useMemo(() => effectiveLyricsSections(run), [run]);
  const sourceText = run.pastedLyrics ?? '';
  const runRef = useRef(run);
  runRef.current = run;

  const handleSourceLyricsChange = useCallback(
    (raw: string) => {
      if (readOnly) return;
      onChange((prev) => {
        if (prev.kind !== 'lyricsInOwnWords') return prev;
        const sectionsNow = effectiveLyricsSections(prev);
        const parsed = parseGeniusLyricsIntoSections(raw);
        const merged = mergeParsedSectionsWithExisting(parsed, sectionsNow);
        const withPos = applyPositionalLyricsFallback(merged, sectionsNow);
        return { ...prev, pastedLyrics: raw, sections: withPos, lines: undefined };
      });
    },
    [readOnly, onChange],
  );

  const handleInitialSourceBlur = useCallback(() => {
    if (readOnly) return;
    const r = runRef.current;
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
    onChange(nextRun);
    onCommitLyrics(nextRun);
  }, [readOnly, onChange, onCommitLyrics]);

  const patchLine = useCallback(
    (sectionIdx: number, lineIdx: number, patch: Partial<{ original: string; rewrite: string }>) => {
      if (readOnly) return;
      onChange((prev) => {
        if (prev.kind !== 'lyricsInOwnWords') return prev;
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
    [onChange, readOnly],
  );

  /** Re-parse after inline source edits (markers may move). Does not persist to the song — use Save draft or bulk Apply. */
  const handleInlineSourceBlur = useCallback(() => {
    if (readOnly) return;
    const r = runRef.current;
    const existing = effectiveLyricsSections(r);
    const raw = serializeLyricsSectionsToRaw(existing);
    const parsed = parseGeniusLyricsIntoSections(raw);
    const merged = mergeParsedSectionsWithExisting(parsed, existing);
    const withPos = applyPositionalLyricsFallback(merged, existing);
    onChange({ ...r, sections: withPos, pastedLyrics: undefined, lines: undefined });
  }, [readOnly, onChange]);

  const { done, total } = lyricsRewriteProgressFromSections(sections);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDraft, setBulkDraft] = useState('');

  const openBulkDialog = useCallback(() => {
    const r = runRef.current;
    setBulkDraft(serializeLyricsSectionsToRaw(effectiveLyricsSections(r)));
    setBulkDialogOpen(true);
  }, []);

  const applyBulkDialog = useCallback(() => {
    if (readOnly) return;
    const r = runRef.current;
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
    onChange(nextRun);
    onCommitLyrics(nextRun);
    setBulkDialogOpen(false);
  }, [bulkDraft, readOnly, onChange, onCommitLyrics]);

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
            . Edit originals inline or use <strong>Full lyrics</strong> for big pastes. Section headings follow{' '}
            <code>[Verse]</code> / <code>[Chorus]</code> lines. <strong>Save draft</strong> stores rewrites and syncs
            lyrics to the song.
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
                Paste Genius-style lyrics to begin — one <code>[Section]</code> marker per line where you need a break.
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

              {sections.map((section, sectionIdx) => (
                <Fragment key={`sec-${sectionIdx}`}>
                  <Typography component="h3" sx={lyricsWritelySectionHeadingSx(theme, { isFirst: sectionIdx === 0 })}>
                    {section.title.trim() ? `[${section.title}]` : 'Lyrics'}
                  </Typography>
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
              ))}
            </Stack>
          )}
        </Stack>
      </Box>

      <Dialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby="lyrics-bulk-dialog-title"
      >
        <DialogTitle id="lyrics-bulk-dialog-title">Edit full lyrics</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
            Genius-style text: put <code>[Verse 1]</code>, <code>[Chorus]</code>, etc. on their own line. Apply merges
            your rewrites into the new structure and saves originals to the song.
          </Typography>
          <InputBase
            multiline
            minRows={16}
            maxRows={32}
            readOnly={readOnly}
            value={bulkDraft}
            onChange={(e) => setBulkDraft(e.target.value)}
            inputProps={{ 'aria-label': 'Full lyrics in Genius format' }}
            sx={{ ...lyricsDocInputSx(theme), width: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={applyBulkDialog} disabled={readOnly} sx={{ textTransform: 'none' }}>
            Apply &amp; save to song
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section narrative — free text per Genius section; shared lyrics on the song.
// ─────────────────────────────────────────────────────────────────────────────

const SectionNarrativeAnswerRow = memo(function SectionNarrativeAnswerRow({
  heading,
  sourceBody,
  sourceEmptyKind,
  narrative,
  readOnly,
  sectionIndex,
  patchNarrative,
  isFirst,
}: {
  heading: string;
  sourceBody: string;
  sourceEmptyKind: 'mismatch' | 'no-lines' | null;
  narrative: string;
  readOnly: boolean;
  sectionIndex: number;
  patchNarrative: (i: number, html: string) => void;
  isFirst: boolean;
}): ReactElement {
  const theme = useTheme();
  const sourceAria = `Original lyrics for ${heading}`;
  const onHtml = useCallback((html: string) => patchNarrative(sectionIndex, html), [patchNarrative, sectionIndex]);
  return (
    <Box>
      <Typography component="h3" sx={lyricsWritelySectionHeadingSx(theme, { isFirst })}>
        {heading}
      </Typography>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 1.5, md: 3 }}
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        sx={{ mt: 1.125 }}
      >
        <Box component="section" aria-label={sourceAria} sx={{ flex: 1, minWidth: 0, pr: { md: 0.5 } }}>
          {sourceBody ? (
            <Typography
              component="div"
              variant="body2"
              sx={{
                ...lyricsWritelySourceInputSx(theme),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {sourceBody}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontStyle: 'italic' }}>
              {sourceEmptyKind === 'mismatch'
                ? 'This section no longer matches the saved lyrics. Re-paste lyrics or open Lyrics in your own words to sync.'
                : 'No lines in this section.'}
            </Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, width: { xs: 1, md: 'auto' } }}>
          <EncoreTiptapAnswerField
            value={narrative}
            onChange={onHtml}
            readOnly={readOnly}
            placeholder="What is happening in the story here — moment, stakes, imagery?"
            aria-label={`Narrative for ${heading}`}
          />
        </Box>
      </Stack>
    </Box>
  );
});

function SectionNarrativeEditor({
  readOnly,
  song,
  run,
  geniusUrl,
  onChange,
  onPersistSong,
}: {
  readOnly: boolean;
  song: EncoreSong;
  run: EncoreLyricsSectionNarrativeExerciseRun;
  geniusUrl: string;
  onChange: EncoreRunDispatch;
  onPersistSong: (next: EncoreSong) => void | Promise<void>;
}): ReactElement {
  const theme = useTheme();
  const { done, total } = lyricsSectionNarrativeProgress(run.sections);
  const hasLyrics = Boolean(song.lyricsSourceGenius?.trim());
  const [pasteDraft, setPasteDraft] = useState(song.lyricsSourceGenius ?? '');
  const parsedLyricsSections = useMemo(
    () => parseGeniusLyricsIntoSections(song.lyricsSourceGenius?.trim() ?? ''),
    [song.lyricsSourceGenius],
  );

  useEffect(() => {
    if (!hasLyrics) setPasteDraft(song.lyricsSourceGenius ?? '');
  }, [hasLyrics, song.lyricsSourceGenius]);

  const handlePasteLyricsBlur = useCallback(() => {
    if (readOnly) return;
    const raw = pasteDraft.trim();
    if (!raw) return;
    const parsed = parseGeniusLyricsIntoSections(raw);
    const canon = serializeLyricsSectionsToRaw(parsed);
    const mergedNarrative = mergeParsedNarrativeSectionsWithExisting(parsed, run.sections);
    const nextRun = touchExerciseRun({ ...run, sections: mergedNarrative });
    const nextSong = setSingleRunForKind({ ...song, lyricsSourceGenius: canon }, nextRun);
    onPersistSong(nextSong);
  }, [onPersistSong, pasteDraft, readOnly, run, song]);

  const patchNarrative = useCallback(
    (sectionIndex: number, html: string) => {
      if (readOnly) return;
      onChange((prev) => {
        if (prev.kind !== 'lyricsSectionNarrative') return prev;
        if (prev.sections[sectionIndex]?.narrative === html) return prev;
        const nextSections = prev.sections.map((s, j) => (j === sectionIndex ? { ...s, narrative: html } : s));
        return { ...prev, sections: nextSections };
      });
    },
    [onChange, readOnly],
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
          it as a new beat: how has the story shifted since the last time we heard it?
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {total > 0 ? `${done} of ${total} sections` : 'No sections in saved lyrics.'}
        </Typography>
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
        {run.sections.map((sec, i) => {
          const lyricSec = parsedLyricsSections[i];
          const sourceBody = sourceBodyTextForLyricsSection(lyricSec);
          const heading = sec.title.trim() ? `[${sec.title.trim()}]` : 'Lyrics';
          const sourceEmptyKind: 'mismatch' | 'no-lines' | null = sourceBody
            ? null
            : lyricSec === undefined
              ? 'mismatch'
              : 'no-lines';
          return (
            <SectionNarrativeAnswerRow
              key={`narrative-sec-${i}`}
              heading={heading}
              sourceBody={sourceBody}
              sourceEmptyKind={sourceEmptyKind}
              narrative={sec.narrative}
              readOnly={readOnly}
              sectionIndex={i}
              patchNarrative={patchNarrative}
              isFirst={i === 0}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

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
        placeholder="Write as much as helps — paragraphs are welcome."
        aria-label={title}
      />
    </Box>
  );
});

function NineQuestionsEditor({
  readOnly,
  run,
  onChange,
}: {
  readOnly: boolean;
  run: EncoreCharacterNineQuestionsExerciseRun;
  onChange: EncoreRunDispatch;
}): ReactElement {
  const { done, total } = nineQuestionsProgress(run.answers);
  const padded = useMemo(() => {
    const a = [...run.answers];
    while (a.length < ENCORE_CHARACTER_NINE_QUESTION_COUNT) a.push('');
    return a.slice(0, ENCORE_CHARACTER_NINE_QUESTION_COUNT);
  }, [run.answers]);

  const patchAnswer = useCallback(
    (index: number, html: string) => {
      if (readOnly) return;
      onChange((prev) => {
        if (prev.kind !== 'characterNineQuestions') return prev;
        const pad = [...prev.answers];
        while (pad.length < ENCORE_CHARACTER_NINE_QUESTION_COUNT) pad.push('');
        const base = pad.slice(0, ENCORE_CHARACTER_NINE_QUESTION_COUNT);
        if ((base[index] ?? '') === html) return prev;
        const next = [...base];
        next[index] = html;
        return { ...prev, answers: next };
      });
    },
    [onChange, readOnly],
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
}
