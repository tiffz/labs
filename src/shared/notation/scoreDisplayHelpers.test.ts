import { describe, expect, it } from 'vitest';
import type { ScoreNote } from '../music/scoreTypes';
import {
  closestWrongPitchDelta,
  createAccidentalTracker,
  getKeyAccidentalMap,
  getKeySignatureInfo,
  getVexflowKey,
  liveActiveNoteMatched,
} from './scoreDisplayHelpers';

describe('scoreDisplayHelpers', () => {
  it('normalizes enharmonic keys for VexFlow', () => {
    expect(getVexflowKey('C#')).toBe('Db');
    expect(getKeySignatureInfo('G')).toBe(1);
    expect(getKeyAccidentalMap('F').get('B')).toBe('b');
  });

  it('tracks accidentals within a measure', () => {
    const tracker = createAccidentalTracker(getKeyAccidentalMap('C'));
    expect(tracker.getNeeded('F/4')).toBe(null);
    expect(tracker.getNeeded('F#/4')).toBe('#');
    expect(tracker.getNeeded('F#/4')).toBe(null);
    tracker.reset();
    expect(tracker.getNeeded('F#/4')).toBe('#');
  });

  it('finds closest wrong pitch within ghost distance', () => {
    expect(closestWrongPitchDelta([60], [62])).toBe(2);
    expect(closestWrongPitchDelta([60], [66])).toBe(null);
  });

  it('matches live active notes in pitch-class and written-midi modes', () => {
    const note: ScoreNote = {
      id: 'n1',
      pitches: [60],
      duration: 'quarter',
      rest: false,
    };
    expect(liveActiveNoteMatched(note, [72], 'pitchClass', 0)).toBe(true);
    expect(liveActiveNoteMatched(note, [72], 'writtenMidi', 0)).toBe(false);
    expect(liveActiveNoteMatched(note, [61], 'writtenMidi', 1)).toBe(true);
  });
});
