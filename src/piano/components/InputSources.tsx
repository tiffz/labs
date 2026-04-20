import React from 'react';
import { usePiano } from '../store';
import InputSourcesMenu, { type MidiDeviceEntry } from '../../shared/components/InputSourcesMenu';
import { midiToNoteName } from '../../shared/music/scoreTypes';

/**
 * Piano-app adapter around the shared `InputSourcesMenu`.
 *
 * The piano app has a single global MIDI toggle (not per-device) plus a
 * microphone device selector. Copy and styling live in the shared component.
 */
const InputSources: React.FC = () => {
  const { state, toggleMicrophone, setSelectedMicrophoneDevice, toggleMidiInput } = usePiano();

  const midiDevices: MidiDeviceEntry[] =
    state.midiConnected && state.midiDevices.length > 0
      ? [
          {
            id: 'midi',
            name: state.midiDevices[0].name,
            enabled: state.midiInputEnabled,
            onToggle: () => toggleMidiInput(),
          },
        ]
      : [];

  return (
    <InputSourcesMenu
      midi={{ devices: midiDevices }}
      microphone={{
        active: state.microphoneActive,
        onToggle: toggleMicrophone,
        activeLabel: state.activeMicrophoneLabel,
        devices: state.microphoneDevices,
        selectedDeviceId: state.selectedMicrophoneDeviceId,
        onSelectDevice: setSelectedMicrophoneDevice,
      }}
      activeMidiNotes={state.activeMidiNotes}
      midiToNoteName={midiToNoteName}
    />
  );
};

export default InputSources;
