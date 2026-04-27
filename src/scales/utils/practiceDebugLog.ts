/**
 * Scales practice debug logger — captures a detailed timeline of note/evaluation
 * events during a practice session, with input-source tracking (MIDI vs mic)
 * for side-by-side comparison. Activated by ?debug URL param.
 */

export type InputSource = 'midi' | 'mic';

export type DebugEvent =
  | { type: 'pitch_raw'; t: number; midi: number | null; rms: number; freq?: number }
  | { type: 'note_on'; t: number; midi: number; source: InputSource; rawTimestamp: number; compensatedTimestamp: number }
  | { type: 'note_off'; t: number; midi: number; source: InputSource }
  | { type: 'expected_change'; t: number; expected: { noteId: string; pitches: number[]; hand: string; partId: string; siblingAnchored?: boolean }[] }
  | { type: 'eval_attempt'; t: number; noteId: string; played: number[]; expectedPitches: number[];
      pitchCorrect: boolean; timing: string; timingOffsetMs: number;
      midiTimesSnapshot: [number, number][]; expectedTime: number | null;
      // Per-hand grading instrumentation. Populated only in both-hand
      // exercises; the values let us reconstruct exactly which anchoring
      // path produced a given pass/fail decision so we can diagnose
      // wrong-pitch false positives without rebuilding the whole pipeline.
      hand?: string;
      partId?: string;
      cachedOffset?: number | null;
      derivedOffset?: number | null;
      anchorRejected?: boolean;
      rhReferenceLow?: number | null;
      siblingFallbackUsed?: boolean;
      siblingAnchored?: boolean }
  | { type: 'grace_miss'; t: number; noteId: string; expectedPitches: number[]; passedAt: number }
  | { type: 'active_notes_change'; t: number; activeNotes: number[] }
  | { type: 'practice_start'; t: number; mode: string; bpm: number; exerciseId: string;
      hand: string; micActive: boolean; midiActive: boolean }
  | { type: 'practice_end'; t: number; resultCount: number; accuracy: number };

interface DebugSnapshot {
  version: 2;
  app: 'scales';
  capturedAt: string;
  userAgent: string;
  sampleRate: number | null;
  events: DebugEvent[];
  summary: {
    totalPitchDetections: number;
    midiNoteOns: number;
    micNoteOns: number;
    evalAttempts: number;
    graceMisses: number;
    durationMs: number;
  };
}

const MAX_EVENTS = 50_000;

let enabled = false;
let events: DebugEvent[] = [];
let startTime = 0;

export function isDebugEnabled(): boolean {
  return enabled;
}

export function enableDebug(): void {
  enabled = true;
  events = [];
  startTime = performance.now();
}

export function logDebugEvent(event: DebugEvent): void {
  if (!enabled) return;
  if (events.length >= MAX_EVENTS) {
    events.splice(0, 5000);
  }
  events.push(event);
}

export function getRecentEvents(count: number): DebugEvent[] {
  return events.slice(-count);
}

export function getEventCounts() {
  let pitch = 0, midiOn = 0, micOn = 0, noteOff = 0, evalCount = 0, miss = 0;
  for (const e of events) {
    switch (e.type) {
      case 'pitch_raw': pitch++; break;
      case 'note_on': if (e.source === 'midi') midiOn++; else micOn++; break;
      case 'note_off': noteOff++; break;
      case 'eval_attempt': evalCount++; break;
      case 'grace_miss': miss++; break;
    }
  }
  return { pitch, midiOn, micOn, noteOff, eval: evalCount, miss };
}

export function clearDebugLog(): void {
  events = [];
  startTime = performance.now();
}

export function buildSnapshot(): DebugSnapshot {
  const counts = getEventCounts();
  return {
    version: 2,
    app: 'scales',
    capturedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sampleRate: null,
    events: [...events],
    summary: {
      totalPitchDetections: counts.pitch,
      midiNoteOns: counts.midiOn,
      micNoteOns: counts.micOn,
      evalAttempts: counts.eval,
      graceMisses: counts.miss,
      durationMs: performance.now() - startTime,
    },
  };
}

export function downloadSnapshot(): void {
  const snapshot = buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scales-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
