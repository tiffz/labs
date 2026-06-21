import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMidi } from '../useMidi';
import { MidiIntStepper } from './MidiIntStepper';

export function CaptureBar() {
  const { state, dispatch, captureLastBars } = useMidi();
  const { captureBarCount, isListening, capturedLoop } = state;

  return (
    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" className="midi-capture-bar">
      <MidiIntStepper
        label="Bars"
        value={captureBarCount}
        min={1}
        max={16}
        onChange={(count) => dispatch({ type: 'SET_CAPTURE_BAR_COUNT', count })}
      />

      <Button
        variant="contained"
        className="midi-capture-cta"
        disabled={!isListening}
        onClick={captureLastBars}
      >
        Capture last {captureBarCount} bars
      </Button>

      {!isListening && (
        <Typography variant="body2" color="text.secondary" className="midi-capture-hint">
          Plug in a keyboard to capture.
        </Typography>
      )}

      {capturedLoop && (
        <Typography variant="caption" color="text.secondary">
          Loop ready · {capturedLoop.events.length} events
        </Typography>
      )}
    </Stack>
  );
}
