import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppLinearVolumeSlider from '../../shared/components/AppLinearVolumeSlider';
import { useMidi } from '../useMidi';
import { selectDisplayLayer } from '../selectors';

export function NotationStrictnessSlider() {
  const { state, dispatch } = useMidi();
  const display = selectDisplayLayer(state);
  const disabled = !state.capturedLoop;

  let helper = 'Capture a loop to adjust how tidy the sheet music looks.';
  if (!disabled && display) {
    if (display.strictness < 0.15) helper = 'Human timing preserved on screen.';
    else if (display.strictness > 0.85) helper = 'Grid-locked for easy reading.';
    else helper = 'Blend of feel and readability.';
  }

  return (
    <Stack spacing={0.5} className="midi-strictness">
      <Typography variant="subtitle2" id="midi-strictness-label" className="midi-strictness-label">
        How tidy should it look?
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {helper}
      </Typography>
      <AppLinearVolumeSlider
        aria-labelledby="midi-strictness-label"
        value={state.notationStrictness}
        min={0}
        max={1}
        step={0.05}
        disabled={disabled}
        onChange={(_e, v) => dispatch({ type: 'SET_NOTATION_STRICTNESS', value: v as number })}
      />
      <Stack direction="row" sx={{
        justifyContent: "space-between"
      }}>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>Loose</Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>Strict</Typography>
      </Stack>
    </Stack>
  );
}
