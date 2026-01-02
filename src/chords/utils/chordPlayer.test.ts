import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chordPlayer } from './chordPlayer';
import type { StyledChordNotes } from './chordStyling';
import type { TimeSignature } from '../types';

// Mock AudioContext
vi.stubGlobal('AudioContext', class MockAudioContext {
  state = 'running';
  currentTime = 0;
  createOscillator() {
    return {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }
  resume() {
    return Promise.resolve();
  }
});

describe('chordPlayer', () => {
  beforeEach(() => {
    chordPlayer.stop();
    vi.useFakeTimers();
  });

  afterEach(() => {
    chordPlayer.stop();
    vi.useRealTimers();
  });

  const createMockChord = (): StyledChordNotes => ({
    trebleNotes: [
      { notes: [60, 64, 67], duration: 'q' }, // C major chord, quarter note
    ],
    bassNotes: [
      { notes: [48], duration: 'q' }, // C, quarter note
    ],
  });

  it('should call highlight callback when notes start', () => {
    const highlightCallback = vi.fn();
    const styledChords = [createMockChord()];
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    chordPlayer.play(styledChords, 120, timeSignature, highlightCallback);

    // Advance time to when first note should play
    vi.advanceTimersByTime(500);

    expect(highlightCallback).toHaveBeenCalled();
    const calls = highlightCallback.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    
    // Check that we got calls for treble and bass
    const trebleCall = calls.find(call => call[0].trebleGroupIndex === 0);
    const bassCall = calls.find(call => call[0].bassGroupIndex === 0);
    
    expect(trebleCall).toBeDefined();
    expect(bassCall).toBeDefined();
  });

  it('should call highlight callback with negative index when notes end', () => {
    const highlightCallback = vi.fn();
    const styledChords = [createMockChord()];
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    chordPlayer.play(styledChords, 120, timeSignature, highlightCallback);

    // Advance time past note duration (quarter note at 120 BPM = 500ms)
    vi.advanceTimersByTime(600);

    const calls = highlightCallback.mock.calls;
    
    // Should have calls for starting (positive index) and ending (negative index)
    const startCalls = calls.filter(call => call[0].trebleGroupIndex === 0);
    const endCalls = calls.filter(call => call[0].trebleGroupIndex === -1); // -0 - 1 = -1
    
    expect(startCalls.length).toBeGreaterThan(0);
    expect(endCalls.length).toBeGreaterThan(0);
  });

  it('should stop playback when stop is called', () => {
    const highlightCallback = vi.fn();
    const styledChords = [createMockChord()];
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    chordPlayer.play(styledChords, 120, timeSignature, highlightCallback);
    
    const callCountBefore = highlightCallback.mock.calls.length;
    
    chordPlayer.stop();
    
    vi.advanceTimersByTime(1000);
    
    // Should not have many more calls after stop
    expect(highlightCallback.mock.calls.length).toBe(callCountBefore);
  });

  it('should handle multiple measures correctly', () => {
    const highlightCallback = vi.fn();
    const styledChords = [createMockChord(), createMockChord()];
    const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };

    chordPlayer.play(styledChords, 120, timeSignature, highlightCallback);

    // Advance through first measure (4 beats at 120 BPM = 2000ms)
    vi.advanceTimersByTime(2100);

    const calls = highlightCallback.mock.calls;
    const measure0Calls = calls.filter(call => call[0].measureIndex === 0);
    const measure1Calls = calls.filter(call => call[0].measureIndex === 1);
    
    expect(measure0Calls.length).toBeGreaterThan(0);
    expect(measure1Calls.length).toBeGreaterThan(0);
  });
});

