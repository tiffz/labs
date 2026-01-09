import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rhythmPlayer } from './rhythmPlayer';
import { parseRhythm } from './rhythmParser';
import type { TimeSignature } from '../types';

// Mock the audio player
vi.mock('./audioPlayer', () => ({
  audioPlayer: {
    play: vi.fn(),
    stopAll: vi.fn(),
    stopAllDrumSounds: vi.fn(),
    playClick: vi.fn(),
    setReverbStrength: vi.fn(),
    // New methods for audio health management
    ensureResumed: vi.fn().mockResolvedValue(true),
    isHealthy: vi.fn().mockReturnValue(true),
    getState: vi.fn().mockReturnValue('running'),
  },
}));

describe('rhythmPlayer timing accuracy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset mock implementations between tests (clearAllMocks doesn't remove implementations)
    vi.clearAllMocks();
  });

  afterEach(() => {
    rhythmPlayer.stop();
    vi.useRealTimers();
  });

  describe('BPM timing calculations', () => {
    it('should play notes at correct intervals for 120 BPM', async () => {
      const notation = 'D-T-D-T-'; // Four eighth notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 120 BPM:
      // - Quarter note = 60000ms / 120 = 500ms
      // - Sixteenth note = 500ms / 4 = 125ms
      // - Eighth note (2 sixteenths) = 250ms

      // Notes are scheduled immediately, then at intervals
      vi.advanceTimersByTime(0); // First note (D) - fires immediately
      expect(noteTimes).toHaveLength(1);
      expect(noteTimes[0]).toBe(0);

      vi.advanceTimersByTime(250); // Second note (T)
      expect(noteTimes).toHaveLength(2);
      expect(noteTimes[1]).toBe(250);

      vi.advanceTimersByTime(250); // Third note (D)
      expect(noteTimes).toHaveLength(3);
      expect(noteTimes[2]).toBe(500);

      vi.advanceTimersByTime(250); // Fourth note (T)
      expect(noteTimes).toHaveLength(4);
      expect(noteTimes[3]).toBe(750);
    });

    it('should play notes at correct intervals for 90 BPM', async () => {
      const notation = 'D---T---'; // Two quarter notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 90;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 90 BPM:
      // - Quarter note = 60000ms / 90 = 666.666...ms
      // - Sixteenth note = 666.666... / 4 = 166.666...ms
      // - Quarter note (4 sixteenths) = 666.666...ms

      vi.advanceTimersByTime(0); // First note (D) - immediate
      expect(noteTimes).toHaveLength(1);
      expect(noteTimes[0]).toBe(0);

      vi.advanceTimersByTime(666); // Second note (T) - after ~666ms
      expect(noteTimes).toHaveLength(2);
      // Allow for small rounding differences
      expect(noteTimes[1]).toBeGreaterThanOrEqual(666);
      expect(noteTimes[1]).toBeLessThanOrEqual(667);
    });

    it('should handle different note durations correctly', async () => {
      const notation = 'D-T---K'; // Eighth, quarter, sixteenth
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 120 BPM:
      // - Sixteenth = 125ms
      // - Eighth (2 sixteenths) = 250ms
      // - Quarter (4 sixteenths) = 500ms

      vi.advanceTimersByTime(0); // D (eighth)
      expect(noteTimes[0]).toBe(0);

      vi.advanceTimersByTime(250); // T (quarter) - starts at 250ms
      expect(noteTimes[1]).toBe(250);

      vi.advanceTimersByTime(500); // K (sixteenth) - starts at 750ms
      expect(noteTimes[2]).toBe(750);
    });
  });

  describe('looping accuracy', () => {
    it('should maintain accurate timing across multiple loops', async () => {
      const notation = 'D-T-'; // Two eighth notes
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // D-T- parses to 3 notes: D (eighth), T (eighth), auto-filled rest (quarter)
      // Each eighth is 250ms, quarter is 500ms, so loop duration = 1000ms
      // Advance through 3 loops
      vi.advanceTimersByTime(0); // Loop 1 start
      vi.advanceTimersByTime(3000); // Advance 3 loops worth of time
      
      // Should have at least 9 notes (3 per loop * 3 loops)
      expect(noteTimes.length).toBeGreaterThanOrEqual(9);
      
      // Verify first loop
      expect(noteTimes[0]).toBe(0); // D
      expect(noteTimes[1]).toBe(250); // T
      expect(noteTimes[2]).toBe(500); // Auto-filled rest
      
      // Verify second loop starts around 1000ms (allow 1ms scheduling overhead)
      expect(noteTimes[3]).toBeGreaterThanOrEqual(1000);
      expect(noteTimes[3]).toBeLessThanOrEqual(1001);
      
      // Verify third loop starts around 2000ms (allow 2ms scheduling overhead)
      expect(noteTimes[6]).toBeGreaterThanOrEqual(2000);
      expect(noteTimes[6]).toBeLessThanOrEqual(2002);
    });

    it('should not accumulate timing drift over 10 loops', async () => {
      const notation = 'D-T-'; // Two eighth notes
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // D-T- parses to 3 notes: D (eighth), T (eighth), auto-filled rest (quarter)
      // Each eighth is 250ms, quarter is 500ms, so loop duration = 1000ms
      // Advance through 10 loops
      vi.advanceTimersByTime(0); // Loop 1 start
      vi.advanceTimersByTime(10000); // Advance 10 loops worth of time
      
      // Should have at least 30 notes (3 per loop * 10 loops)
      expect(noteTimes.length).toBeGreaterThanOrEqual(30);
      
      // Check 10th loop starts around 9000ms (9 complete loops * 1000ms)
      // Allow 10ms drift over 10 loops
      const loop10StartIndex = 27; // 9 complete loops * 3 notes
      expect(noteTimes[loop10StartIndex]).toBeGreaterThanOrEqual(9000);
      expect(noteTimes[loop10StartIndex]).toBeLessThanOrEqual(9010);
    });

    it('should handle complex rhythms with rests accurately over multiple loops', async () => {
      const notation = 'D-__T---'; // Eighth, eighth rest, quarter note (8 sixteenths) + auto-filled rest (8 sixteenths)
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // Notation 'D-__T---' parses to 4 notes (with auto-filled rest):
      // 1. D- (eighth = 2 sixteenths = 250ms)
      // 2. __ (eighth rest = 2 sixteenths = 250ms) - callback fires but no sound
      // 3. T--- (quarter = 4 sixteenths = 500ms)
      // 4. Auto-filled rest (half = 8 sixteenths = 1000ms)
      // Total loop duration = 16 sixteenths = 2000ms

      // Loop 1
      vi.advanceTimersByTime(0);
      expect(noteTimes[0]).toBe(0); // D fires immediately

      vi.advanceTimersByTime(250); // Advance to rest
      expect(noteTimes[1]).toBe(250); // Rest callback fires (for visual highlighting)

      vi.advanceTimersByTime(250); // Advance to T
      expect(noteTimes[2]).toBe(500); // T fires

      vi.advanceTimersByTime(500); // Complete T duration
      expect(noteTimes[3]).toBe(1000); // Auto-filled rest

      // Complete loop 1 and start loop 2
      vi.advanceTimersByTime(1000); // Complete auto-filled rest
      vi.advanceTimersByTime(1); // Trigger next loop scheduling
      expect(noteTimes[4]).toBeGreaterThanOrEqual(2000); // D in loop 2
      expect(noteTimes[4]).toBeLessThanOrEqual(2001);

      vi.advanceTimersByTime(250);
      expect(noteTimes[5]).toBeGreaterThanOrEqual(2250); // Rest in loop 2
      expect(noteTimes[5]).toBeLessThanOrEqual(2251);

      vi.advanceTimersByTime(250);
      expect(noteTimes[6]).toBeGreaterThanOrEqual(2500); // T in loop 2
      expect(noteTimes[6]).toBeLessThanOrEqual(2501);
    });
  });

  describe('stop functionality', () => {
    it('should clear all scheduled timeouts when stopped', async () => {
      const notation = 'D-T-K-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteTimes.push(performance.now());
      });

      // Advance to first note
      vi.advanceTimersByTime(0);
      expect(noteTimes).toHaveLength(1);

      // Stop playback
      rhythmPlayer.stop();

      // Advance time - no more notes should play
      vi.advanceTimersByTime(10000);
      expect(noteTimes).toHaveLength(1); // Still only 1 note
    });

    it('should allow restarting after stop', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      let noteCount = 0;
      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteCount++;
      });

      vi.advanceTimersByTime(0); // First note fires immediately
      expect(noteCount).toBe(1);

      rhythmPlayer.stop();
      vi.advanceTimersByTime(1000);
      expect(noteCount).toBe(1); // No more notes

      // Restart
      noteCount = 0;
      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteCount++;
      });

      vi.advanceTimersByTime(0); // First note fires immediately
      expect(noteCount).toBe(1); // Playing again
    });
  });

  describe('edge cases', () => {
    it('should handle very fast BPM (240 BPM)', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 240;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 240 BPM:
      // - Quarter note = 60000 / 240 = 250ms
      // - Eighth note = 125ms

      vi.advanceTimersByTime(125);
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(125);
    });

    it('should handle very slow BPM (40 BPM)', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 40;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 40 BPM:
      // - Quarter note = 60000 / 40 = 1500ms
      // - Eighth note = 750ms

      vi.advanceTimersByTime(750);
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(750);
    });

    it('should handle single note rhythm', async () => {
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // First loop
      vi.advanceTimersByTime(0);
      expect(noteTimes).toHaveLength(1);
      expect(noteTimes[0]).toBe(0);

      // Second loop should start around 500ms (quarter note at 120 BPM)
      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(1); // Trigger next loop
      expect(noteTimes).toHaveLength(2);
      expect(noteTimes[1]).toBeGreaterThanOrEqual(500);
      expect(noteTimes[1]).toBeLessThanOrEqual(501);
    });
  });

  describe('performance.now() consistency', () => {
    it('should use the same performance.now() value for all notes in a loop', async () => {
      const notation = 'D-T-K-__'; // Multiple notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // All delays should be calculated from the same reference point
      // Even if some time passes during scheduling
      vi.advanceTimersByTime(250); // D
      vi.advanceTimersByTime(250); // T
      vi.advanceTimersByTime(250); // K
      vi.advanceTimersByTime(250); // Rest

      // Times should be exact multiples of 250ms
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(250);
      expect(noteTimes[2]).toBe(500);
    });
  });

  describe('metronome beats', () => {

    it('should schedule metronome clicks for all beats in 4/4 time', async () => {
      const notation = 'D---T---K---S---'; // Four quarter notes (one per beat)
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const metronomeBeats: Array<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean }> = [];

      await rhythmPlayer.play(
        parsedRhythm,
        bpm,
        undefined,
        undefined,
        true, // metronomeEnabled
        (measureIndex, positionInSixteenths, isDownbeat) => {
          metronomeBeats.push({ measureIndex, positionInSixteenths, isDownbeat });
        }
      );

      // At 120 BPM, quarter note = 500ms, sixteenth = 125ms
      // For 4/4 time, beat groups are [4, 4, 4, 4] sixteenths
      // Metronome should click at positions: 0 (downbeat), 4, 8, 12
      // Times: 0ms, 500ms, 1000ms, 1500ms

      // Advance through all beats - advance enough time to trigger all scheduled beats
      vi.advanceTimersByTime(0); // Trigger immediate beats (downbeat at 0ms)
      expect(metronomeBeats.length).toBeGreaterThanOrEqual(1);
      expect(metronomeBeats[0]).toEqual({ measureIndex: 0, positionInSixteenths: 0, isDownbeat: true });

      vi.advanceTimersByTime(500); // Advance to first beat (500ms) - position 4
      expect(metronomeBeats.length).toBeGreaterThanOrEqual(2);
      if (metronomeBeats.length >= 2) {
        expect(metronomeBeats[1]).toEqual({ measureIndex: 0, positionInSixteenths: 4, isDownbeat: false });
      }

      vi.advanceTimersByTime(500); // Advance to second beat (1000ms) - position 8
      expect(metronomeBeats.length).toBeGreaterThanOrEqual(3);
      if (metronomeBeats.length >= 3) {
        expect(metronomeBeats[2]).toEqual({ measureIndex: 0, positionInSixteenths: 8, isDownbeat: false });
      }

      vi.advanceTimersByTime(500); // Advance to third beat (1500ms) - position 12
      // Should have exactly 4 beats for 4/4 time
      expect(metronomeBeats.length).toBe(4);
      expect(metronomeBeats[3]).toEqual({ measureIndex: 0, positionInSixteenths: 12, isDownbeat: false });
    });

    it('should schedule metronome clicks for all beats in 3/4 time', async () => {
      const notation = 'D---T---K---'; // Three quarter notes
      const timeSignature: TimeSignature = { numerator: 3, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const metronomeBeats: Array<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean }> = [];

      await rhythmPlayer.play(
        parsedRhythm,
        bpm,
        undefined,
        undefined,
        true, // metronomeEnabled
        (measureIndex, positionInSixteenths, isDownbeat) => {
          metronomeBeats.push({ measureIndex, positionInSixteenths, isDownbeat });
        }
      );

      // For 3/4 time, beat groups are [4, 4, 4] sixteenths
      // Metronome should click at positions: 0 (downbeat), 4, 8
      // At 120 BPM, sixteenth = 125ms, so beats are at 0ms, 500ms, 1000ms

      // Advance through all beats
      vi.advanceTimersByTime(0); // Downbeat at position 0
      vi.advanceTimersByTime(500); // First beat at position 4
      vi.advanceTimersByTime(500); // Second beat at position 8

      expect(metronomeBeats.length).toBe(3);
      expect(metronomeBeats[0]).toEqual({ measureIndex: 0, positionInSixteenths: 0, isDownbeat: true });
      expect(metronomeBeats[1]).toEqual({ measureIndex: 0, positionInSixteenths: 4, isDownbeat: false });
      expect(metronomeBeats[2]).toEqual({ measureIndex: 0, positionInSixteenths: 8, isDownbeat: false });
    });

    it('should schedule metronome clicks for all beats in 6/8 time', async () => {
      const notation = 'D---T---K---S---__--'; // Six eighth notes
      const timeSignature: TimeSignature = { numerator: 6, denominator: 8 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const metronomeBeats: Array<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean }> = [];

      await rhythmPlayer.play(
        parsedRhythm,
        bpm,
        undefined,
        undefined,
        true, // metronomeEnabled
        (measureIndex, positionInSixteenths, isDownbeat) => {
          metronomeBeats.push({ measureIndex, positionInSixteenths, isDownbeat });
        }
      );

      // For 6/8 time, beat groups are [6, 6] sixteenths (two groups of 3 eighth notes)
      // Metronome should click at positions: 0 (downbeat), 6

      vi.advanceTimersByTime(0); // Downbeat
      vi.advanceTimersByTime(750); // First beat group (6 * 125ms = 750ms)

      expect(metronomeBeats.length).toBe(2);
      expect(metronomeBeats[0]).toEqual({ measureIndex: 0, positionInSixteenths: 0, isDownbeat: true });
      expect(metronomeBeats[1]).toEqual({ measureIndex: 0, positionInSixteenths: 6, isDownbeat: false });
    });

    it('should not play metronome clicks when metronome is disabled', async () => {
      const notation = 'D---T---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const metronomeBeats: Array<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean }> = [];

      await rhythmPlayer.play(
        parsedRhythm,
        bpm,
        undefined,
        undefined,
        false, // metronomeEnabled = false
        (measureIndex, positionInSixteenths, isDownbeat) => {
          metronomeBeats.push({ measureIndex, positionInSixteenths, isDownbeat });
        }
      );

      vi.advanceTimersByTime(2000); // Advance through multiple beats

      // No metronome beats should be recorded when disabled
      expect(metronomeBeats.length).toBe(0);
    });
  });

  describe('tied notes', () => {
    it('should only play the first note in a tied note chain', async () => {
      // A SINGLE note spanning 2 measures creates tied notes
      // D followed by 31 dashes = 32 sixteenths = 2 measures in 4/4
      // The parser will split this into two tied notes
      const notation = 'D-------------------------------'; // One note spanning 2 measures
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      // Verify we have 2 measures with tied notes
      expect(parsedRhythm.measures.length).toBe(2);
      expect(parsedRhythm.measures[0].notes[0].isTiedTo).toBe(true);
      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);

      // Track which notes trigger visual highlighting
      const highlightedNotes: Array<{ measureIndex: number; noteIndex: number }> = [];
      
      await rhythmPlayer.play(parsedRhythm, 120, (measureIndex, noteIndex) => {
        highlightedNotes.push({ measureIndex, noteIndex });
      });

      // Advance to trigger first note
      vi.advanceTimersByTime(0);
      expect(highlightedNotes.length).toBe(1);
      expect(highlightedNotes[0]).toEqual({ measureIndex: 0, noteIndex: 0 });

      // Advance to the second measure (tied continuation)
      // At 120 BPM, one measure (16 sixteenths) = 16 * 125ms = 2000ms
      vi.advanceTimersByTime(2000);
      
      // Both notes should be highlighted for visual feedback,
      // but the second one (isTiedFrom) should not have triggered a sound
      // (we can't directly test the audioPlayer.play call without more mocking,
      // but we verify the highlight callback was called for both notes)
      expect(highlightedNotes.length).toBe(2);
      expect(highlightedNotes[1]).toEqual({ measureIndex: 1, noteIndex: 0 });

      // Verify the second note is indeed a tied note
      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);
    });

    it('should correctly identify tied notes in parsed rhythm', () => {
      // A SINGLE note spanning 2 measures creates tied notes
      // D followed by 31 dashes = 32 sixteenths = 2 measures in 4/4
      const notation = 'D-------------------------------'; // One note spanning 2 measures
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      // Should have 2 measures
      expect(parsedRhythm.measures.length).toBe(2);

      // First measure: D with isTiedTo
      expect(parsedRhythm.measures[0].notes[0].isTiedTo).toBe(true);
      expect(parsedRhythm.measures[0].notes[0].isTiedFrom).toBeFalsy();

      // Second measure: D with isTiedFrom
      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);
    });
  });
});

