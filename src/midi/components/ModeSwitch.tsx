import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { MidiAppMode } from '../types';
import { useMidi } from '../useMidi';

const MODES: { id: MidiAppMode; label: string }[] = [
  { id: 'scratchpad', label: 'Scratchpad' },
  { id: 'compose', label: 'Compose' },
  { id: 'guide', label: 'Guide' },
];

export function ModeSwitch() {
  const { state, dispatch } = useMidi();

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={state.mode}
      aria-label="App mode"
      className="midi-mode-switch"
      onChange={(_e, value: MidiAppMode | null) => {
        if (value) dispatch({ type: 'SET_MODE', mode: value });
      }}
    >
      {MODES.map(({ id, label }) => (
        <ToggleButton key={id} value={id} aria-label={label}>
          {label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
