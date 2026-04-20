import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import { useScales } from '../store';
import { TIERS } from '../curriculum/tiers';
import { getExerciseProgress, getExerciseProficiency, getMasteryTier } from '../progress/store';
import ScalesInputSources from './InputSources';

// M3 type-scale helpers.
const TYPE = {
  displaySmall: {
    fontSize: { xs: '1.75rem', md: '2.25rem' },
    fontWeight: 500,
    lineHeight: { xs: '2.25rem', md: '2.75rem' },
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
  bodyMedium: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.015625rem',
  },
  bodySmall: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
    letterSpacing: '0.025rem',
  },
} as const;

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

type TierStatus = 'past' | 'current' | 'locked';

function statusLabel(status: TierStatus): string {
  if (status === 'past') return 'Complete';
  if (status === 'current') return 'Current';
  return 'Locked';
}

function statusIcon(status: TierStatus): string {
  if (status === 'past') return 'check_circle';
  if (status === 'current') return 'play_circle';
  return 'lock';
}

function kindAbbrev(kind: string): string {
  if (kind.includes('arpeggio-major')) return 'Maj Arp';
  if (kind.includes('arpeggio-minor')) return 'min Arp';
  if (kind.includes('minor')) return 'min';
  return 'Maj';
}

export default function ProgressScreen() {
  const { state, dispatch } = useScales();
  const { progress } = state;

  const currentTierIdx = TIERS.findIndex(t => t.id === progress.currentTierId);
  // Mastered is the stricter tier: final stage cleared AND not shaky/stale.
  // Mirror how the home screen reports mastery so the two surfaces agree
  // — a "mastered" tally on Home and Progress that disagreed would be
  // confusing.
  const totalMastered = TIERS.reduce(
    (sum, t) =>
      sum +
      t.exercises.filter(ex => {
        const ep = getExerciseProgress(progress, ex.id);
        return getMasteryTier(ep, ex) === 'mastered';
      }).length,
    0,
  );
  const totalExercises = TIERS.reduce((sum, t) => sum + t.exercises.length, 0);
  const overallProgress = totalExercises > 0 ? totalMastered / totalExercises : 0;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1120,
        mx: 'auto',
        px: { xs: 4, sm: 6, md: 10 },
        py: { xs: 5, md: 8 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 3,
          mb: { xs: 5, md: 6 },
          flexWrap: 'wrap',
        }}
      >
        <IconButton
          aria-label="Back to home"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          sx={{
            color: 'text.primary',
            borderRadius: '50%',
            width: 40,
            height: 40,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Icon name="arrow_back" size={22} />
        </IconButton>
        <Typography component="h1" sx={{ ...TYPE.displaySmall, color: 'text.primary', flex: 1 }}>
          Progress map
        </Typography>
        <ScalesInputSources />
      </Box>

      {/* Overall progress summary */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 4, md: 6 },
          mb: { xs: 5, md: 6 },
          borderRadius: '16px',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' },
          gap: { xs: 3, sm: 6 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              ...TYPE.labelMedium,
              color: 'text.secondary',
              textTransform: 'uppercase',
              mb: 1.5,
            }}
          >
            Overall mastery
          </Typography>
          <Typography component="h2" sx={{ ...TYPE.titleLarge, color: 'text.primary', mb: 3 }}>
            {totalMastered} of {totalExercises} exercises mastered
          </Typography>
          <LinearProgress
            variant="determinate"
            value={overallProgress * 100}
            sx={{
              height: 6,
              borderRadius: '999px',
              bgcolor: theme => `${theme.palette.primary.main}1A`,
              '& .MuiLinearProgress-bar': { borderRadius: '999px' },
            }}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: '2.25rem', md: '2.75rem' },
              fontWeight: 500,
              lineHeight: 1,
              color: 'primary.main',
              letterSpacing: 0,
            }}
          >
            {Math.round(overallProgress * 100)}
          </Typography>
          <Typography
            sx={{ ...TYPE.titleLarge, color: 'text.secondary', fontWeight: 400 }}
          >
            %
          </Typography>
        </Box>
      </Paper>

      {/* Tier grid: 2 columns on desktop, 1 on mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 3, md: 5 },
        }}
      >
        {TIERS.map((tier, tierIdx) => {
          const status: TierStatus =
            tierIdx < currentTierIdx ? 'past' : tierIdx === currentTierIdx ? 'current' : 'locked';
          const isLocked = status === 'locked';
          const isCurrent = status === 'current';
          const isPast = status === 'past';

          const completedCount = tier.exercises.filter(ex => {
            const ep = getExerciseProgress(progress, ex.id);
            return getMasteryTier(ep, ex) === 'mastered';
          }).length;
          const tierProgress =
            tier.exercises.length > 0 ? completedCount / tier.exercises.length : 0;

          return (
            <Paper
              key={tier.id}
              variant="outlined"
              sx={{
                p: { xs: 5, md: 6 },
                borderRadius: '16px',
                borderColor: isCurrent ? 'primary.main' : 'divider',
                borderWidth: isCurrent ? 2 : 1,
                bgcolor: isCurrent
                  ? theme => `${theme.palette.primary.main}08`
                  : 'background.paper',
                opacity: isLocked ? 0.65 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isPast
                        ? theme => `${theme.palette.success.main}14`
                        : isCurrent
                          ? theme => `${theme.palette.primary.main}14`
                          : 'action.hover',
                      color: isPast
                        ? 'success.main'
                        : isCurrent
                          ? 'primary.main'
                          : 'text.secondary',
                    }}
                  >
                    <Icon name={statusIcon(status)} size={18} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        ...TYPE.labelMedium,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                      }}
                    >
                      Tier {tier.tierNumber}
                    </Typography>
                    <Typography
                      component="h3"
                      sx={{
                        ...TYPE.titleLarge,
                        color: 'text.primary',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tier.label}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 24,
                    px: 2,
                    borderRadius: '8px',
                    flexShrink: 0,
                    ...TYPE.labelMedium,
                    bgcolor: isPast
                      ? theme => `${theme.palette.success.main}14`
                      : isCurrent
                        ? theme => `${theme.palette.primary.main}14`
                        : 'action.hover',
                    color: isPast
                      ? 'success.main'
                      : isCurrent
                        ? 'primary.main'
                        : 'text.secondary',
                  }}
                >
                  {statusLabel(status)}
                </Box>
              </Box>

              <Typography sx={{ ...TYPE.bodyMedium, color: 'text.secondary' }}>
                {tier.description}
              </Typography>

              {!isLocked && (
                <>
                  <Box>
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
                        mt: 1.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <Typography sx={{ ...TYPE.bodySmall, color: 'text.secondary' }}>
                        {completedCount}/{tier.exercises.length} mastered
                      </Typography>
                      <Typography sx={{ ...TYPE.labelMedium, color: 'primary.main' }}>
                        {Math.round(tierProgress * 100)}%
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' },
                      gap: 1.5,
                      mt: 1,
                    }}
                  >
                    {tier.exercises.map(ex => {
                      const ep = getExerciseProgress(progress, ex.id);
                      const masteryTier = getMasteryTier(ep, ex);
                      const isComplete = masteryTier === 'mastered';
                      const isFluent = masteryTier === 'fluent';
                      const proficiency = getExerciseProficiency(ep);
                      const stageCount = ex.stages.length;
                      const completedStageIdx = ep.completedStageId
                        ? ex.stages.findIndex(s => s.id === ep.completedStageId)
                        : -1;
                      const stagesCompleted = completedStageIdx + 1;
                      const inProgress = !isComplete && !isFluent && (stagesCompleted > 0 || proficiency > 0);

                      // Fluent shares the success palette with mastered but at
                      // a lighter intensity — the filled check and solid tint
                      // stay reserved for "Mastered" so the two tiers remain
                      // visually distinguishable in a row of small chips.
                      const tint = isComplete
                        ? 'success'
                        : isFluent
                          ? 'success-soft'
                          : inProgress
                            ? 'primary'
                            : 'neutral';

                      return (
                        <Box
                          key={ex.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            minHeight: 40,
                            px: 2.5,
                            borderRadius: '10px',
                            bgcolor: tint === 'success'
                              ? theme => `${theme.palette.success.main}14`
                              : tint === 'success-soft'
                                ? theme => `${theme.palette.success.main}08`
                                : tint === 'primary'
                                  ? theme => `${theme.palette.primary.main}0D`
                                  : 'action.hover',
                            color: tint === 'success'
                              ? 'success.main'
                              : tint === 'success-soft'
                                ? 'success.dark'
                                : tint === 'primary'
                                  ? 'primary.main'
                                  : 'text.secondary',
                          }}
                        >
                          <Icon
                            name={
                              isComplete
                                ? 'check_circle'
                                : isFluent
                                  ? 'task_alt'
                                  : 'radio_button_unchecked'
                            }
                            size={16}
                          />
                          <Typography
                            sx={{
                              ...TYPE.labelLarge,
                              fontSize: '0.8125rem',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1,
                              color: 'inherit',
                            }}
                          >
                            {ex.key} {kindAbbrev(ex.kind)}
                          </Typography>
                          <Typography
                            sx={{
                              ...TYPE.bodySmall,
                              color: 'inherit',
                              opacity: 0.75,
                              flexShrink: 0,
                            }}
                          >
                            {stagesCompleted}/{stageCount}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}

              {isLocked && (
                <Typography sx={{ ...TYPE.bodySmall, color: 'text.disabled' }}>
                  Unlocks after completing Tier {tierIdx}.
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 6, md: 8 } }}>
        <Button
          variant="text"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
          startIcon={<Icon name="arrow_back" size={18} />}
          sx={{
            height: 40,
            px: 3,
            borderRadius: '999px',
            ...TYPE.labelLarge,
            color: 'text.primary',
          }}
        >
          Back to home
        </Button>
      </Box>
    </Box>
  );
}
