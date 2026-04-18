import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import { useScales } from '../store';
import { TIERS } from '../curriculum/tiers';
import { getExerciseProgress, getExerciseProficiency } from '../progress/store';
import ScalesInputSources from './InputSources';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

export default function ProgressScreen() {
  const { state, dispatch } = useScales();
  const { progress } = state;

  const currentTierIdx = TIERS.findIndex(t => t.id === progress.currentTierId);

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton aria-label="Back to home" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}>
          <Icon name="arrow_back" />
        </IconButton>
        <Typography variant="h2" sx={{ fontSize: '1.25rem', flex: 1 }}>
          Progress Map
        </Typography>
        <ScalesInputSources />
      </Box>

      {TIERS.map((tier, tierIdx) => {
        const isCurrent = tier.id === progress.currentTierId;
        const isLocked = tierIdx > currentTierIdx;
        const isPast = tierIdx < currentTierIdx;

        const completedCount = tier.exercises.filter(ex => {
          const ep = getExerciseProgress(progress, ex.id);
          const lastStage = ex.stages[ex.stages.length - 1];
          return ep.completedStageId === lastStage?.id;
        }).length;
        const tierProgress = tier.exercises.length > 0
          ? completedCount / tier.exercises.length
          : 0;

        return (
          <Paper
            key={tier.id}
            variant="outlined"
            sx={{
              mb: 2, p: 2,
              opacity: isLocked ? 0.5 : 1,
              borderColor: isCurrent ? 'primary.main' : 'divider',
              borderWidth: isCurrent ? 2 : 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isPast && <Icon name="check_circle" size={18} />}
                {isCurrent && <Icon name="play_circle" size={18} />}
                {isLocked && <Icon name="lock" size={18} />}
                <Typography variant="h3" sx={{ fontSize: '0.95rem' }}>
                  Tier {tier.tierNumber}: {tier.label}
                </Typography>
              </Box>
              <Chip
                label={isPast ? 'Complete' : isCurrent ? 'Current' : 'Locked'}
                size="small"
                color={isPast ? 'success' : isCurrent ? 'primary' : 'default'}
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {tier.description}
            </Typography>

            {!isLocked && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={tierProgress * 100}
                  sx={{ height: 6, borderRadius: 3, mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {tier.exercises.map(ex => {
                    const ep = getExerciseProgress(progress, ex.id);
                    const lastStage = ex.stages[ex.stages.length - 1];
                    const isComplete = ep.completedStageId === lastStage?.id;
                    const proficiency = getExerciseProficiency(ep);
                    const stageCount = ex.stages.length;
                    const completedStageIdx = ep.completedStageId
                      ? ex.stages.findIndex(s => s.id === ep.completedStageId)
                      : -1;
                    const stagesCompleted = completedStageIdx + 1;

                    return (
                      <Chip
                        key={ex.id}
                        icon={<Icon name={isComplete ? 'check_circle' : 'radio_button_unchecked'} size={16} />}
                        label={`${ex.key} ${ex.kind.includes('arpeggio') ? 'Arp' : ex.kind.includes('minor') ? 'min' : 'Maj'} (${stagesCompleted}/${stageCount})`}
                        size="small"
                        color={isComplete ? 'success' : proficiency > 0.5 ? 'primary' : 'default'}
                        variant={isComplete ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.75rem' }}
                      />
                    );
                  })}
                </Box>
              </>
            )}
          </Paper>
        );
      })}

      <Button
        variant="text"
        fullWidth
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        sx={{ mt: 2 }}
      >
        Back to Home
      </Button>
    </Box>
  );
}
