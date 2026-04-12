import { useMemo } from 'react';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import { useScales } from '../store';
import { findStage } from '../curriculum/tiers';
import { getExerciseProgress } from '../progress/store';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

const ADVANCEMENT_THRESHOLD = 0.85;

export default function ResultScreen() {
  const { state, dispatch, startSession } = useScales();
  const { activeExercise, practiceResults, sessionPlan, progress } = state;

  const results = useMemo(() => Array.from(practiceResults.values()), [practiceResults]);
  const correct = results.filter(r => r.pitchCorrect).length;
  const total = results.length;
  const accuracy = total > 0 ? correct / total : 0;
  const accuracyPct = Math.round(accuracy * 100);

  const stageInfo = activeExercise
    ? findStage(activeExercise.exerciseId, activeExercise.stageId)
    : null;

  const exerciseProgress = activeExercise
    ? getExerciseProgress(progress, activeExercise.exerciseId)
    : null;

  const advanced = exerciseProgress && activeExercise
    ? exerciseProgress.currentStageId !== activeExercise.stageId
    : false;

  const hasMore = sessionPlan
    ? state.activeExerciseIndex < sessionPlan.exercises.length - 1
    : false;

  const handleNext = () => {
    if (!hasMore) {
      dispatch({ type: 'SET_SCREEN', screen: 'home' });
      return;
    }
    const nextIdx = state.activeExerciseIndex + 1;
    const nextExercise = sessionPlan!.exercises[nextIdx];
    const score = generateScoreForExercise(nextExercise);
    if (score) {
      dispatch({ type: 'NEXT_EXERCISE', score });
    }
  };

  const accuracyColor = accuracy >= ADVANCEMENT_THRESHOLD
    ? 'success.main'
    : accuracy >= 0.6
      ? 'warning.main'
      : 'error.main';

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', p: 3, pt: 5, textAlign: 'center' }}>
      <Typography
        variant="h1"
        sx={{ fontSize: '3rem', fontWeight: 700, color: accuracyColor, mb: 0.5 }}
      >
        {accuracyPct}%
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {correct} of {total} notes correct
      </Typography>

      <Typography variant="h3" sx={{ fontSize: '1.1rem', mb: 1 }}>
        {stageInfo?.exercise.label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {stageInfo?.stage.label}
      </Typography>

      {advanced && (
        <Paper
          sx={{
            p: 2, mb: 3, bgcolor: 'success.main', color: 'success.contrastText',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            borderRadius: 2,
          }}
        >
          <Icon name="trending_up" />
          <Typography fontWeight={600}>Stage complete! Moving to the next stage.</Typography>
        </Paper>
      )}

      {accuracy >= ADVANCEMENT_THRESHOLD && !advanced && (
        <Chip
          icon={<Icon name="check_circle" />}
          label="Great work! One more at this level to advance."
          color="success"
          variant="outlined"
          sx={{ mb: 3 }}
        />
      )}

      {accuracy < ADVANCEMENT_THRESHOLD && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {accuracy < 0.6
            ? 'Take it slow — focus on getting the right notes first.'
            : 'Almost there! A bit more practice and you\'ll advance.'}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleNext}
          size="large"
          sx={{ gap: 1 }}
        >
          <Icon name={hasMore ? 'skip_next' : 'home'} />
          {hasMore ? 'Next Exercise' : 'Back to Home'}
        </Button>

        <Button
          variant="outlined"
          onClick={startSession}
          sx={{ gap: 1 }}
        >
          <Icon name="replay" /> New Session
        </Button>
      </Box>
    </Box>
  );
}
