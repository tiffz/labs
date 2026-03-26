/**
 * Shared timing store that bypasses React's state/effect pipeline entirely.
 * Both the MIDI input handler and the audio engine write timestamps here
 * directly at event time, and PracticeMode reads them for evaluation.
 * All times are in performance.now() milliseconds.
 *
 * Note-on times are retained after release so that evaluations running
 * slightly after the key-up can still see what was pressed. Stale entries
 * are pruned periodically.
 */

const midiNoteOnTimes = new Map<number, number>();
const heldNotes = new Set<number>();
const noteExpectedTimes = new Map<string, number>();

const STALE_MS = 3000;

export function recordMidiNoteOn(midiNote: number, timestamp: number) {
  midiNoteOnTimes.set(midiNote, timestamp);
  heldNotes.add(midiNote);
}

export function recordMidiNoteOff(midiNote: number) {
  heldNotes.delete(midiNote);
}

export function isNoteHeld(midiNote: number): boolean {
  return heldNotes.has(midiNote);
}

export function getMidiNoteOnTime(midiNote: number): number | undefined {
  return midiNoteOnTimes.get(midiNote);
}

export function getAllMidiNoteOnTimes(): ReadonlyMap<number, number> {
  return midiNoteOnTimes;
}

/**
 * Get all MIDI note-on times that were pressed within `windowMs` of now.
 * Returns both currently-held AND recently-released notes.
 */
export function getRecentMidiPresses(windowMs: number): number[] {
  const now = performance.now();
  const result: number[] = [];
  for (const [midi, time] of midiNoteOnTimes) {
    if (heldNotes.has(midi) || now - time <= windowMs) result.push(midi);
  }
  return result;
}

/**
 * Prune note-on timestamps older than STALE_MS for released notes.
 * Held notes are always kept.
 */
export function pruneStale() {
  const now = performance.now();
  for (const [midi, time] of midiNoteOnTimes) {
    if (!heldNotes.has(midi) && now - time > STALE_MS) {
      midiNoteOnTimes.delete(midi);
    }
  }
}

/**
 * Reset press timestamps for all currently-held MIDI keys to the given time.
 * Called at loop boundaries and practice start so that keys held across
 * a boundary are treated as if freshly pressed at the new loop's beat 0.
 */
export function refreshHeldNotes(timestamp: number) {
  for (const key of heldNotes) {
    midiNoteOnTimes.set(key, timestamp);
  }
}

export function recordNoteExpectedTime(noteId: string, wallTimeMs: number) {
  if (!noteExpectedTimes.has(noteId)) {
    noteExpectedTimes.set(noteId, wallTimeMs);
  }
}

export function getNoteExpectedTime(noteId: string): number | undefined {
  return noteExpectedTimes.get(noteId);
}

export function clearExpectedTimes() {
  noteExpectedTimes.clear();
}

export function clearAll() {
  midiNoteOnTimes.clear();
  heldNotes.clear();
  noteExpectedTimes.clear();
}
