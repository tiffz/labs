import { describe, expect, it } from 'vitest';
import { collectDueLoopNotes, type LoopScheduleCursor } from './loopScheduler';
import type { PerformanceNote } from './types';

function note(midi: number, startMs: number, durationMs = 200): PerformanceNote {
  return { midi, startMs, durationMs, velocity: 0.8 };
}

describe('collectDueLoopNotes', () => {
  const notes = [note(60, 0), note(64, 500), note(67, 1000)];
  const loopDurationMs = 2000;

  it('returns only notes whose start falls before the horizon', () => {
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    const due = collectDueLoopNotes(cursor, notes, 1000, loopDurationMs, 1, 1600);
    expect(due.map((n) => n.midi)).toEqual([60, 64]);
    expect(due.map((n) => n.targetPerfMs)).toEqual([1000, 1500]);
    expect(cursor).toEqual({ iteration: 0, noteIndex: 2 });
  });

  it('resumes from the cursor without double-scheduling', () => {
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    collectDueLoopNotes(cursor, notes, 1000, loopDurationMs, 1, 1600);
    const due = collectDueLoopNotes(cursor, notes, 1000, loopDurationMs, 1, 2100);
    expect(due.map((n) => n.midi)).toEqual([67]);
    expect(due[0].targetPerfMs).toBe(2000);
  });

  it('wraps across loop iterations with exact grid times (no drift)', () => {
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    const due = collectDueLoopNotes(cursor, notes, 0, loopDurationMs, 1, 4600);
    // Two full passes plus the first note of the third.
    expect(due.map((n) => n.targetPerfMs)).toEqual([0, 500, 1000, 2000, 2500, 3000, 4000, 4500]);
    expect(cursor).toEqual({ iteration: 2, noteIndex: 2 });
  });

  it('scales note times and durations by playback rate', () => {
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    const due = collectDueLoopNotes(cursor, notes, 0, loopDurationMs / 2, 2, 1300);
    expect(due.map((n) => n.targetPerfMs)).toEqual([0, 250, 500, 1000, 1250]);
    expect(due[0].durationMs).toBe(100);
  });

  it('returns nothing for empty notes or a zero-length loop', () => {
    const cursor: LoopScheduleCursor = { iteration: 0, noteIndex: 0 };
    expect(collectDueLoopNotes(cursor, [], 0, loopDurationMs, 1, 5000)).toEqual([]);
    expect(collectDueLoopNotes(cursor, notes, 0, 0, 1, 5000)).toEqual([]);
  });
});
