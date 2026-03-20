import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordMidiNoteOn,
  recordMidiNoteOff,
  getMidiNoteOnTime,
  getAllMidiNoteOnTimes,
  refreshHeldNotes,
  recordNoteExpectedTime,
  getNoteExpectedTime,
  clearExpectedTimes,
  clearAll,
} from './practiceTimingStore';

describe('practiceTimingStore', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('MIDI note on/off', () => {
    it('records note-on time and clears it on note-off', () => {
      recordMidiNoteOn(60, 1000);
      expect(getMidiNoteOnTime(60)).toBe(1000);

      recordMidiNoteOn(60, 2000);
      expect(getMidiNoteOnTime(60)).toBe(2000);

      recordMidiNoteOff(60);
      expect(getMidiNoteOnTime(60)).toBeUndefined();
    });

    it('returns undefined for notes that were never recorded', () => {
      expect(getMidiNoteOnTime(42)).toBeUndefined();
    });
  });

  describe('getAllMidiNoteOnTimes', () => {
    it('returns all held note entries', () => {
      recordMidiNoteOn(60, 10);
      recordMidiNoteOn(64, 20);
      recordMidiNoteOn(67, 30);

      const all = getAllMidiNoteOnTimes();
      expect(all.size).toBe(3);
      expect(all.get(60)).toBe(10);
      expect(all.get(64)).toBe(20);
      expect(all.get(67)).toBe(30);
    });
  });

  describe('refreshHeldNotes', () => {
    it('updates every held key to the given timestamp', () => {
      recordMidiNoteOn(60, 100);
      recordMidiNoteOn(64, 200);
      refreshHeldNotes(999);

      expect(getMidiNoteOnTime(60)).toBe(999);
      expect(getMidiNoteOnTime(64)).toBe(999);
    });
  });

  describe('expected note times', () => {
    it('keeps only the first recorded time per note id', () => {
      recordNoteExpectedTime('n1', 50);
      recordNoteExpectedTime('n1', 999);
      expect(getNoteExpectedTime('n1')).toBe(50);
    });

    it('returns undefined for unknown note ids', () => {
      expect(getNoteExpectedTime('missing')).toBeUndefined();
    });
  });

  describe('clearExpectedTimes', () => {
    it('clears expected times but leaves MIDI note-on map intact', () => {
      recordMidiNoteOn(60, 123);
      recordNoteExpectedTime('a', 456);

      clearExpectedTimes();

      expect(getNoteExpectedTime('a')).toBeUndefined();
      expect(getMidiNoteOnTime(60)).toBe(123);
    });
  });

  describe('clearAll', () => {
    it('clears both MIDI and expected-time maps', () => {
      recordMidiNoteOn(60, 1);
      recordNoteExpectedTime('x', 2);

      clearAll();

      expect(getMidiNoteOnTime(60)).toBeUndefined();
      expect(getNoteExpectedTime('x')).toBeUndefined();
      expect(getAllMidiNoteOnTimes().size).toBe(0);
    });
  });
});
