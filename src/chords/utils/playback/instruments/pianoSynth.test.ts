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
    it('creates oscillators for each harmonic plus modulation LFO for long notes', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0, // Long note triggers modulation
        velocity: 0.8,
      });

      // Should create 7 oscillators: 1 LFO for modulation + 6 harmonics
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(7);
    });

    it('creates only harmonic oscillators for short notes (no modulation)', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 0.3, // Short note - no modulation
        velocity: 0.8,
      });

      // Should create only 6 oscillators (harmonics, no LFO)
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(6);
    });

    it('creates gain nodes for envelope control', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      // 1 output gain (from BaseInstrument) + 6 note gains + modulation gains
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('sets correct frequency for fundamental (after LFO)', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      // First oscillator is LFO (low frequency), second is fundamental at 440Hz
      const fundamentalOsc = oscillatorCalls[1].value;
      expect(fundamentalOsc.frequency.value).toBe(440);
    });

    it('sets harmonic frequencies correctly', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      // Index 0 is LFO, index 1 is fundamental, index 2 is 2nd harmonic (880Hz)
      const secondHarmonicOsc = oscillatorCalls[2].value;
      expect(secondHarmonicOsc.frequency.value).toBe(880);
    });

    it('schedules oscillator start and stop', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const oscillatorCalls = mockAudioContext.createOscillator.mock.results;
      // Check the fundamental oscillator (index 1, after LFO)
      const fundamentalOsc = oscillatorCalls[1].value;
      
      expect(fundamentalOsc.start).toHaveBeenCalled();
      expect(fundamentalOsc.stop).toHaveBeenCalled();
    });

    it('applies ADSR envelope to gain nodes', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 1.0,
        velocity: 0.8,
      });

      const gainCalls = mockAudioContext.createGain.mock.results;
      // Check that gain envelope methods were called on one of the note gains
      // With modulation, the order is: output gain, LFO gain, modulation gain, then note gains
      // Find a gain node that has envelope automation
      const hasEnvelope = gainCalls.some(call => 
        call.value.gain.setValueAtTime.mock.calls.length > 0
      );
      
      expect(hasEnvelope).toBe(true);
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
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('uses default velocity when not provided', () => {
      pianoSynth.playNote({
        frequency: 440,
        startTime: 0.1,
        duration: 0.3, // Short note to avoid modulation complexity
      });

      // Should create 6 oscillators (harmonics only, no modulation for short notes)
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
