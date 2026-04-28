/**
 * Practice debug logger — captures a detailed timeline of all mic/pitch/evaluation
 * events during a practice session. Activated by `?debug` or `?dev` URL params (see `readLabsDebugParams`).
 * The snapshot is designed to be sent for offline analysis.
 */

export type DebugEvent =
  | { type: 'pitch_raw'; t: number; midi: number | null; rms: number; freq?: number }
  | { type: 'note_on'; t: number; midi: number }
  | { type: 'note_off'; t: number; midi: number }
  | { type: 'expected_change'; t: number; expected: { noteId: string; pitches: number[]; hand: string; chordSymbol?: string }[] }
  | { type: 'eval_attempt'; t: number; noteId: string; played: number[]; expectedPitches: number[];
      pitchCorrect: boolean; timing: string; timingOffsetMs: number; useMic: boolean;
      midiTimesSnapshot: [number, number][]; expectedTime: number | null }
  | { type: 'grace_miss'; t: number; noteId: string; expectedPitches: number[]; passedAt: number }
  | { type: 'active_notes_change'; t: number; activeNotes: number[] }
  | { type: 'practice_start'; t: number; mode: string; tempo: number; scoreTitle: string;
      practiceRH: boolean; practiceLH: boolean; practiceVoice?: boolean; practiceChords?: boolean; micActive: boolean }
  | { type: 'practice_end'; t: number; resultCount: number };

interface DebugSnapshot {
  version: 1;
  capturedAt: string;
  userAgent: string;
  sampleRate: number | null;
  events: DebugEvent[];
  summary: {
    totalPitchDetections: number;
    uniqueMidiNoteOns: number;
    evalAttempts: number;
    graceMisses: number;
    durationMs: number;
  };
}

const MAX_EVENTS = 50_000;

let enabled = false;
let events: DebugEvent[] = [];
const sampleRate: number | null = null;
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

export function getEventCounts(): { pitch: number; noteOn: number; noteOff: number; eval: number; miss: number } {
  let pitch = 0, noteOn = 0, noteOff = 0, evalCount = 0, miss = 0;
  for (const e of events) {
    switch (e.type) {
      case 'pitch_raw': pitch++; break;
      case 'note_on': noteOn++; break;
      case 'note_off': noteOff++; break;
      case 'eval_attempt': evalCount++; break;
      case 'grace_miss': miss++; break;
    }
  }
  return { pitch, noteOn, noteOff, eval: evalCount, miss };
}

export function clearDebugLog(): void {
  events = [];
  startTime = performance.now();
}

export function buildSnapshot(): DebugSnapshot {
  const counts = getEventCounts();
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    sampleRate,
    events: [...events],
    summary: {
      totalPitchDetections: counts.pitch,
      uniqueMidiNoteOns: counts.noteOn,
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
  a.download = `practice-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
