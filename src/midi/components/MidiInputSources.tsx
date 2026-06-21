import InputSourcesMenu from '../../shared/components/InputSourcesMenu';
import { midiToNoteName } from '../../shared/music/scoreTypes';
import { useMidi } from '../useMidi';

/**
 * Midi Scratchpad adapter around the shared `InputSourcesMenu`.
 * Microphone input is not used in this app; the mic row stays off.
 */
export function MidiInputSources() {
  const { state, toggleMidiDevice } = useMidi();

  return (
    <InputSourcesMenu
      midi={{
        devices: state.midiDevices
          .filter((device) => device.connected)
          .map((device) => ({
            id: device.id,
            name: device.name,
            enabled: !state.disabledMidiDeviceIds.has(device.id),
            onToggle: () => toggleMidiDevice(device.id),
          })),
        notDetectedHint: 'Plug a MIDI keyboard in via USB to capture loops.',
      }}
      microphone={{
        active: false,
        onToggle: () => {},
      }}
      activeMidiNotes={state.activeMidis}
      midiToNoteName={midiToNoteName}
    />
  );
}
