import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rhythmPlayer } from './rhythmPlayer';
import { parseRhythm } from './rhythmParser';
import type { TimeSignature } from '../types';

// Mock the audio player
vi.mock('./audioPlayer', () => ({
  audioPlayer: {
    play: vi.fn(),
    stopAll: vi.fn(),
  },
}));

describe('rhythmPlayer timing accuracy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    rhythmPlayer.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('BPM timing calculations', () => {
    it('should play notes at correct intervals for 120 BPM', () => {
      const notation = 'D-T-D-T-'; // Four eighth notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
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

    it('should play notes at correct intervals for 90 BPM', () => {
      const notation = 'D---T---'; // Two quarter notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 90;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
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

    it('should handle different note durations correctly', () => {
      const notation = 'D-T---K'; // Eighth, quarter, sixteenth
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
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
    it('should maintain accurate timing across multiple loops', () => {
      const notation = 'D-T-'; // Simple two-note pattern
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // Each note is 250ms (eighth note at 120 BPM)
      // Loop duration = 500ms

      // Loop 1
      vi.advanceTimersByTime(0); // D at 0ms (immediate)
      vi.advanceTimersByTime(250); // T at 250ms
      vi.advanceTimersByTime(250); // End of loop 1 at 500ms

      // Loop 2 should start around 500ms (may have 1ms scheduling overhead)
      vi.advanceTimersByTime(0); // D at ~500ms
      vi.advanceTimersByTime(250); // T at ~750ms
      vi.advanceTimersByTime(250); // End of loop 2

      // Loop 3
      vi.advanceTimersByTime(0); // D at ~1000ms
      vi.advanceTimersByTime(250); // T at ~1250ms

      // Check times with tolerance for scheduling overhead (1ms per loop)
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(250);
      expect(noteTimes[2]).toBeGreaterThanOrEqual(500);
      expect(noteTimes[2]).toBeLessThanOrEqual(501);
      expect(noteTimes[3]).toBe(750);
      expect(noteTimes[4]).toBeGreaterThanOrEqual(1000);
      expect(noteTimes[4]).toBeLessThanOrEqual(1001);
      expect(noteTimes[5]).toBe(1250);
    });

    it('should not accumulate timing drift over 10 loops', () => {
      const notation = 'D-T-K-'; // Three eighth notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // Each note is 250ms, loop duration = 750ms
      const loopDuration = 750;
      const noteInterval = 250;

      // Simulate 10 loops
      for (let loop = 0; loop < 10; loop++) {
        for (let note = 0; note < 3; note++) {
          vi.advanceTimersByTime(noteInterval);
        }
      }

      // Check that notes in loop 10 are at approximately the right times
      // Allow for small scheduling overhead (1ms per loop = 9ms after 9 loops)
      const loop10StartIndex = 9 * 3; // 9 complete loops * 3 notes
      const expectedLoop10Start = 9 * loopDuration;

      expect(noteTimes[loop10StartIndex]).toBeGreaterThanOrEqual(expectedLoop10Start);
      expect(noteTimes[loop10StartIndex]).toBeLessThanOrEqual(expectedLoop10Start + 10);
      expect(noteTimes[loop10StartIndex + 1]).toBeGreaterThanOrEqual(expectedLoop10Start + noteInterval);
      expect(noteTimes[loop10StartIndex + 1]).toBeLessThanOrEqual(expectedLoop10Start + noteInterval + 10);
      expect(noteTimes[loop10StartIndex + 2]).toBeGreaterThanOrEqual(expectedLoop10Start + noteInterval * 2);
      expect(noteTimes[loop10StartIndex + 2]).toBeLessThanOrEqual(expectedLoop10Start + noteInterval * 2 + 10);
    });

    it('should handle complex rhythms with rests accurately over multiple loops', () => {
      const notation = 'D-__T---'; // Eighth, eighth rest, quarter note
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // Notation 'D-__T---' parses to 3 notes:
      // 1. D- (eighth = 2 sixteenths = 250ms)
      // 2. __ (eighth rest = 2 sixteenths = 250ms) - callback fires but no sound
      // 3. T--- (quarter = 4 sixteenths = 500ms)
      // Total loop duration = 8 sixteenths = 1000ms

      // Loop 1
      vi.advanceTimersByTime(0);
      expect(noteTimes[0]).toBe(0); // D fires immediately

      vi.advanceTimersByTime(250); // Advance to rest
      expect(noteTimes[1]).toBe(250); // Rest callback fires (for visual highlighting)

      vi.advanceTimersByTime(250); // Advance to T
      expect(noteTimes[2]).toBe(500); // T fires

      // Complete loop 1 and start loop 2
      vi.advanceTimersByTime(500); // Complete T duration
      vi.advanceTimersByTime(1); // Trigger next loop scheduling
      expect(noteTimes[3]).toBeGreaterThanOrEqual(1000); // D in loop 2
      expect(noteTimes[3]).toBeLessThanOrEqual(1001);

      vi.advanceTimersByTime(250);
      expect(noteTimes[4]).toBeGreaterThanOrEqual(1250); // Rest in loop 2
      expect(noteTimes[4]).toBeLessThanOrEqual(1251);

      vi.advanceTimersByTime(250);
      expect(noteTimes[5]).toBeGreaterThanOrEqual(1500); // T in loop 2
      expect(noteTimes[5]).toBeLessThanOrEqual(1501);
    });
  });

  describe('stop functionality', () => {
    it('should clear all scheduled timeouts when stopped', () => {
      const notation = 'D-T-K-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      rhythmPlayer.play(parsedRhythm, 120, () => {
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

    it('should allow restarting after stop', () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      let noteCount = 0;
      rhythmPlayer.play(parsedRhythm, 120, () => {
        noteCount++;
      });

      vi.advanceTimersByTime(0); // First note fires immediately
      expect(noteCount).toBe(1);

      rhythmPlayer.stop();
      vi.advanceTimersByTime(1000);
      expect(noteCount).toBe(1); // No more notes

      // Restart
      noteCount = 0;
      rhythmPlayer.play(parsedRhythm, 120, () => {
        noteCount++;
      });

      vi.advanceTimersByTime(0); // First note fires immediately
      expect(noteCount).toBe(1); // Playing again
    });
  });

  describe('edge cases', () => {
    it('should handle very fast BPM (240 BPM)', () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 240;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 240 BPM:
      // - Quarter note = 60000 / 240 = 250ms
      // - Eighth note = 125ms

      vi.advanceTimersByTime(125);
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(125);
    });

    it('should handle very slow BPM (40 BPM)', () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 40;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      // At 40 BPM:
      // - Quarter note = 60000 / 40 = 1500ms
      // - Eighth note = 750ms

      vi.advanceTimersByTime(750);
      expect(noteTimes[0]).toBe(0);
      expect(noteTimes[1]).toBe(750);
    });

    it('should handle single note rhythm', () => {
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, 120, () => {
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
    it('should use the same performance.now() value for all notes in a loop', () => {
      const notation = 'D-T-K-__'; // Multiple notes
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      rhythmPlayer.play(parsedRhythm, 120, () => {
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
});

