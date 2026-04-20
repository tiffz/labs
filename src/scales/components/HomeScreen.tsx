import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import { useScales, hasEnabledMidiDevice } from '../store';
import { TIERS } from '../curriculum/tiers';
import { getExerciseProgress, getReviewExercises } from '../progress/store';
import ScalesInputSources from './InputSources';

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

export default function HomeScreen() {
  const { state, dispatch, startSession } = useScales();
  const { progress, microphoneActive, sessionComplete } = state;
  const anyDeviceEnabled = hasEnabledMidiDevice(state);

  const currentTier = TIERS.find(t => t.id === progress.currentTierId) ?? TIERS[0];

  const exercisesInTier = currentTier.exercises.length;
  const completedInTier = currentTier.exercises.filter(ex => {
    const ep = getExerciseProgress(progress, ex.id);
    const lastStage = ex.stages[ex.stages.length - 1];
    return ep.completedStageId === lastStage?.id;
  }).length;
  const tierProgress = exercisesInTier > 0 ? completedInTier / exercisesInTier : 0;

  const totalExercises = TIERS.reduce((sum, t) => sum + t.exercises.length, 0);
  const totalMastered = TIERS.reduce(
    (sum, t) =>
      sum +
      t.exercises.filter(ex => {
        const ep = getExerciseProgress(progress, ex.id);
        const lastStage = ex.stages[ex.stages.length - 1];
        return ep.completedStageId === lastStage?.id;
      }).length,
    0,
  );
  const dueForReview = getReviewExercises(progress).length;
  const totalPracticed = Object.keys(progress.exercises).length;
  const hasHistory = totalPracticed > 0;

  const hasInput = anyDeviceEnabled || microphoneActive;

  const openProgressMap = () => dispatch({ type: 'SET_SCREEN', screen: 'progress' });

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

          <Box sx={{ flex: 1 }} />

          <LinearProgress
            variant="determinate"
            value={tierProgress * 100}
            sx={{
              height: 6,
              borderRadius: '999px',
              bgcolor: theme => `${theme.palette.primary.main}1A`,
              '& .MuiLinearProgress-bar': { borderRadius: '999px' },
            }}
          />
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
              {completedInTier}/{exercisesInTier} exercises mastered
            </Typography>
            <Typography sx={{ ...TYPE.labelLarge, color: 'primary.main' }}>
              {Math.round(tierProgress * 100)}%
            </Typography>
          </Box>

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

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
                flex: 1,
                alignContent: 'center',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: '2rem',
                    fontWeight: 500,
                    lineHeight: '2.5rem',
                    color: 'text.primary',
                    letterSpacing: 0,
                  }}
                >
                  {totalMastered}
                  <Box
                    component="span"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 400,
                      color: 'text.secondary',
                      ml: 1,
                    }}
                  >
                    / {totalExercises}
                  </Box>
                </Typography>
                <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 1 }}>
                  Exercises mastered
                </Typography>
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography
                    sx={{
                      fontSize: '2rem',
                      fontWeight: 500,
                      lineHeight: '2.5rem',
                      color: dueForReview > 0 ? 'primary.main' : 'text.primary',
                      letterSpacing: 0,
                    }}
                  >
                    {dueForReview}
                  </Typography>
                  {dueForReview > 0 && (
                    <Icon
                      name="schedule"
                      size={20}
                      style={{ color: 'var(--mui-palette-primary-main, #059669)' }}
                    />
                  )}
                </Box>
                <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary', mt: 1 }}>
                  Due for review
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 5,
                pt: 4,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
                {dueForReview > 0 ? (
                  <>
                    Your next{' '}
                    <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>
                      Practice now
                    </Box>{' '}
                    session will include the {dueForReview === 1 ? 'exercise' : `${dueForReview} exercises`} due
                    for review.
                  </>
                ) : (
                  'Everything is fresh — keep going to master more.'
                )}
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
