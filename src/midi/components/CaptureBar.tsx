import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMidi } from '../useMidi';
import { MidiIntStepper } from './MidiIntStepper';

export function CaptureBar() {
  const { state, dispatch, captureLastBars } = useMidi();
  const { captureBarCount, isListening, capturedLoop } = state;

  return (
    <Stack
      direction="row"
      spacing={2}
      className="midi-capture-bar"
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
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
        <Typography variant="body2" className="midi-capture-hint" sx={{
          color: "text.secondary"
        }}>
          Plug in a keyboard to capture.
        </Typography>
      )}
      {capturedLoop && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Loop ready · {capturedLoop.events.length} events
        </Typography>
      )}
    </Stack>
  );
}
