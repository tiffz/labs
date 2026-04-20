import { useScales } from '../store';
import InputSourcesMenu from '../../shared/components/InputSourcesMenu';
import { midiToNoteName } from '../../shared/music/scoreTypes';

/**
 * Scales-app adapter around the shared `InputSourcesMenu`.
 *
 * Maps scales-store state into the shared component. Copy, layout, and
 * styling all live in the shared component — this adapter only provides
 * state. See `src/shared/components/InputSourcesMenu.tsx`.
 */
export default function ScalesInputSources() {
  const { state, toggleMicrophone, toggleMidiDevice } = useScales();

  return (
    <InputSourcesMenu
      midi={{
        devices: state.midiDevices
          .filter(d => d.connected)
          .map(d => ({
            id: d.id,
            name: d.name,
            enabled: !state.disabledMidiDeviceIds.has(d.id),
            onToggle: () => toggleMidiDevice(d.id),
          })),
      }}
      microphone={{
        active: state.microphoneActive,
        onToggle: toggleMicrophone,
      }}
      activeMidiNotes={state.activeMidiNotes}
      midiToNoteName={midiToNoteName}
    />
  );
}
