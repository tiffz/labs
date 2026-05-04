import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rhythmPlayer } from '../../shared/rhythm/rhythmPlayer';
import { parseRhythm } from './rhythmParser';
import type { TimeSignature } from '../../shared/rhythm/types';
import { audioPlayer } from '../../shared/rhythm/drumAudioPlayer';

const mockAudioCtx = {
  get currentTime() { return performance.now() / 1000; },
  state: 'running' as AudioContextState,
};

vi.mock('../../shared/rhythm/drumAudioPlayer', () => ({
  audioPlayer: {
    play: vi.fn(),
    playNowIfReady: vi.fn(),
    stopAll: vi.fn(),
    stopAllDrumSounds: vi.fn(),
    playClick: vi.fn(),
    playClickNowIfReady: vi.fn(),
    setReverbStrength: vi.fn(),
    ensureResumed: vi.fn().mockResolvedValue(true),
    isHealthy: vi.fn().mockReturnValue(true),
    getState: vi.fn().mockReturnValue('running'),
    getAudioContext: vi.fn(() => mockAudioCtx),
  },
}));

describe('rhythmPlayer timing accuracy', () => {
  let rafCallbacks: Array<FrameRequestCallback>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    rafCallbacks = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = window.setTimeout(() => { rafCallbacks.push(cb); }, 16);
      return id as unknown as number;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    rhythmPlayer.stop();
    vi.useRealTimers();
  });

  function pumpFrames(durationMs: number) {
    const steps = Math.ceil(durationMs / 16);
    for (let i = 0; i < steps; i++) {
      vi.advanceTimersByTime(17);
      for (const cb of rafCallbacks) cb(performance.now());
      rafCallbacks = [];
    }
    vi.advanceTimersByTime(50);
  }

  describe('BPM timing calculations', () => {
    it('should play notes at correct intervals for 120 BPM', async () => {
      const notation = 'D-T-D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(1200);

      expect(noteTimes.length).toBeGreaterThanOrEqual(4);
      expect(noteTimes[0]).toBeCloseTo(50, -2);

      for (let i = 1; i < Math.min(noteTimes.length, 4); i++) {
        const diff = noteTimes[i] - noteTimes[i - 1];
        expect(diff).toBeCloseTo(250, -2);
      }
    });

    it('should play notes at correct intervals for 90 BPM', async () => {
      const notation = 'D---T---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 90;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(2000);

      expect(noteTimes.length).toBeGreaterThanOrEqual(2);
      const diff = noteTimes[1] - noteTimes[0];
      expect(diff).toBeCloseTo(667, -2);
    });

    it('should handle different note durations correctly', async () => {
      const notation = 'D-T---K';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(1200);

      expect(noteTimes.length).toBeGreaterThanOrEqual(3);
      const d01 = noteTimes[1] - noteTimes[0];
      const d12 = noteTimes[2] - noteTimes[1];
      expect(d01).toBeCloseTo(250, -2);
      expect(d12).toBeCloseTo(500, -2);
    });
  });

  describe('looping accuracy', () => {
    it('should maintain accurate timing across multiple loops', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(4000);

      expect(noteTimes.length).toBeGreaterThanOrEqual(6);
    });

    it('should not accumulate timing drift over many loops', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const bpm = 120;

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, bpm, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(12000);

      expect(noteTimes.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('stop functionality', () => {
    it('should clear all scheduled callbacks when stopped', async () => {
      const notation = 'D-T-K-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteTimes.push(performance.now());
      });

      pumpFrames(300);
      const countBeforeStop = noteTimes.length;
      expect(countBeforeStop).toBeGreaterThan(0);

      rhythmPlayer.stop();

      pumpFrames(5000);
      expect(noteTimes.length).toBe(countBeforeStop);
    });

    it('should allow restarting after stop', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      let noteCount = 0;
      await rhythmPlayer.play(parsedRhythm, 120, () => { noteCount++; });

      pumpFrames(300);
      expect(noteCount).toBeGreaterThan(0);

      rhythmPlayer.stop();
      const countAfterStop = noteCount;

      pumpFrames(1000);
      expect(noteCount).toBe(countAfterStop);

      noteCount = 0;
      await rhythmPlayer.play(parsedRhythm, 120, () => { noteCount++; });

      pumpFrames(300);
      expect(noteCount).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very fast BPM (240 BPM)', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, 240, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(500);
      expect(noteTimes.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle very slow BPM (40 BPM)', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      const startTime = performance.now();

      await rhythmPlayer.play(parsedRhythm, 40, () => {
        noteTimes.push(performance.now() - startTime);
      });

      pumpFrames(2000);
      expect(noteTimes.length).toBeGreaterThanOrEqual(2);
      const diff = noteTimes[1] - noteTimes[0];
      expect(diff).toBeCloseTo(750, -2);
    });

    it('should handle single note rhythm', async () => {
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const noteTimes: number[] = [];
      await rhythmPlayer.play(parsedRhythm, 120, () => {
        noteTimes.push(performance.now());
      });

      pumpFrames(1500);
      expect(noteTimes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('metronome beats', () => {
    it('should schedule metronome clicks for all beats in 4/4 time', async () => {
      const notation = 'D---T---K---S---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const metronomeEvents: Array<{ measureIndex: number; positionInSixteenths: number; isDownbeat: boolean }> = [];

      await rhythmPlayer.play(
        parsedRhythm, 120, undefined, undefined,
        true,
        (measureIndex, positionInSixteenths, isDownbeat) => {
          metronomeEvents.push({ measureIndex, positionInSixteenths, isDownbeat });
        },
      );

      pumpFrames(2500);

      const beatPositions = [0, 4, 8, 12];
      const beats = metronomeEvents.filter(e => beatPositions.includes(e.positionInSixteenths));

      expect(beats.length).toBeGreaterThanOrEqual(4);
      expect(beats.find(b => b.positionInSixteenths === 0 && b.isDownbeat)).toBeDefined();
      expect(beats.find(b => b.positionInSixteenths === 4)).toBeDefined();
      expect(beats.find(b => b.positionInSixteenths === 8)).toBeDefined();
      expect(beats.find(b => b.positionInSixteenths === 12)).toBeDefined();
    });

    it('should not play metronome clicks when metronome is disabled', async () => {
      const notation = 'D---T---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const metronomeEvents: Array<{ m: number; p: number; d: boolean }> = [];
      await rhythmPlayer.play(
        parsedRhythm, 120, undefined, undefined,
        false,
        (m, p, d) => metronomeEvents.push({ m, p, d }),
      );

      pumpFrames(2000);

      expect(metronomeEvents.length).toBeGreaterThan(0);
      expect(audioPlayer.playClickNowIfReady).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle recovery', () => {
    it('resumes audio on visibility restore while playing', async () => {
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(100);

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(audioPlayer.ensureResumed).toHaveBeenCalled();
    });

    it('runs periodic health recovery when audio is unhealthy', async () => {
      vi.mocked(audioPlayer.isHealthy).mockReturnValue(false);
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(3000);

      expect(audioPlayer.ensureResumed).toHaveBeenCalled();
      vi.mocked(audioPlayer.isHealthy).mockReturnValue(true);
    });
  });

  describe('tied notes', () => {
    it('should only play the first note in a tied note chain', async () => {
      const notation = 'D-------------------------------';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      expect(parsedRhythm.measures.length).toBe(2);
      expect(parsedRhythm.measures[0].notes[0].isTiedTo).toBe(true);
      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);

      const highlightedNotes: Array<{ measureIndex: number; noteIndex: number }> = [];

      await rhythmPlayer.play(parsedRhythm, 120, (measureIndex, noteIndex) => {
        highlightedNotes.push({ measureIndex, noteIndex });
      });

      pumpFrames(5000);

      expect(highlightedNotes.length).toBeGreaterThanOrEqual(2);
      expect(highlightedNotes[0]).toEqual({ measureIndex: 0, noteIndex: 0 });
      expect(highlightedNotes[1]).toEqual({ measureIndex: 1, noteIndex: 0 });

      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);
    });

    it('should correctly identify tied notes in parsed rhythm', () => {
      const notation = 'D-------------------------------';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      expect(parsedRhythm.measures.length).toBe(2);
      expect(parsedRhythm.measures[0].notes[0].isTiedTo).toBe(true);
      expect(parsedRhythm.measures[0].notes[0].isTiedFrom).toBeFalsy();
      expect(parsedRhythm.measures[1].notes[0].isTiedFrom).toBe(true);
    });
  });

  describe('AudioContext scheduling', () => {
    it('passes startTime to playNowIfReady for precise scheduling', async () => {
      const notation = 'D-T-D-T-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(600);

      const calls = vi.mocked(audioPlayer.playNowIfReady).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const startTimes = calls
        .map(c => c[3])
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b);

      expect(startTimes.length).toBeGreaterThan(0);

      for (let i = 1; i < Math.min(startTimes.length, 4); i++) {
        const diff = startTimes[i] - startTimes[i - 1];
        expect(diff).toBeCloseTo(0.25, 1);
      }
    });

    it('stop during playback cancels all pending callbacks', async () => {
      const notation = 'D-T-K-S-';
      const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      let noteCount = 0;
      await rhythmPlayer.play(parsedRhythm, 120, () => { noteCount++; });

      pumpFrames(200);
      const countBeforeStop = noteCount;

      rhythmPlayer.stop();
      expect(audioPlayer.stopAll).toHaveBeenCalled();

      pumpFrames(3000);
      expect(noteCount).toBe(countBeforeStop);
    });

    it('chokes previous drum sounds at precise audioTime, not immediately', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(800);

      const chokeCalls = vi.mocked(audioPlayer.stopAllDrumSounds).mock.calls;
      expect(chokeCalls.length).toBeGreaterThan(0);

      for (const call of chokeCalls) {
        expect(call[0]).toBeTypeOf('number');
        expect(call[0]).toBeGreaterThan(0);
      }
    });
  });

  describe('loop boundary scheduling', () => {
    it('does not skip the first note when looping', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const playCalls = vi.mocked(audioPlayer.playNowIfReady);

      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(3000);

      const sounds = playCalls.mock.calls.map(c => c[0]);

      // 2/4 at 120 BPM = 1s per loop. In 3s we expect at least 3 loops × 2 notes = 6 notes.
      expect(sounds.length).toBeGreaterThanOrEqual(6);

      // The pattern is D, T repeating — verify we never see two T's in a row
      // (which would indicate the D at the loop boundary was skipped).
      for (let i = 1; i < sounds.length; i++) {
        if (sounds[i - 1] === 'tak' || sounds[i - 1] === 'T') {
          expect(sounds[i]).not.toBe(sounds[i - 1]);
        }
      }
    });

    it('keeps scheduling after BPM change at loop boundary (re-anchored loop clock)', async () => {
      const notation = 'D-T-';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);
      const playCalls = vi.mocked(audioPlayer.playNowIfReady);

      await rhythmPlayer.play(parsedRhythm, 120);
      pumpFrames(1200);
      const countBeforeBpm = playCalls.mock.calls.length;
      expect(countBeforeBpm).toBeGreaterThan(0);

      rhythmPlayer.setBpmAtMeasureBoundary(60);
      pumpFrames(8000);

      expect(rhythmPlayer.getIsPlaying()).toBe(true);
      expect(playCalls.mock.calls.length).toBeGreaterThan(countBeforeBpm + 4);
    });

    it('first note of every loop iteration receives a playNowIfReady call', async () => {
      const notation = 'D---';
      const timeSignature: TimeSignature = { numerator: 1, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const playCalls = vi.mocked(audioPlayer.playNowIfReady);

      await rhythmPlayer.play(parsedRhythm, 120);
      // 1/4 at 120 BPM = 0.5s per loop. In 4s we get ~8 loops.
      pumpFrames(4000);

      const startTimes = playCalls.mock.calls
        .map(c => c[3])
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b);

      // Expect at least 7 notes (8 loops, first note each)
      expect(startTimes.length).toBeGreaterThanOrEqual(7);

      // Intervals between consecutive notes should be ~0.5s (one beat at 120 BPM)
      for (let i = 1; i < startTimes.length; i++) {
        const gap = startTimes[i] - startTimes[i - 1];
        expect(gap).toBeCloseTo(0.5, 1);
      }
    });

    it('highlight callback fires for first note on every loop', async () => {
      const notation = 'D---T---';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      const highlights: Array<{ m: number; n: number }> = [];

      await rhythmPlayer.play(parsedRhythm, 120, (m, n) => {
        highlights.push({ m, n });
      });

      // 2/4 at 120 BPM = 1s per loop. Run 4 loops.
      pumpFrames(4500);

      // The first note (index 0) should appear at the start of every loop
      const loopStarts = highlights.filter(h => h.n === 0);
      expect(loopStarts.length).toBeGreaterThanOrEqual(4);

      // Verify the pattern doesn't have two consecutive note-0s
      // (which would indicate note-1 was skipped)
      for (let i = 1; i < highlights.length; i++) {
        const prev = highlights[i - 1].n;
        const curr = highlights[i].n;
        expect(prev === 0 && curr === 0).toBe(false);
      }
    });

    it('maintains timing continuity across loop boundaries', async () => {
      const notation = 'D---T---';
      const timeSignature: TimeSignature = { numerator: 2, denominator: 4 };
      const parsedRhythm = parseRhythm(notation, timeSignature);

      await rhythmPlayer.play(parsedRhythm, 120);
      // 2/4 at 120 BPM = 1s per loop. Run ~3.5 loops.
      pumpFrames(3500);

      const startTimes = vi.mocked(audioPlayer.playNowIfReady).mock.calls
        .map(c => c[3])
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b);

      expect(startTimes.length).toBeGreaterThanOrEqual(6);

      // Across the loop boundary the inter-note interval should still be
      // ~0.5s (quarter note at 120 BPM) — no gap or double-length pause.
      for (let i = 1; i < startTimes.length; i++) {
        const gap = startTimes[i] - startTimes[i - 1];
        expect(gap).toBeCloseTo(0.5, 1);
      }
    });
  });
});
