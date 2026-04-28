import { describe, expect, it } from 'vitest';
import {
  initialMelodiaState,
  melodiaReducer,
  type MelodiaAction,
  type MelodiaState,
} from './store';
import type { MelodiaExercise } from './types';
import type { PianoScore } from '../shared/music/scoreTypes';

const TINY_SCORE: PianoScore = {
  id: 't',
  title: 'T',
  key: 'C',
  timeSignature: { numerator: 4, denominator: 4 },
  tempo: 60,
  parts: [
    {
      id: 'voice',
      name: 'V',
      clef: 'treble',
      hand: 'voice',
      measures: [{ notes: [{ id: 'n0', pitches: [60], duration: 'whole' }] }],
    },
  ],
};

const TINY_EXERCISE: MelodiaExercise = {
  id: 'tiny',
  score: TINY_SCORE,
  sourceHash: 'h',
};

function reduce(state: MelodiaState, ...actions: MelodiaAction[]): MelodiaState {
  return actions.reduce((s, a) => melodiaReducer(s, a), state);
}

describe('melodiaReducer', () => {
  it('moves from calibration to audiation on CALIBRATION_DONE', () => {
    const next = melodiaReducer(initialMelodiaState, {
      type: 'CALIBRATION_DONE',
      calibrationMidi: 62,
      comfort: { low: 57, high: 69 },
    });
    expect(next.phase).toBe('audiation');
    expect(next.calibrationMidi).toBe(62);
    expect(next.comfort).toEqual({ low: 57, high: 69 });
  });

  it('LOAD_EXERCISE seats helpLevel and clears prior trail', () => {
    const dirty = reduce(initialMelodiaState, {
      type: 'CALIBRATION_DONE',
      calibrationMidi: null,
      comfort: { low: 60, high: 72 },
    });
    const loaded = melodiaReducer(dirty, {
      type: 'LOAD_EXERCISE',
      exercise: TINY_EXERCISE,
      transposeSemitones: 2,
      transposeWarning: null,
      pathIndex: 0,
      helpLevel: 1,
    });
    expect(loaded.exercise?.id).toBe('tiny');
    expect(loaded.transposeSemitones).toBe(2);
    expect(loaded.helpLevel).toBe(1);
    expect(loaded.pitchTrail).toEqual([]);
  });

  it('GO_SING is a no-op outside audiation', () => {
    const next = melodiaReducer(initialMelodiaState, { type: 'GO_SING' });
    expect(next.phase).toBe('calibration');
  });

  it('records pitch samples only while singing', () => {
    const loaded = reduce(
      initialMelodiaState,
      {
        type: 'CALIBRATION_DONE',
        calibrationMidi: null,
        comfort: { low: 60, high: 72 },
      },
      {
        type: 'LOAD_EXERCISE',
        exercise: TINY_EXERCISE,
        transposeSemitones: 0,
        transposeWarning: null,
        pathIndex: 0,
        helpLevel: 0,
      },
    );
    const ignored = melodiaReducer(loaded, {
      type: 'RECORD_PITCH_SAMPLE',
      t: 0.1,
      midi: 60,
    });
    expect(ignored.pitchTrail).toEqual([]);
    const singing = reduce(
      loaded,
      { type: 'AUDIATION_DONE' },
      { type: 'GO_SING' },
      { type: 'RECORD_PITCH_SAMPLE', t: 0.1, midi: 60 },
      { type: 'RECORD_PITCH_SAMPLE', t: 0.2, midi: null },
    );
    expect(singing.phase).toBe('sing');
    expect(singing.pitchTrail).toEqual([
      { t: 0.1, midi: 60 },
      { t: 0.2, midi: null },
    ]);
  });

  it('SET_HELP_LEVEL clamps to [0, 3]', () => {
    expect(melodiaReducer(initialMelodiaState, { type: 'SET_HELP_LEVEL', level: -1 }).helpLevel).toBe(0);
    expect(melodiaReducer(initialMelodiaState, { type: 'SET_HELP_LEVEL', level: 9 }).helpLevel).toBe(3);
    expect(melodiaReducer(initialMelodiaState, { type: 'SET_HELP_LEVEL', level: 1.7 }).helpLevel).toBe(1);
  });

  it('PRACTICE_AGAIN goes back to audiation and clears trail', () => {
    const reviewing: MelodiaState = {
      ...initialMelodiaState,
      phase: 'review',
      pitchTrail: [{ t: 0.1, midi: 60 }],
      audiationDone: true,
    };
    const next = melodiaReducer(reviewing, { type: 'PRACTICE_AGAIN' });
    expect(next.phase).toBe('audiation');
    expect(next.pitchTrail).toEqual([]);
    expect(next.audiationDone).toBe(false);
  });
});
