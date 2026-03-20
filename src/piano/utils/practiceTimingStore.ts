/**
 * Shared timing store that bypasses React's state/effect pipeline entirely.
 * Both the MIDI input handler and the audio engine write timestamps here
 * directly at event time, and PracticeMode reads them for evaluation.
 * All times are in performance.now() milliseconds.
 */

const midiNoteOnTimes = new Map<number, number>();
const noteExpectedTimes = new Map<string, number>();

export function recordMidiNoteOn(midiNote: number, timestamp: number) {
  midiNoteOnTimes.set(midiNote, timestamp);
}

export function recordMidiNoteOff(midiNote: number) {
  midiNoteOnTimes.delete(midiNote);
}

export function getMidiNoteOnTime(midiNote: number): number | undefined {
  return midiNoteOnTimes.get(midiNote);
}

export function getAllMidiNoteOnTimes(): ReadonlyMap<number, number> {
  return midiNoteOnTimes;
}

/**
 * Reset press timestamps for all currently-held MIDI keys to the given time.
 * Called at loop boundaries and practice start so that keys held across
 * a boundary are treated as if freshly pressed at the new loop's beat 0.
 */
export function refreshHeldNotes(timestamp: number) {
  for (const key of midiNoteOnTimes.keys()) {
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
  noteExpectedTimes.clear();
}
