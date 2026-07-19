import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PlaybackSpeedControl from '../../shared/components/music/PlaybackSpeedControl';
import { useMidi } from '../useMidi';

export function LoopTransport() {
  const { state, dispatch, toggleLoopPlayback } = useMidi();
  const disabled = !state.capturedLoop;

  return (
    <Stack
      direction="row"
      spacing={2}
      className="midi-loop-transport"
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <Button
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={toggleLoopPlayback}
        aria-pressed={state.loopPlaying}
      >
        {state.loopPlaying ? 'Stop loop' : 'Play loop'}
      </Button>
      <PlaybackSpeedControl
        value={state.transport.playbackRate}
        min={0.5}
        max={2}
        step={0.05}
        disabled={disabled}
        onChange={(playbackRate) =>
          dispatch({ type: 'SET_TRANSPORT', patch: { playbackRate } })}
      />
      <Button
        variant="text"
        size="small"
        disabled={!state.capturedLoop}
        onClick={() => dispatch({ type: 'CLEAR_CAPTURE' })}
      >
        Clear capture
      </Button>
    </Stack>
  );
}
