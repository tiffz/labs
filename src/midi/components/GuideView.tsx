import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useMidi } from '../useMidi';

export function GuideView() {
  const { state, startGuide, stopGuide } = useMidi();
  const riff = state.activeRiff;
  const stepIndex = state.guideStepIndex;

  if (!riff || riff.steps.length === 0) {
    return (
      <Stack spacing={2} className="midi-guide-view">
        <Typography variant="body2" color="text.secondary">
          Compose a pattern first, then return here to practice it in time.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} className="midi-guide-view">
      <Typography variant="body2" color="text.secondary">
        Follow the highlighted step. Play the notes when the metronome cues you.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" className="midi-riff-steps">
        {riff.steps.map((step, i) => (
          <span
            key={step.id}
            className={`midi-riff-step${stepIndex === i ? ' is-active' : ''}`}
          >
            {i + 1}: {step.pitches.join('+')}
          </span>
        ))}
      </Stack>

      <Stack direction="row" spacing={2}>
        {!state.guideRunning ? (
          <Button variant="contained" className="midi-capture-cta" onClick={() => void startGuide()}>
            Start guide
          </Button>
        ) : (
          <Button variant="outlined" onClick={stopGuide}>
            Stop guide
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" aria-live="polite">
          {state.guideRunning && stepIndex !== null
            ? `Step ${stepIndex + 1} of ${riff.steps.length}`
            : 'Ready'}
        </Typography>
      </Stack>
    </Stack>
  );
}
