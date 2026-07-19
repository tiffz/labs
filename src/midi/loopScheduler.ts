import type { PerformanceNote } from './types';

export type LoopScheduleCursor = {
  /** How many full loop passes have been fully scheduled. */
  iteration: number;
  /** Next note index (within the sorted note list) to schedule. */
  noteIndex: number;
};

export type DueLoopNote = {
  midi: number;
  velocity: number;
  /** Absolute performance.now()-based start timestamp. */
  targetPerfMs: number;
  durationMs: number;
};

/**
 * Look-ahead walk over a captured Midi loop: returns every note whose start
 * falls before `horizonPerfMs`, advancing the cursor across loop iterations.
 * Pure so the wrap/rate math is unit-testable without an AudioContext.
 */
export function collectDueLoopNotes(
  cursor: LoopScheduleCursor,
  notes: readonly PerformanceNote[],
  epochPerfMs: number,
  loopDurationMs: number,
  playbackRate: number,
  horizonPerfMs: number,
): DueLoopNote[] {
  if (notes.length === 0 || !(loopDurationMs > 0) || !(playbackRate > 0)) return [];

  const due: DueLoopNote[] = [];
  for (;;) {
    if (cursor.noteIndex >= notes.length) {
      cursor.iteration += 1;
      cursor.noteIndex = 0;
    }
    const note = notes[cursor.noteIndex];
    const targetPerfMs =
      epochPerfMs + cursor.iteration * loopDurationMs + note.startMs / playbackRate;
    if (targetPerfMs > horizonPerfMs) return due;
    due.push({
      midi: note.midi,
      velocity: note.velocity,
      targetPerfMs,
      durationMs: note.durationMs / playbackRate,
    });
    cursor.noteIndex += 1;
  }
}
