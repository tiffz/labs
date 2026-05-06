import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Slide from '@mui/material/Slide';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { forwardRef, useCallback, useEffect, useMemo, useState, type ReactElement, type Ref } from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import {
  ENCORE_CHARACTER_NINE_QUESTION_COUNT,
  ENCORE_CHARACTER_NINE_QUESTION_TITLES,
  ENCORE_PRACTICE_EXERCISE_CATALOG,
  effectiveLyricsSections,
  geniusSearchUrlForSong,
  lyricsRewriteProgressFromSections,
  markExerciseRunCompleted,
  mergeParsedSectionsWithExisting,
  nineQuestionsProgress,
  parseGeniusLyricsIntoSections,
  touchExerciseRun,
} from '../../practice/encorePracticeExerciseModel';
import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsExerciseSection,
  EncoreLyricsInOwnWordsExerciseRun,
  EncorePracticeExerciseRun,
} from '../../types';

export type PracticeExerciseFocusDialogProps = {
  open: boolean;
  songTitle: string;
  songArtist: string;
  run: EncorePracticeExerciseRun;
  readOnly: boolean;
  onClose: () => void;
  onSaveDraft: (run: EncorePracticeExerciseRun) => void;
  onMarkComplete: (run: EncorePracticeExerciseRun) => void;
  onClearDraft: () => void;
};

/**
 * Light-pink fill for unfilled rewrite fields. Replaces the old "Your progress" bar — at a glance
 * the user can see which lines still need their voice on them. Subtle enough to not fight the
 * page background, distinct enough that filled lines visibly disappear into "done" white.
 */
const UNFILLED_LINE_BG = 'rgba(244, 114, 182, 0.10)';

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function cloneRun(run: EncorePracticeExerciseRun): EncorePracticeExerciseRun {
  if (run.kind === 'lyricsInOwnWords') {
    return {
      ...run,
      sections: effectiveLyricsSections(run),
      // Drop legacy `lines` once we've absorbed it into `sections` — keeps writes consistent
      // and prevents future readers from seeing a stale flat list.
      lines: undefined,
    };
  }
  return { ...run, answers: [...run.answers] };
}

export function PracticeExerciseFocusDialog({
  open,
  songTitle,
  songArtist,
  run,
  readOnly,
  onClose,
  onSaveDraft,
  onMarkComplete,
  onClearDraft,
}: PracticeExerciseFocusDialogProps): ReactElement {
  const [local, setLocal] = useState(() => cloneRun(run));

  const geniusUrl = useMemo(() => geniusSearchUrlForSong(songTitle, songArtist), [songTitle, songArtist]);
  const catalog = ENCORE_PRACTICE_EXERCISE_CATALOG[local.kind];

  const persistDraft = useCallback(() => {
    if (readOnly) return;
    onSaveDraft(touchExerciseRun(local));
  }, [local, onSaveDraft, readOnly]);

  const complete = useCallback(() => {
    if (readOnly) return;
    onMarkComplete(markExerciseRunCompleted(touchExerciseRun(local)));
  }, [local, onMarkComplete, readOnly]);

  const handleClearDraft = useCallback(() => {
    if (readOnly) return;
    onClearDraft();
  }, [onClearDraft, readOnly]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap', py: { xs: 1, sm: 0.5 } }}>
          <IconButton edge="start" onClick={onClose} aria-label="Close exercise">
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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            {readOnly ? (
              <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
                Close
              </Button>
            ) : (
              <>
                <Tooltip title="Discard everything in this exercise and remove it">
                  <Button
                    onClick={handleClearDraft}
                    color="inherit"
                    startIcon={<RestartAltIcon />}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      color: 'text.secondary',
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    Clear
                  </Button>
                </Tooltip>
                <Button
                  variant="outlined"
                  onClick={persistDraft}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Save draft
                </Button>
                <Button
                  variant="contained"
                  onClick={complete}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Mark complete
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, sm: 3 },
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
          {local.kind === 'lyricsInOwnWords' ? (
            <LyricsExerciseEditor
              readOnly={readOnly}
              run={local}
              geniusUrl={geniusUrl}
              onChange={setLocal}
            />
          ) : (
            <NineQuestionsEditor readOnly={readOnly} run={local} onChange={setLocal} />
          )}
        </Box>
      </Box>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lyrics editor — side-by-side, section-aware, auto-parsing
// ─────────────────────────────────────────────────────────────────────────────

function LyricsExerciseEditor({
  readOnly,
  run,
  geniusUrl,
  onChange,
}: {
  readOnly: boolean;
  run: EncoreLyricsInOwnWordsExerciseRun;
  geniusUrl: string;
  onChange: (next: EncorePracticeExerciseRun) => void;
}): ReactElement {
  const sections = useMemo(() => effectiveLyricsSections(run), [run]);
  const pasted = run.pastedLyrics ?? '';
  const [pasteDraft, setPasteDraft] = useState(pasted);

  // Keep the local paste textarea in sync if the run changes externally (e.g. clear-draft replacing
  // it with a fresh run). We deliberately don't debounce parsing — typing into a textarea triggers
  // a parse on every keystroke, which is fine because parser + merge are O(N) over line count.
  useEffect(() => {
    setPasteDraft(pasted);
  }, [pasted]);

  /**
   * Whenever the paste textarea changes, re-parse and merge with the existing sections so any
   * previous rewrites + per-section notes carry forward as long as the section title + line text
   * haven't changed. No "Split into lines" button — splitting happens automatically.
   */
  const handlePasteChange = useCallback(
    (raw: string) => {
      setPasteDraft(raw);
      if (readOnly) return;
      const parsed = parseGeniusLyricsIntoSections(raw);
      const merged = mergeParsedSectionsWithExisting(parsed, sections);
      onChange({ ...run, pastedLyrics: raw, sections: merged, lines: undefined });
    },
    [readOnly, run, sections, onChange],
  );

  const updateSection = useCallback(
    (idx: number, mutate: (s: EncoreLyricsExerciseSection) => EncoreLyricsExerciseSection) => {
      if (readOnly) return;
      const next = sections.map((s, i) => (i === idx ? mutate(s) : s));
      onChange({ ...run, sections: next, lines: undefined });
    },
    [sections, onChange, readOnly, run],
  );

  const { done, total } = lyricsRewriteProgressFromSections(sections);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Find the lyrics on{' '}
          <Link href={geniusUrl} target="_blank" rel="noopener noreferrer">
            Genius
            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.25, verticalAlign: '-2px' }} aria-hidden />
          </Link>
          , then paste them on the left. Encore reads <code>[Verse 1]</code>, <code>[Chorus]</code>,
          and other section markers automatically.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 360px) minmax(0, 1fr)' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: paste source. Sticky so the user can keep editing while scrolling rewrites. */}
        <Box
          sx={{
            position: { md: 'sticky' },
            top: { md: 16 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              mb: 0.75,
            }}
          >
            Paste lyrics
          </Typography>
          <TextField
            value={pasteDraft}
            onChange={(e) => handlePasteChange(e.target.value)}
            fullWidth
            multiline
            minRows={20}
            maxRows={32}
            size="small"
            placeholder={'[Verse 1]\nFirst line of the verse…\n\n[Chorus]\nFirst line of the chorus…'}
            InputProps={{ readOnly, sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.85rem' } }}
            inputProps={{ 'aria-label': 'Paste song lyrics' }}
          />
        </Box>

        {/* RIGHT COLUMN: per-section rewrite editor. Empty state until the user pastes anything. */}
        <Box>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Your rewrite
            </Typography>
            {total > 0 ? (
              <Typography variant="caption" color="text.secondary">
                · {done} of {total} lines
              </Typography>
            ) : null}
          </Stack>

          {sections.length === 0 ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                color: 'text.secondary',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2">
                Paste lyrics on the left and Encore will lay them out here, section by section.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={3}>
              {sections.map((section, sectionIdx) => (
                <SectionEditor
                  key={`${section.title}-${sectionIdx}`}
                  section={section}
                  readOnly={readOnly}
                  onChange={(next) => updateSection(sectionIdx, () => next)}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    </Stack>
  );
}

function SectionEditor({
  section,
  readOnly,
  onChange,
}: {
  section: EncoreLyricsExerciseSection;
  readOnly: boolean;
  onChange: (next: EncoreLyricsExerciseSection) => void;
}): ReactElement {
  const theme = useTheme();
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {section.title ? (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              fontWeight: 800,
              letterSpacing: '0.06em',
              color: 'primary.main',
              lineHeight: 1.2,
            }}
          >
            [{section.title}]
          </Typography>
        </Box>
      ) : null}

      <Stack spacing={1} sx={{ p: { xs: 1.5, sm: 2 } }}>
        {section.lines.map((line, lineIdx) => {
          const isFilled = line.rewrite.trim().length > 0;
          return (
            <Box
              key={lineIdx}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' },
                gap: { xs: 0.75, sm: 1.5 },
                alignItems: 'stretch',
              }}
            >
              <Box
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {line.original}
                </Typography>
              </Box>
              <TextField
                value={line.rewrite}
                onChange={(e) => {
                  const nextLines = section.lines.map((l, j) =>
                    j === lineIdx ? { ...l, rewrite: e.target.value } : l,
                  );
                  onChange({ ...section, lines: nextLines });
                }}
                fullWidth
                multiline
                size="small"
                placeholder="In your own words…"
                InputProps={{ readOnly }}
                inputProps={{ 'aria-label': `Your rewrite for "${line.original}"` }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: isFilled ? 'background.paper' : UNFILLED_LINE_BG,
                    transition: 'background-color 120ms ease-out',
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  },
                }}
              />
            </Box>
          );
        })}

        {/* Per-section notes — emotional intent / blocking / breath choices for the section. */}
        <TextField
          value={section.notes ?? ''}
          onChange={(e) => onChange({ ...section, notes: e.target.value })}
          fullWidth
          multiline
          minRows={1}
          size="small"
          placeholder={
            section.title
              ? `Notes on this ${section.title.toLowerCase()} — feeling, blocking, breath, dynamics…`
              : 'Section notes — feeling, blocking, breath, dynamics…'
          }
          InputProps={{ readOnly }}
          inputProps={{ 'aria-label': `Interpretation notes for ${section.title || 'this section'}` }}
          sx={{
            mt: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: alpha(theme.palette.text.primary, 0.02),
              fontSize: '0.8125rem',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderStyle: 'dashed',
            },
          }}
        />
      </Stack>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nine-questions editor (unchanged in spirit; tightened copy)
// ─────────────────────────────────────────────────────────────────────────────

function NineQuestionsEditor({
  readOnly,
  run,
  onChange,
}: {
  readOnly: boolean;
  run: EncoreCharacterNineQuestionsExerciseRun;
  onChange: (next: EncorePracticeExerciseRun) => void;
}): ReactElement {
  const { done, total } = nineQuestionsProgress(run.answers);
  const padded = useMemo(() => {
    const a = [...run.answers];
    while (a.length < ENCORE_CHARACTER_NINE_QUESTION_COUNT) a.push('');
    return a.slice(0, ENCORE_CHARACTER_NINE_QUESTION_COUNT);
  }, [run.answers]);

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {ENCORE_PRACTICE_EXERCISE_CATALOG.characterNineQuestions.description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {done} of {total} answered
        </Typography>
      </Box>
      <Stack spacing={2}>
        {ENCORE_CHARACTER_NINE_QUESTION_TITLES.map((qTitle, i) => {
          const filled = padded[i]?.trim().length ?? 0;
          return (
            <TextField
              key={qTitle}
              label={qTitle}
              value={padded[i] ?? ''}
              onChange={(e) => {
                const next = [...padded];
                next[i] = e.target.value;
                onChange({ ...run, answers: next });
              }}
              fullWidth
              multiline
              minRows={2}
              size="small"
              InputProps={{ readOnly }}
              inputProps={{ 'aria-label': qTitle }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: filled > 0 ? 'background.paper' : UNFILLED_LINE_BG,
                },
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
