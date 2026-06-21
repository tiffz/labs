import { describe, it, expect } from 'vitest';
import { midiReducer } from './storeTypes';
import { DEFAULT_STATE } from './types';

describe('midiReducer', () => {
  it('CAPTURE_LAST_BARS stores loop', () => {
    const loop = {
      id: 'l1',
      capturedAt: 100,
      barCount: 4,
      transportSnapshot: DEFAULT_STATE.transport,
      loopStartPerfMs: 0,
      loopEndPerfMs: 100,
      events: [],
    };
    const next = midiReducer(DEFAULT_STATE, { type: 'CAPTURE_LAST_BARS', loop });
    expect(next.capturedLoop?.id).toBe('l1');
  });

  it('TOGGLE_MIDI_DEVICE updates listening state', () => {
    const withDevice = midiReducer(DEFAULT_STATE, {
      type: 'SET_MIDI_DEVICES',
      devices: [{ id: 'd1', name: 'Keys', manufacturer: 'Test', connected: true }],
    });
    expect(withDevice.isListening).toBe(true);

    const disabled = midiReducer(withDevice, { type: 'TOGGLE_MIDI_DEVICE', deviceId: 'd1' });
    expect(disabled.isListening).toBe(false);
    expect(disabled.disabledMidiDeviceIds.has('d1')).toBe(true);
  });

  it('ADD_RIFF_STEP appends step', () => {
    const next = midiReducer(DEFAULT_STATE, {
      type: 'ADD_RIFF_STEP',
      step: { id: 's1', pitches: [60] },
    });
    expect(next.activeRiff?.steps.length).toBe(1);
  });
});
