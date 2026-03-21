import { describe, it, expect, vi } from 'vitest';

vi.mock('./utils/scorePlayback', () => ({
  ScorePlaybackEngine: vi.fn(),
  getScorePlaybackEngine: vi.fn(() => ({})),
}));
vi.mock('./utils/midiInput', () => ({
  MidiInput: vi.fn(),
  getMidiInput: vi.fn(() => ({ onNote: vi.fn(), onConnection: vi.fn(), init: vi.fn() })),
}));
vi.mock('./utils/practiceTimingStore', () => ({
  recordMidiNoteOn: vi.fn(),
  recordMidiNoteOff: vi.fn(),
  clearAll: vi.fn(),
}));
vi.mock('./data/scales', () => ({
  DEFAULT_SCORE: {
    id: 'default', title: 'Default', key: 'C',
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 80,
    parts: [
      { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: [{ notes: [] }] },
      { id: 'lh', name: 'Left Hand', clef: 'bass', hand: 'left', measures: [{ notes: [] }] },
    ],
  },
}));
vi.mock('../drums/assets/sounds/click.mp3', () => ({ default: '' }));

import { reducer, initialState } from './store';
import type { PianoScore, PracticeNoteResult } from './types';

const minimalScore: PianoScore = {
  id: 'test', title: 'Test', key: 'C' as const,
  timeSignature: { numerator: 4, denominator: 4 },
  tempo: 120,
  parts: [
    { id: 'rh', name: 'Right Hand', clef: 'treble' as const, hand: 'right' as const, measures: [{ notes: [] }] },
    { id: 'lh', name: 'Left Hand', clef: 'bass' as const, hand: 'left' as const, measures: [{ notes: [] }] },
  ],
};

function stateWith(overrides: Record<string, unknown> = {}) {
  return { ...initialState, ...overrides };
}

describe('piano store reducer', () => {
  describe('SET_SCORE', () => {
    it('sets the score and resets position/results', () => {
      const state = stateWith({ tempo: 60, currentMeasureIndex: 3 });
      const next = reducer(state, { type: 'SET_SCORE', score: minimalScore });
      expect(next.score).toBe(minimalScore);
      expect(next.tempo).toBe(120);
      expect(next.currentMeasureIndex).toBe(0);
      expect(next.currentNoteIndices.size).toBe(0);
      expect(next.practiceResults).toEqual([]);
      expect(next.practiceResultsByNoteId.size).toBe(0);
    });
  });

  describe('SET_TEMPO', () => {
    it('updates the tempo', () => {
      const next = reducer(initialState, { type: 'SET_TEMPO', tempo: 140 });
      expect(next.tempo).toBe(140);
    });
  });

  describe('SET_METRONOME', () => {
    it('toggles metronome on', () => {
      const state = stateWith({ metronomeEnabled: false });
      const next = reducer(state, { type: 'SET_METRONOME', enabled: true });
      expect(next.metronomeEnabled).toBe(true);
    });

    it('toggles metronome off', () => {
      const next = reducer(initialState, { type: 'SET_METRONOME', enabled: false });
      expect(next.metronomeEnabled).toBe(false);
    });
  });

  describe('SET_LOOPING', () => {
    it('toggles looping', () => {
      const next = reducer(initialState, { type: 'SET_LOOPING', enabled: false });
      expect(next.loopingEnabled).toBe(false);
    });
  });

  describe('ADD_MIDI_NOTE / REMOVE_MIDI_NOTE', () => {
    it('adds a midi note to active set', () => {
      const next = reducer(initialState, { type: 'ADD_MIDI_NOTE', note: 60 });
      expect(next.activeMidiNotes.has(60)).toBe(true);
    });

    it('removes a midi note from active set', () => {
      const state = stateWith({ activeMidiNotes: new Set([60, 64]) });
      const next = reducer(state, { type: 'REMOVE_MIDI_NOTE', note: 60 });
      expect(next.activeMidiNotes.has(60)).toBe(false);
      expect(next.activeMidiNotes.has(64)).toBe(true);
    });
  });

  describe('SET_TRACK_MUTED / SET_TRACK_VOLUME', () => {
    it('mutes a track', () => {
      const next = reducer(initialState, { type: 'SET_TRACK_MUTED', partId: 'rh', muted: true });
      expect(next.trackMuted.get('rh')).toBe(true);
    });

    it('sets track volume', () => {
      const next = reducer(initialState, { type: 'SET_TRACK_VOLUME', partId: 'lh', volume: 0.5 });
      expect(next.trackVolume.get('lh')).toBe(0.5);
    });
  });

  describe('ADD_PRACTICE_RESULT', () => {
    it('adds result to array and map', () => {
      const result: PracticeNoteResult = {
        noteId: 'n-1', expectedPitches: [60], playedPitches: [60],
        timingOffsetMs: 10, pitchCorrect: true, timing: 'perfect',
      };
      const next = reducer(initialState, { type: 'ADD_PRACTICE_RESULT', result });
      expect(next.practiceResults).toHaveLength(1);
      expect(next.practiceResults[0]).toBe(result);
      expect(next.practiceResultsByNoteId.get('n-1')).toBe(result);
    });
  });

  describe('STEP_INPUT_NOTE', () => {
    it('does nothing when not in step-input mode', () => {
      const state = stateWith({ score: minimalScore, inputMode: 'select' as const });
      const next = reducer(state, { type: 'STEP_INPUT_NOTE', midi: 60 });
      expect(next).toBe(state);
    });

    it('adds note to rh part when midi >= 60', () => {
      const state = stateWith({ score: minimalScore, inputMode: 'step-input' as const });
      const next = reducer(state, { type: 'STEP_INPUT_NOTE', midi: 64 });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      expect(rh.measures[0].notes).toHaveLength(1);
      expect(rh.measures[0].notes[0].pitches).toEqual([64]);
    });

    it('adds note to lh part when midi < 60', () => {
      const state = stateWith({ score: minimalScore, inputMode: 'step-input' as const });
      const next = reducer(state, { type: 'STEP_INPUT_NOTE', midi: 48 });
      const lh = next.score!.parts.find(p => p.id === 'lh')!;
      expect(lh.measures[0].notes).toHaveLength(1);
      expect(lh.measures[0].notes[0].pitches).toEqual([48]);
    });

    it('pushes previous score to undoStack and clears redoStack', () => {
      const state = stateWith({
        score: minimalScore, inputMode: 'step-input' as const,
        redoStack: [minimalScore],
      });
      const next = reducer(state, { type: 'STEP_INPUT_NOTE', midi: 60 });
      expect(next.undoStack).toHaveLength(1);
      expect(next.undoStack[0]).toBe(minimalScore);
      expect(next.redoStack).toEqual([]);
    });

    it('creates a new measure when current measure is full', () => {
      const fullMeasureScore: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p =>
          p.id === 'rh'
            ? {
                ...p, measures: [{
                  notes: [
                    { id: 'a', pitches: [60], duration: 'quarter' as const },
                    { id: 'b', pitches: [62], duration: 'quarter' as const },
                    { id: 'c', pitches: [64], duration: 'quarter' as const },
                    { id: 'd', pitches: [65], duration: 'quarter' as const },
                  ],
                }],
              }
            : p,
        ),
      };
      const state = stateWith({ score: fullMeasureScore, inputMode: 'step-input' as const });
      const next = reducer(state, { type: 'STEP_INPUT_NOTE', midi: 67 });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      expect(rh.measures).toHaveLength(2);
      expect(rh.measures[1].notes).toHaveLength(1);
      expect(rh.measures[1].notes[0].pitches).toEqual([67]);
    });
  });

  describe('STEP_INPUT_REST', () => {
    it('adds rest to rh part', () => {
      const state = stateWith({ score: minimalScore, inputMode: 'step-input' as const });
      const next = reducer(state, { type: 'STEP_INPUT_REST' });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      expect(rh.measures[0].notes).toHaveLength(1);
      expect(rh.measures[0].notes[0].rest).toBe(true);
      expect(rh.measures[0].notes[0].pitches).toEqual([]);
    });
  });

  describe('STEP_INPUT_CHORD', () => {
    it('splits notes between treble and bass parts', () => {
      const state = stateWith({ score: minimalScore, inputMode: 'step-input' as const });
      const next = reducer(state, { type: 'STEP_INPUT_CHORD', midis: [48, 55, 60, 67] });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      const lh = next.score!.parts.find(p => p.id === 'lh')!;
      expect(rh.measures[0].notes).toHaveLength(1);
      expect(rh.measures[0].notes[0].pitches).toEqual([60, 67]);
      expect(lh.measures[0].notes).toHaveLength(1);
      expect(lh.measures[0].notes[0].pitches).toEqual([48, 55]);
    });
  });

  describe('DELETE_LAST_NOTE', () => {
    it('removes last note from last non-empty part', () => {
      const scoreWithNotes: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p =>
          p.id === 'rh'
            ? { ...p, measures: [{ notes: [
                { id: 'a', pitches: [60], duration: 'quarter' as const },
                { id: 'b', pitches: [62], duration: 'quarter' as const },
              ] }] }
            : p,
        ),
      };
      const state = stateWith({ score: scoreWithNotes });
      const next = reducer(state, { type: 'DELETE_LAST_NOTE' });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      expect(rh.measures[0].notes).toHaveLength(1);
      expect(rh.measures[0].notes[0].id).toBe('a');
    });

    it('cleans up empty measures by removing them', () => {
      const scoreWithTwoMeasures: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p =>
          p.id === 'rh'
            ? { ...p, measures: [
                { notes: [{ id: 'a', pitches: [60], duration: 'quarter' as const }] },
                { notes: [{ id: 'b', pitches: [62], duration: 'quarter' as const }] },
              ] }
            : p,
        ),
      };
      const state = stateWith({ score: scoreWithTwoMeasures });
      const next = reducer(state, { type: 'DELETE_LAST_NOTE' });
      const rh = next.score!.parts.find(p => p.id === 'rh')!;
      expect(rh.measures).toHaveLength(1);
    });
  });

  describe('CLEAR_ALL_NOTES', () => {
    it('empties all measures in all parts', () => {
      const scoreWithNotes: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p => ({
          ...p, measures: [{ notes: [{ id: 'x', pitches: [60], duration: 'quarter' as const }] }],
        })),
      };
      const state = stateWith({ score: scoreWithNotes });
      const next = reducer(state, { type: 'CLEAR_ALL_NOTES' });
      for (const part of next.score!.parts) {
        expect(part.measures).toHaveLength(1);
        expect(part.measures[0].notes).toEqual([]);
      }
    });
  });

  describe('UNDO', () => {
    it('pops from undoStack, pushes current score to redoStack', () => {
      const oldScore = { ...minimalScore, id: 'old' };
      const currentScore = { ...minimalScore, id: 'current' };
      const state = stateWith({
        score: currentScore,
        undoStack: [oldScore],
        redoStack: [],
      });
      const next = reducer(state, { type: 'UNDO' });
      expect(next.score!.id).toBe('old');
      expect(next.undoStack).toHaveLength(0);
      expect(next.redoStack).toHaveLength(1);
      expect(next.redoStack[0].id).toBe('current');
    });

    it('does nothing when undoStack is empty', () => {
      const state = stateWith({ score: minimalScore, undoStack: [] });
      const next = reducer(state, { type: 'UNDO' });
      expect(next).toBe(state);
    });
  });

  describe('REDO', () => {
    it('pops from redoStack, pushes current score to undoStack', () => {
      const currentScore = { ...minimalScore, id: 'current' };
      const futureScore = { ...minimalScore, id: 'future' };
      const state = stateWith({
        score: currentScore,
        undoStack: [],
        redoStack: [futureScore],
      });
      const next = reducer(state, { type: 'REDO' });
      expect(next.score!.id).toBe('future');
      expect(next.redoStack).toHaveLength(0);
      expect(next.undoStack).toHaveLength(1);
      expect(next.undoStack[0].id).toBe('current');
    });

    it('does nothing when redoStack is empty', () => {
      const state = stateWith({ score: minimalScore, redoStack: [] });
      const next = reducer(state, { type: 'REDO' });
      expect(next).toBe(state);
    });
  });

  describe('START_PRACTICE_RUN', () => {
    it('clears results and sets currentRunStartTime', () => {
      const result: PracticeNoteResult = {
        noteId: 'n-1', expectedPitches: [60], playedPitches: [60],
        timingOffsetMs: 0, pitchCorrect: true, timing: 'perfect',
      };
      const state = stateWith({
        practiceResults: [result],
        practiceResultsByNoteId: new Map([['n-1', result]]),
        viewingRunIndex: 2,
      });
      const before = Date.now();
      const next = reducer(state, { type: 'START_PRACTICE_RUN' });
      expect(next.practiceResults).toEqual([]);
      expect(next.practiceResultsByNoteId.size).toBe(0);
      expect(next.currentRunStartTime).toBeGreaterThanOrEqual(before);
      expect(next.freeTempoNoteIndex).toBe(0);
      expect(next.freeTempoMeasureIndex).toBe(0);
      expect(next.viewingRunIndex).toBeNull();
    });
  });

  describe('END_PRACTICE_RUN', () => {
    it('creates a PracticeRun with correct accuracy and appends to session', () => {
      const perfectResult: PracticeNoteResult = {
        noteId: 'n-1', expectedPitches: [60], playedPitches: [60],
        timingOffsetMs: 5, pitchCorrect: true, timing: 'perfect',
      };
      const missedResult: PracticeNoteResult = {
        noteId: 'n-2', expectedPitches: [62], playedPitches: [],
        timingOffsetMs: 0, pitchCorrect: false, timing: 'missed',
      };
      const earlyButCorrectPitch: PracticeNoteResult = {
        noteId: 'n-3', expectedPitches: [64], playedPitches: [64],
        timingOffsetMs: -80, pitchCorrect: true, timing: 'early',
      };
      const state = stateWith({
        practiceResults: [perfectResult, missedResult, earlyButCorrectPitch],
        practiceResultsByNoteId: new Map([
          ['n-1', perfectResult], ['n-2', missedResult], ['n-3', earlyButCorrectPitch],
        ]),
        currentRunStartTime: 1000,
        practiceSession: { scoreId: 'test', runs: [] },
      });
      const next = reducer(state, { type: 'END_PRACTICE_RUN' });
      expect(next.practiceSession!.runs).toHaveLength(1);
      const run = next.practiceSession!.runs[0];
      expect(run.accuracy).toBe(33); // 1 perfect+correct out of 3
      expect(run.results).toHaveLength(3);
      expect(run.startTime).toBe(1000);
      expect(next.currentRunStartTime).toBeNull();
    });

    it('returns state unchanged when no run is active', () => {
      const state = stateWith({ currentRunStartTime: null, practiceSession: null });
      const next = reducer(state, { type: 'END_PRACTICE_RUN' });
      expect(next).toBe(state);
    });
  });

  describe('CANCEL_PRACTICE_RUN', () => {
    it('clears current run without appending to practice session', () => {
      const result: PracticeNoteResult = {
        noteId: 'n-1', expectedPitches: [60], playedPitches: [60],
        timingOffsetMs: 12, pitchCorrect: true, timing: 'perfect',
      };
      const state = stateWith({
        currentRunStartTime: 1234,
        practiceResults: [result],
        practiceResultsByNoteId: new Map([['n-1', result]]),
        practiceSession: { scoreId: 'test', runs: [] },
      });
      const next = reducer(state, { type: 'CANCEL_PRACTICE_RUN' });
      expect(next.currentRunStartTime).toBeNull();
      expect(next.practiceResults).toEqual([]);
      expect(next.practiceResultsByNoteId.size).toBe(0);
      expect(next.practiceSession?.runs).toHaveLength(0);
    });
  });

  describe('SET_MIDI_SOUND_VOLUME', () => {
    it('updates keypress MIDI sound volume', () => {
      const next = reducer(initialState, { type: 'SET_MIDI_SOUND_VOLUME', volume: 0.35 });
      expect(next.midiSoundVolume).toBe(0.35);
    });
  });

  describe('ADVANCE_FREE_TEMPO', () => {
    it('advances to the next non-rest note', () => {
      const scoreWithRest: PianoScore = {
        ...minimalScore,
        parts: [
          {
            id: 'rh', name: 'Right Hand', clef: 'treble' as const, hand: 'right' as const,
            measures: [{
              notes: [
                { id: 'a', pitches: [60], duration: 'quarter' as const },
                { id: 'b', pitches: [], duration: 'quarter' as const, rest: true },
                { id: 'c', pitches: [64], duration: 'quarter' as const },
              ],
            }],
          },
          { id: 'lh', name: 'Left Hand', clef: 'bass' as const, hand: 'left' as const, measures: [{ notes: [] }] },
        ],
      };
      const state = stateWith({
        score: scoreWithRest,
        freeTempoMeasureIndex: 0, freeTempoNoteIndex: 0,
        practiceRightHand: true, practiceLeftHand: true,
      });
      const next = reducer(state, { type: 'ADVANCE_FREE_TEMPO' });
      expect(next.freeTempoNoteIndex).toBe(2);
      expect(next.freeTempoMeasureIndex).toBe(0);
    });

    it('returns noteIndex -1 when no more notes', () => {
      const scoreOneNote: PianoScore = {
        ...minimalScore,
        parts: [
          {
            id: 'rh', name: 'Right Hand', clef: 'treble' as const, hand: 'right' as const,
            measures: [{ notes: [{ id: 'a', pitches: [60], duration: 'quarter' as const }] }],
          },
          { id: 'lh', name: 'Left Hand', clef: 'bass' as const, hand: 'left' as const, measures: [{ notes: [] }] },
        ],
      };
      const state = stateWith({
        score: scoreOneNote,
        freeTempoMeasureIndex: 0, freeTempoNoteIndex: 0,
        practiceRightHand: true, practiceLeftHand: true,
      });
      const next = reducer(state, { type: 'ADVANCE_FREE_TEMPO' });
      expect(next.freeTempoNoteIndex).toBe(-1);
    });
  });

  describe('SET_DURATION_MODE', () => {
    it('sets mode to auto without changing selectedDuration', () => {
      const state = stateWith({ selectedDuration: 'half' as const });
      const next = reducer(state, { type: 'SET_DURATION_MODE', mode: 'auto' });
      expect(next.durationMode).toBe('auto');
      expect(next.selectedDuration).toBe('half');
    });

    it('sets mode and updates selectedDuration for non-auto', () => {
      const next = reducer(initialState, { type: 'SET_DURATION_MODE', mode: 'eighth' });
      expect(next.durationMode).toBe('eighth');
      expect(next.selectedDuration).toBe('eighth');
    });
  });

  describe('SET_ZOOM', () => {
    it('sets zoom level within range', () => {
      const next = reducer(initialState, { type: 'SET_ZOOM', level: 0.7 });
      expect(next.zoomLevel).toBe(0.7);
    });

    it('clamps zoom to minimum 0.4', () => {
      const next = reducer(initialState, { type: 'SET_ZOOM', level: 0.1 });
      expect(next.zoomLevel).toBe(0.4);
    });

    it('clamps zoom to maximum 2.0', () => {
      const next = reducer(initialState, { type: 'SET_ZOOM', level: 3.0 });
      expect(next.zoomLevel).toBe(2.0);
    });
  });

  describe('SET_SCORE auto-zoom', () => {
    it('sets zoom to 1.0 for small scores (<=8 measures)', () => {
      const next = reducer(initialState, { type: 'SET_SCORE', score: minimalScore });
      expect(next.zoomLevel).toBe(1.0);
    });

    it('sets zoom to 0.85 for 9-20 measures', () => {
      const score: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p => ({
          ...p, measures: Array.from({ length: 15 }, () => ({ notes: [] })),
        })),
      };
      const next = reducer(initialState, { type: 'SET_SCORE', score });
      expect(next.zoomLevel).toBe(0.85);
    });

    it('sets zoom to 0.7 for 21-40 measures', () => {
      const score: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p => ({
          ...p, measures: Array.from({ length: 30 }, () => ({ notes: [] })),
        })),
      };
      const next = reducer(initialState, { type: 'SET_SCORE', score });
      expect(next.zoomLevel).toBe(0.7);
    });

    it('sets zoom to 0.6 for 41+ measures', () => {
      const score: PianoScore = {
        ...minimalScore,
        parts: minimalScore.parts.map(p => ({
          ...p, measures: Array.from({ length: 50 }, () => ({ notes: [] })),
        })),
      };
      const next = reducer(initialState, { type: 'SET_SCORE', score });
      expect(next.zoomLevel).toBe(0.6);
    });
  });

  describe('SELECT_MEASURE / SELECT_MEASURE_RANGE / CLEAR_MEASURE_SELECTION', () => {
    it('selects a single measure', () => {
      const next = reducer(initialState, { type: 'SELECT_MEASURE', index: 3 });
      expect(next.selectedMeasureRange).toEqual({ start: 3, end: 3 });
    });

    it('extends selection with range', () => {
      const state = stateWith({ selectedMeasureRange: { start: 2, end: 2 } });
      const next = reducer(state, { type: 'SELECT_MEASURE_RANGE', index: 5 });
      expect(next.selectedMeasureRange).toEqual({ start: 2, end: 5 });
    });

    it('handles range in reverse direction', () => {
      const state = stateWith({ selectedMeasureRange: { start: 5, end: 5 } });
      const next = reducer(state, { type: 'SELECT_MEASURE_RANGE', index: 1 });
      expect(next.selectedMeasureRange).toEqual({ start: 1, end: 5 });
    });

    it('creates new selection if no existing range for SELECT_MEASURE_RANGE', () => {
      const next = reducer(initialState, { type: 'SELECT_MEASURE_RANGE', index: 7 });
      expect(next.selectedMeasureRange).toEqual({ start: 7, end: 7 });
    });

    it('clears selection', () => {
      const state = stateWith({ selectedMeasureRange: { start: 2, end: 5 } });
      const next = reducer(state, { type: 'CLEAR_MEASURE_SELECTION' });
      expect(next.selectedMeasureRange).toBeNull();
    });

    it('SET_SCORE clears measure selection', () => {
      const state = stateWith({ selectedMeasureRange: { start: 1, end: 3 } });
      const next = reducer(state, { type: 'SET_SCORE', score: minimalScore });
      expect(next.selectedMeasureRange).toBeNull();
    });
  });

  describe('vocal part state', () => {
    it('SET_SHOW_VOCAL toggles showVocalPart', () => {
      expect(initialState.showVocalPart).toBe(false);
      const next = reducer(initialState, { type: 'SET_SHOW_VOCAL', show: true });
      expect(next.showVocalPart).toBe(true);
      const next2 = reducer(next, { type: 'SET_SHOW_VOCAL', show: false });
      expect(next2.showVocalPart).toBe(false);
    });

    it('SET_PRACTICE_VOICE toggles practiceVoice', () => {
      expect(initialState.practiceVoice).toBe(false);
      const next = reducer(initialState, { type: 'SET_PRACTICE_VOICE', enabled: true });
      expect(next.practiceVoice).toBe(true);
    });

    it('ADVANCE_FREE_TEMPO includes voice part when practiceVoice is true', () => {
      const scoreWithVoice: PianoScore = {
        ...minimalScore,
        parts: [
          {
            id: 'rh', name: 'Right Hand', clef: 'treble' as const, hand: 'right' as const,
            measures: [{ notes: [{ id: 'r1', pitches: [60], duration: 'quarter' as const }] }],
          },
          {
            id: 'lh', name: 'Left Hand', clef: 'bass' as const, hand: 'left' as const,
            measures: [{ notes: [] }],
          },
          {
            id: 'voice', name: 'Vocal', clef: 'treble' as const, hand: 'voice' as const,
            measures: [{ notes: [{ id: 'v1', pitches: [72], duration: 'quarter' as const }] }],
          },
        ],
      };
      const state = stateWith({
        score: scoreWithVoice, practiceVoice: true,
        practiceRightHand: true, practiceLeftHand: false,
        freeTempoMeasureIndex: 0, freeTempoNoteIndex: -1,
      });
      const next = reducer(state, { type: 'ADVANCE_FREE_TEMPO' });
      expect(next.currentNoteIndices.has('voice')).toBe(true);
      expect(next.currentNoteIndices.has('rh')).toBe(true);
    });

    it('trackVolume includes voice entry by default', () => {
      expect(initialState.trackVolume.get('voice')).toBe(1);
    });
  });
});
