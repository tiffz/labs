/**
 * Tests for Piano Synthesizer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PianoSynthesizer } from './pianoSynth';

// Mock AudioContext and related interfaces
const createMockGainNode = () => ({
  gain: {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
});

const createMockOscillator = () => ({
  type: 'sine' as OscillatorType,
  frequency: { value: 440 },
  detune: { value: 0 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  onended: null as (() => void) | null,
});

const createMockAudioContext = () => ({
  currentTime: 0,
  sampleRate: 44100,
  state: 'running' as AudioContextState,
  createGain: vi.fn(() => createMockGainNode()),
  createOscillator: vi.fn(() => createMockOscillator()),
  createBufferSource: vi.fn(),
  createBiquadFilter: vi.fn(),
  createBuffer: vi.fn(),
});

describe('PianoSynthesizer', () => {
  let mockAudioContext: ReturnType<typeof createMockAudioContext>;
  let pianoSynth: PianoSynthesizer;

  beforeEach(() => {
    mockAudioContext = createMockAudioContext();
    pianoSynth = new PianoSynthesizer(mockAudioContext as unknown as AudioContext);
  });

  describe('playNote', () => {
    it('creates oscillators for each harmonic', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      // Should create 6 oscillators (one per harmonic)
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(6);
    });

    it('creates gain nodes for envelope control', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      // 1 output gain (from BaseInstrument) + 6 note gains (one per harmonic)
      // The output gain is created in constructor
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('sets correct frequency for fundamental', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      // First oscillator should be the fundamental at 440Hz
      const firstOsc = oscillatorCalls[0].value;
      expect(firstOsc.frequency.value).toBe(440);
    });

    it('sets harmonic frequencies correctly', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      // Second harmonic should be 880Hz (2x fundamental)
      const secondOsc = oscillatorCalls[1].value;
      expect(secondOsc.frequency.value).toBe(880);
    });

    it('schedules oscillator start and stop', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      const firstOsc = oscillatorCalls[0].value;
      
      expect(firstOsc.start).toHaveBeenCalled();
      expect(firstOsc.stop).toHaveBeenCalled();
    });

    it('applies ADSR envelope to gain nodes', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const gainCalls = mockAudioContext.createGain.mock.results;
      // Check that gain envelope methods were called
      // The note gain nodes (not the output gain) should have envelope automation
      const noteGain = gainCalls[1].value; // First note gain (index 0 is output gain)
      
      expect(noteGain.gain.setValueAtTime).toHaveBeenCalled();
      expect(noteGain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });

    it('does not play when disposed', () => {
      pianoSynth.dispose();
      
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      // Should not create any oscillators after disposal
      // (createOscillator called 0 times after dispose)
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('uses default velocity when not provided', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
      });

      // Should still create oscillators with default velocity
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(6);
    });
  });

  describe('stopAll', () => {
    it('fades out the output gain', () => {
      const outputGain = mockAudioContext.createGain.mock.results[0].value;
      
      pianoSynth.stopAll(50);

      expect(outputGain.gain.cancelScheduledValues).toHaveBeenCalled();
      expect(outputGain.gain.setValueAtTime).toHaveBeenCalled();
      expect(outputGain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });
  });

  describe('connect/disconnect', () => {
    it('can connect to a destination node', () => {
      const mockDestination = createMockGainNode();
      pianoSynth.connect(mockDestination as unknown as AudioNode);

      const outputGain = mockAudioContext.createGain.mock.results[0].value;
      expect(outputGain.connect).toHaveBeenCalledWith(mockDestination);
    });

    it('can disconnect from destination', () => {
      pianoSynth.disconnect();

      const outputGain = mockAudioContext.createGain.mock.results[0].value;
      expect(outputGain.disconnect).toHaveBeenCalled();
    });
  });
});
