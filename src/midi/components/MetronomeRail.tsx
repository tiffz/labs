import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BpmInput from '../../shared/components/music/BpmInput';
import MetronomeToggleButton from '../../shared/components/MetronomeToggleButton';
import type { TimeSignature } from '../../shared/rhythm/types';
import { useMidi } from '../useMidi';
import { MidiOptionSelect } from './MidiOptionSelect';
import type { MidiSubdivision } from '../types';

const TIME_SIG_OPTIONS: { value: string; label: string; ts: TimeSignature }[] = [
  { value: '4/4', label: '4/4', ts: { numerator: 4, denominator: 4 } },
  { value: '3/4', label: '3/4', ts: { numerator: 3, denominator: 4 } },
  { value: '6/8', label: '6/8', ts: { numerator: 6, denominator: 8 } },
  { value: '2/4', label: '2/4', ts: { numerator: 2, denominator: 4 } },
];

const SUBDIVISION_OPTIONS: { value: MidiSubdivision; label: string }[] = [
  { value: 1, label: 'Quarters' },
  { value: 2, label: 'Eighths' },
  { value: 4, label: 'Sixteenths' },
];

function timeSigValue(ts: TimeSignature): string {
  return `${ts.numerator}/${ts.denominator}`;
}

export function MetronomeRail() {
  const { state, dispatch, toggleMetronome } = useMidi();
  const { transport, metronomePlaying, currentBeat } = state;
  const meterValue = timeSigValue(transport.timeSignature);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      className="midi-metronome-rail"
      role="group"
      aria-label="Tempo and meter"
    >
      <BpmInput
        value={transport.bpm}
        onChange={(bpm) => dispatch({ type: 'SET_TRANSPORT', patch: { bpm } })}
        layout="inline"
        showPresetDropdown
        showRateActions={false}
        trailingActions={
          <MetronomeToggleButton
            enabled={metronomePlaying}
            onToggle={() => void toggleMetronome()}
            ariaLabel={metronomePlaying ? 'Stop metronome' : 'Start metronome'}
          />
        }
      />

      <span className="midi-toolbar-divider" aria-hidden />

      <MidiOptionSelect
        aria-label="Time signature"
        value={meterValue}
        options={TIME_SIG_OPTIONS.map(({ value, label }) => ({ value, label }))}
        triggerClassName="midi-toolbar-select"
        onChange={(next) => {
          const match = TIME_SIG_OPTIONS.find((option) => option.value === next);
          if (match) {
            dispatch({ type: 'SET_TRANSPORT', patch: { timeSignature: match.ts } });
          }
        }}
      />

      <MidiOptionSelect
        aria-label="Grid subdivision"
        value={transport.subdivision}
        options={SUBDIVISION_OPTIONS}
        triggerClassName="midi-toolbar-select"
        onChange={(subdivision) => {
          dispatch({ type: 'SET_TRANSPORT', patch: { subdivision } });
        }}
      />

      {metronomePlaying && (
        <Typography variant="body2" aria-live="polite" className="midi-beat-indicator">
          Beat {currentBeat || 1}
        </Typography>
      )}
    </Stack>
  );
}
