// Re-export from shared module — piano-internal imports remain unchanged.
export {
  recordMidiNoteOn,
  recordMidiNoteOff,
  isNoteHeld,
  getMidiNoteOnTime,
  getAllMidiNoteOnTimes,
  getRecentMidiPresses,
  pruneStale,
  refreshHeldNotes,
  recordNoteExpectedTime,
  getNoteExpectedTime,
  clearExpectedTimes,
  clearAll,
} from '../../shared/practice/practiceTimingStore';
