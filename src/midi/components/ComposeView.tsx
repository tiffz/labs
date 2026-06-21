import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useCallback, useRef } from 'react';
import OnscreenPianoKeyboard from '../../shared/components/music/OnscreenPianoKeyboard';
import { useMidi } from '../useMidi';
import { createEmptyRiff } from '../guide/riffGuideEngine';
import { MidiIntStepper } from './MidiIntStepper';

export function ComposeView() {
  const { state, dispatch } = useMidi();
  const riff = state.activeRiff ?? createEmptyRiff();
  const chordBufferRef = useRef<number[]>([]);
  const chordTimerRef = useRef<number | null>(null);

  const flushChord = useCallback(() => {
    const notes = chordBufferRef.current;
    chordBufferRef.current = [];
    if (notes.length === 0) return;
    dispatch({
      type: 'ADD_RIFF_STEP',
      step: { id: crypto.randomUUID(), pitches: [...notes].sort((a, b) => a - b) },
    });
  }, [dispatch]);

  const handleNoteOn = useCallback(
    (midi: number) => {
      chordBufferRef.current.push(midi);
      if (chordTimerRef.current !== null) window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = window.setTimeout(() => {
        chordTimerRef.current = null;
        flushChord();
      }, 80);
    },
    [flushChord],
  );

  const handleNoteOff = useCallback(() => {
    /* Step input captures on debounced chord buffer flush. */
  }, []);

  return (
    <Stack spacing={2} className="midi-compose-view">
      <Typography variant="body2" color="text.secondary">
        Click notes to build a pattern. Rhythm comes later in Guide mode.
      </Typography>

      <OnscreenPianoKeyboard
        activeNotes={new Set(state.activeMidis)}
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap" className="midi-riff-steps">
        {riff.steps.map((step, i) => (
          <span key={step.id} className="midi-riff-step">
            {i + 1}: {step.pitches.join('+')}
          </span>
        ))}
        {riff.steps.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No steps yet.
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          disabled={riff.steps.length === 0}
          onClick={() => dispatch({ type: 'UNDO_RIFF_STEP' })}
        >
          Undo step
        </Button>
        <MidiIntStepper
          label="Beats per step"
          value={riff.beatsPerStep}
          min={1}
          max={8}
          onChange={(beats) => dispatch({ type: 'SET_RIFF_BEATS_PER_STEP', beats })}
        />
        <Button
          size="small"
          variant="contained"
          className="midi-capture-cta"
          onClick={() => dispatch({ type: 'SET_ACTIVE_RIFF', riff })}
        >
          Save pattern
        </Button>
      </Stack>
    </Stack>
  );
}
