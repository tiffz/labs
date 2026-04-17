import { Box, Button, Typography, Paper, Chip, LinearProgress } from '@mui/material';
import { useScales, hasEnabledMidiDevice } from '../store';
import { TIERS } from '../curriculum/tiers';
import { getExerciseProgress, getExerciseProficiency } from '../progress/store';
import ScalesInputSources from './InputSources';

function Icon({ name, size = 20, ...props }: { name: string; size?: number } & React.HTMLAttributes<HTMLSpanElement>) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }} {...props}>{name}</span>;
}

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

  const totalPracticed = Object.keys(progress.exercises).length;
  const avgProficiency = totalPracticed > 0
    ? Object.values(progress.exercises)
        .reduce((sum, ep) => sum + getExerciseProficiency(ep), 0) / totalPracticed
    : 0;

  const hasInput = anyDeviceEnabled || microphoneActive;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, pt: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        {sessionComplete ? (
          <>
            <Icon name="check_circle" size={48} style={{ color: 'var(--mui-palette-success-main, #16a34a)' }} />
            <Typography variant="h1" sx={{ fontSize: '1.75rem', fontWeight: 700, mb: 0.5 }}>
              Lesson Complete!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nice work. Ready for the next one?
            </Typography>
          </>
        ) : (
          <>
            <Icon name="piano" size={48} style={{ color: 'var(--mui-palette-primary-main, #059669)' }} />
            <Typography variant="h1" sx={{ fontSize: '1.75rem', fontWeight: 700, mb: 0.5 }}>
              Learn Your Scales
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Guided practice for piano scales &amp; arpeggios
            </Typography>
          </>
        )}
        <ScalesInputSources />
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={startSession}
        disabled={!hasInput}
        sx={{
          py: 2,
          fontSize: '1.1rem',
          fontWeight: 700,
          borderRadius: 3,
          mb: 3,
          textTransform: 'none',
          boxShadow: hasInput ? '0 4px 14px rgba(5, 150, 105, 0.3)' : undefined,
          gap: 1,
        }}
      >
        <Icon name={sessionComplete ? 'skip_next' : 'play_arrow'} size={24} />
        {sessionComplete ? 'Next Lesson' : 'Practice Now'}
      </Button>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h3" sx={{ fontSize: '1rem' }}>
            {currentTier.label}
          </Typography>
          <Chip
            label={`Tier ${currentTier.tierNumber} of ${TIERS.length}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {currentTier.description}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={tierProgress * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, textAlign: 'right' }}>
          {completedInTier}/{exercisesInTier} exercises mastered
        </Typography>
      </Paper>

      {totalPracticed > 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Overall proficiency
          </Typography>
          <Typography variant="h2" sx={{ fontSize: '1.5rem' }}>
            {Math.round(avgProficiency * 100)}%
          </Typography>
        </Paper>
      )}

      <Button
        variant="text"
        fullWidth
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'progress' })}
        sx={{ mt: 1, gap: 1 }}
      >
        <Icon name="map" size={20} /> View Progress Map
      </Button>
    </Box>
  );
}
