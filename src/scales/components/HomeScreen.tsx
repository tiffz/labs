import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { useScales, hasEnabledMidiDevice } from '../store';
import { TIERS } from '../curriculum/tiers';
import type { ExerciseKind } from '../curriculum/types';
import { getExerciseProgress, getMasteryTier, getReviewExercises } from '../progress/store';
import ScalesInputSources from './InputSources';
import MasteryDetailsDialog, { type MasteryCategory } from './MasteryDetailsDialog';
import DueForReviewDialog from './DueForReviewDialog';

// Material 3 reference:
//   https://m3.material.io/styles/typography/type-scale-tokens
// theme.spacingBase = 4 → sx spacing unit 1 === 4px (so p:6 === 24dp).

function Icon({
  name,
  size = 20,
  ...props
}: { name: string; size?: number } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, lineHeight: 1 }}
      {...props}
    >
      {name}
    </span>
  );
}

// M3 type-scale helpers used across the home screen.
const TYPE = {
  displaySmall: {
    fontSize: { xs: '1.75rem', md: '2.25rem' },
    fontWeight: 500,
    lineHeight: { xs: '2.25rem', md: '2.75rem' },
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: '2rem',
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: '1.375rem',
    fontWeight: 500,
    lineHeight: '1.75rem',
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    letterSpacing: '0.009375rem',
  },
  labelLarge: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    letterSpacing: '0.00625rem',
  },
  labelMedium: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.03125rem',
  },
  bodyLarge: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
    letterSpacing: '0.03125rem',
  },
  bodyMedium: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.015625rem',
  },
} as const;

/**
 * One column of the "Mastery at a glance" hero row. Stats render identically
 * whether or not they're clickable — the click affordance is added via a
 * subtle hover/focus ring, not by changing the number/label treatment, so
 * all three stats read as a unified group.
 */
function BigStat({
  value,
  total,
  label,
  subLine,
  onClick,
  accent,
  ariaLabel,
}: {
  value: number;
  total?: number;
  label: string;
  /**
   * Optional secondary readout below the main label — used on the mastery
   * stats to show the softer "Fluent" tier under the stricter "Mastered"
   * headline without needing another stat column.
   */
  subLine?: string;
  onClick?: () => void;
  accent?: boolean;
  ariaLabel?: string;
}) {
  const inner = (
    <>
      <Typography
        sx={{
          fontSize: '2rem',
          fontWeight: 500,
          lineHeight: '2.5rem',
          color: accent ? 'primary.main' : 'text.primary',
          letterSpacing: 0,
        }}
      >
        {value}
        {total !== undefined && (
          <Box
            component="span"
            sx={{
              fontSize: '1rem',
              fontWeight: 400,
              color: 'text.secondary',
              ml: 1,
            }}
          >
            / {total}
          </Box>
        )}
      </Typography>
      <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 1 }}>
        {label}
      </Typography>
      {subLine && (
        <Typography
          sx={{
            ...TYPE.bodyMedium,
            color: 'text.secondary',
            mt: 0.25,
            fontSize: '0.8125rem',
          }}
        >
          {subLine}
        </Typography>
      )}
    </>
  );

  if (!onClick) {
    return <Box sx={{ textAlign: 'left' }}>{inner}</Box>;
  }
  return (
    <ButtonBase
      onClick={onClick}
      focusRipple
      aria-label={ariaLabel ?? label}
      sx={{
        display: 'block',
        textAlign: 'left',
        borderRadius: '12px',
        p: 1.5,
        m: -1.5,
        transition: 'background-color 120ms ease',
        '&:hover': { bgcolor: 'action.hover' },
        '&:focus-visible': {
          outline: theme => `2px solid ${theme.palette.primary.main}`,
          outlineOffset: '2px',
        },
      }}
    >
      {inner}
    </ButtonBase>
  );
}

export default function HomeScreen() {
  const { state, dispatch, startSession } = useScales();
  const { progress, microphoneActive, sessionComplete } = state;
  const anyDeviceEnabled = hasEnabledMidiDevice(state);

  const currentTier = TIERS.find(t => t.id === progress.currentTierId) ?? TIERS[0];

  // Per-exercise progress for the Current Tier card. Each row shows how many
  // levels within an exercise the user has cleared — a finer-grained view
  // than "N of M exercises mastered" that actually moves every practice
  // session.
  const tierExerciseProgress = currentTier.exercises.map(ex => {
    const ep = getExerciseProgress(progress, ex.id);
    const tier = getMasteryTier(ep, ex);
    const completedIdx = ep.completedStageId
      ? ex.stages.findIndex(s => s.id === ep.completedStageId)
      : -1;
    const levelsDone = completedIdx + 1;
    const totalLevels = ex.stages.length;
    return { ex, tier, levelsDone, totalLevels };
  });

  // Levels-cleared is a finer-grained measure than exercises-mastered. Each
  // exercise contains multiple levels (difficulty steps), so a learner
  // accumulates visible progress every time they pass any level — not only
  // when they finish a full exercise. This keeps long-running users from
  // staring at "0 / 44" for weeks before their first full mastery.
  // (Internally these difficulty steps are still called "stages" in the
  // type system and progress store; only the user-facing copy uses "level".)
  const isScaleKind = (k: ExerciseKind) =>
    k === 'major-scale' || k === 'natural-minor-scale';
  let levelsCleared = 0;
  let totalLevels = 0;
  let scalesTotal = 0;
  // Mastered = final-stage cleared AND not shaky/stale. Fluent is the
  // softer tier (passed the target-tempo checkpoint) and is reported as a
  // sub-line, since "Mastered" alone under-sells progress that's still
  // meaningful. Both totals exclude exercises the user hasn't started.
  let scalesMastered = 0;
  let scalesFluent = 0;
  let arpeggiosTotal = 0;
  let arpeggiosMastered = 0;
  let arpeggiosFluent = 0;
  for (const t of TIERS) {
    for (const ex of t.exercises) {
      totalLevels += ex.stages.length;
      const ep = getExerciseProgress(progress, ex.id);
      const tier = getMasteryTier(ep, ex);
      if (ep.completedStageId) {
        const idx = ex.stages.findIndex(s => s.id === ep.completedStageId);
        if (idx >= 0) levelsCleared += idx + 1;
      }
      if (isScaleKind(ex.kind)) {
        scalesTotal += 1;
        if (tier === 'mastered') scalesMastered += 1;
        // Mastered implies fluent (it's stricter) — count it in both so
        // the fluent tally reads "how many can you play in real time?"
        if (tier === 'mastered' || tier === 'fluent') scalesFluent += 1;
      } else {
        arpeggiosTotal += 1;
        if (tier === 'mastered') arpeggiosMastered += 1;
        if (tier === 'mastered' || tier === 'fluent') arpeggiosFluent += 1;
      }
    }
  }
  // Arpeggios don't appear in the curriculum until Tier 2, so hide that
  // milestone line for Tier 1 users to keep the card uncluttered and avoid
  // teasing content they haven't been introduced to yet.
  const showArpeggios = currentTier.tierNumber >= 2;
  const totalMasteredExercises = scalesMastered + arpeggiosMastered;
  const reviewEntries = getReviewExercises(progress);
  const dueForReview = reviewEntries.length;
  const totalPracticed = Object.keys(progress.exercises).length;
  const hasHistory = totalPracticed > 0;

  const hasInput = anyDeviceEnabled || microphoneActive;

  const openProgressMap = () => dispatch({ type: 'SET_SCREEN', screen: 'progress' });

  // Dialogs driven by the mastery card. `masteryDialog` holds the category
  // being viewed (scales vs arpeggios) so a single dialog component can
  // serve both clickable stats; `reviewDialogOpen` is a plain boolean for
  // the standalone Due-for-review card below the stats row.
  const [masteryDialog, setMasteryDialog] = useState<MasteryCategory | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1120,
        mx: 'auto',
        px: { xs: 4, sm: 6, md: 10 },
        py: { xs: 6, md: 10 },
      }}
    >
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
        <Box sx={{ mb: 4 }}>
          <Icon
            name={sessionComplete ? 'check_circle' : 'piano'}
            size={40}
            style={{
              color: sessionComplete
                ? 'var(--mui-palette-success-main, #16a34a)'
                : 'var(--mui-palette-primary-main, #059669)',
            }}
          />
        </Box>
        <Typography component="h1" sx={{ ...TYPE.displaySmall, color: 'text.primary', mb: 2 }}>
          {sessionComplete ? 'Lesson complete' : 'Learn Your Scales'}
        </Typography>
        <Typography
          sx={{ ...TYPE.bodyLarge, color: 'text.secondary', mb: 5, maxWidth: 560, mx: 'auto' }}
        >
          {sessionComplete
            ? 'Nice work. Ready for the next one?'
            : 'Guided practice for piano scales & arpeggios.'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ScalesInputSources />
        </Box>
      </Box>

      {/* Primary CTA */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 8, md: 10 } }}>
        <Button
          variant="contained"
          onClick={startSession}
          disabled={!hasInput}
          disableElevation
          startIcon={<Icon name={sessionComplete ? 'skip_next' : 'play_arrow'} size={20} />}
          sx={{
            height: 52,
            px: 7,
            minWidth: { sm: 260 },
            borderRadius: '999px',
            ...TYPE.labelLarge,
            fontSize: '1rem',
          }}
        >
          {sessionComplete ? 'Next lesson' : 'Practice now'}
        </Button>
      </Box>

      {/* Progress + stats grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: hasHistory ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
          gap: { xs: 4, md: 5 },
          alignItems: 'stretch',
        }}
      >
        {/* Current tier card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 5, md: 7 },
            borderRadius: '16px',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            minHeight: { md: 260 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 3,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                sx={{
                  ...TYPE.labelMedium,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Current tier
              </Typography>
              <Typography component="h2" sx={{ ...TYPE.titleLarge, color: 'text.primary' }}>
                {currentTier.label}
              </Typography>
            </Box>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                px: 2.5,
                borderRadius: '8px',
                bgcolor: theme => `${theme.palette.primary.main}14`,
                color: 'primary.main',
                ...TYPE.labelMedium,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Tier {currentTier.tierNumber} of {TIERS.length}
            </Box>
          </Box>
          <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mb: 4 }}>
            {currentTier.description}
          </Typography>

          {/* Per-exercise level progress. Replaces a single aggregate bar so
              the user sees partial progress on each scale/arpeggio instead
              of staring at 0% until a whole exercise is mastered. */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {tierExerciseProgress.map(({ ex, tier, levelsDone, totalLevels: exLevels }) => {
              const pct = exLevels > 0 ? (levelsDone / exLevels) * 100 : 0;
              const isMastered = tier === 'mastered';
              return (
                <Box
                  key={ex.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Typography
                    sx={{
                      ...TYPE.bodyMedium,
                      color: 'text.primary',
                      fontWeight: isMastered ? 600 : 400,
                      flex: '0 0 auto',
                      minWidth: 140,
                    }}
                  >
                    {ex.label}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: '999px',
                      bgcolor: theme => `${theme.palette.primary.main}1A`,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: '999px',
                        bgcolor: isMastered ? 'success.main' : 'primary.main',
                      },
                    }}
                  />
                  <Typography
                    sx={{
                      ...TYPE.labelLarge,
                      color: isMastered ? 'success.main' : 'text.secondary',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                      minWidth: 40,
                      textAlign: 'right',
                    }}
                  >
                    {levelsDone}/{exLevels}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Thematic link: progress map belongs with the tier */}
          <Box
            sx={{
              mt: 5,
              pt: 4,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              variant="text"
              onClick={openProgressMap}
              endIcon={<Icon name="arrow_forward" size={18} />}
              sx={{
                height: 36,
                px: 2,
                borderRadius: '999px',
                ...TYPE.labelLarge,
                color: 'primary.main',
              }}
            >
              View progress map
            </Button>
          </Box>
        </Paper>

        {/* Your practice card — same structural rhythm as the tier card */}
        {hasHistory && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 5, md: 7 },
              borderRadius: '16px',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              minHeight: { md: 260 },
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  ...TYPE.labelMedium,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Your practice
              </Typography>
              <Typography component="h2" sx={{ ...TYPE.titleLarge, color: 'text.primary' }}>
                Mastery at a glance
              </Typography>
            </Box>

            {/* Hero stats row — every stat uses the same big-number treatment
                so Levels / Scales / Arpeggios read as siblings instead of
                different metrics in different UIs. Scales and Arpeggios are
                clickable and open the matching details modal; Levels is
                informational only (its breakdown lives in the tier card and
                progress map). */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: showArpeggios
                  ? { xs: '1fr', sm: 'repeat(3, 1fr)' }
                  : { xs: '1fr', sm: '1fr 1fr' },
                gap: 4,
                alignContent: 'center',
              }}
            >
              <BigStat value={levelsCleared} total={totalLevels} label="Levels cleared" />
              {/* Fluent is the headline tier because hitting the 18-stage
                  mastery gate takes weeks of practice — leading with "0 / 22
                  mastered" for most users would feel defeating. The stricter
                  Mastered tally only appears once the learner has earned at
                  least one, at which point it becomes an aspirational
                  sub-line instead of a zero. */}
              <BigStat
                value={scalesFluent}
                total={scalesTotal}
                label="Scales fluent"
                subLine={scalesMastered > 0
                  ? `${scalesMastered} / ${scalesTotal} mastered`
                  : undefined}
                accent={scalesFluent > 0}
                onClick={() => setMasteryDialog('scale')}
                ariaLabel={
                  `Scales fluent: ${scalesFluent} of ${scalesTotal}. ` +
                  (scalesMastered > 0
                    ? `${scalesMastered} of ${scalesTotal} mastered. `
                    : '') +
                  'Open details.'
                }
              />
              {showArpeggios && (
                <BigStat
                  value={arpeggiosFluent}
                  total={arpeggiosTotal}
                  label="Arpeggios fluent"
                  subLine={arpeggiosMastered > 0
                    ? `${arpeggiosMastered} / ${arpeggiosTotal} mastered`
                    : undefined}
                  accent={arpeggiosFluent > 0}
                  onClick={() => setMasteryDialog('arpeggio')}
                  ariaLabel={
                    `Arpeggios fluent: ${arpeggiosFluent} of ${arpeggiosTotal}. ` +
                    (arpeggiosMastered > 0
                      ? `${arpeggiosMastered} of ${arpeggiosTotal} mastered. `
                      : '') +
                    'Open details.'
                  }
                />
              )}
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* Review section. Lives in its own block below the hero row
                because "Due for review" is an action prompt, not a mastery
                metric — mixing them in the same grid made it compete with
                Levels/Scales/Arpeggios for attention. When something is
                actually due, the whole block becomes a single clickable
                tile that opens the review list. */}
            <Box
              sx={{
                mt: 5,
                pt: 4,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              {dueForReview > 0 ? (
                <ButtonBase
                  onClick={() => setReviewDialogOpen(true)}
                  focusRipple
                  aria-label={`${dueForReview === 1 ? '1 exercise' : `${dueForReview} exercises`} due for review. Open list.`}
                  sx={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    textAlign: 'left',
                    gap: 2,
                    px: 2.5,
                    py: 2,
                    borderRadius: '12px',
                    bgcolor: theme => `${theme.palette.primary.main}0D`,
                    transition: 'background-color 120ms ease',
                    '&:hover': {
                      bgcolor: theme => `${theme.palette.primary.main}14`,
                    },
                    '&:focus-visible': {
                      outline: theme => `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: '2px',
                    },
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      bgcolor: theme => `${theme.palette.primary.main}1F`,
                      color: 'primary.main',
                    }}
                  >
                    <Icon name="schedule" size={20} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ ...TYPE.labelLarge, color: 'primary.main', mb: 0.25 }}>
                      {dueForReview === 1
                        ? '1 exercise due for review'
                        : `${dueForReview} exercises due for review`}
                    </Typography>
                    <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
                      Your next{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
                        Practice now
                      </Box>{' '}
                      session will include {dueForReview === 1 ? 'it' : 'them'}.
                    </Typography>
                  </Box>
                  <Icon
                    name="chevron_right"
                    size={20}
                    style={{
                      color: 'var(--mui-palette-text-secondary, #64748b)',
                      flexShrink: 0,
                    }}
                  />
                </ButtonBase>
              ) : (
                <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
                  {totalMasteredExercises > 0
                    ? 'Everything is fresh — keep going to master more.'
                    : levelsCleared > 0
                      ? `You've cleared ${levelsCleared} level${levelsCleared === 1 ? '' : 's'} — keep going to fully master your first exercise.`
                      : 'Clear your first level to start building mastery.'}
                </Typography>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      <MasteryDetailsDialog
        open={masteryDialog !== null}
        onClose={() => setMasteryDialog(null)}
        category={masteryDialog ?? 'scale'}
        progress={progress}
      />
      <DueForReviewDialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        entries={reviewEntries}
        progress={progress}
      />
    </Box>
  );
}
