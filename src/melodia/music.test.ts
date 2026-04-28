import { describe, expect, it } from 'vitest';
import type { PianoScore } from '../shared/music/scoreTypes';
import {
  audiationCadenceVoicingMajor,
  buildOnsetSecondsOnly,
  buildPitchedOnsets,
  calibrationTransposeSemitones,
  computeTransposeToFitRange,
  expectedMidiAtSec,
  keyToTonicMidi,
  melodyAnchorReferenceMidi,
  pickMelodyPart,
  scoreMidiRange,
  rhythmTapExpectations,
  scoreRhythmTaps,
  shouldSkipMelodiaRhythmPhase,
  tonicAnchorMidiForLesson,
  tonicDroneFrequencyForLesson,
  tonicDroneFrequencyHz,
  transposeScore,
} from './music';

function minimalScore(overrides: Partial<PianoScore> = {}): PianoScore {
  return {
    id: 't',
    title: 'Test',
    key: 'C',
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 60,
    parts: [
      {
        id: 'p1',
        name: 'Melody',
        clef: 'treble',
        hand: 'right',
        measures: [
          {
            notes: [
              { id: 'a', pitches: [60], duration: 'quarter' },
              { id: 'b', pitches: [62], duration: 'quarter' },
              { id: 'c', pitches: [64], duration: 'half' },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('melodia music', () => {
  it('keyToTonicMidi maps C4 to MIDI 60', () => {
    expect(keyToTonicMidi('C', 4)).toBe(60);
  });

  it('tonicDroneFrequencyHz maps C3 to concert A440 C (~130.81 Hz)', () => {
    const hz = tonicDroneFrequencyHz('C', 3);
    expect(hz).toBeGreaterThan(130);
    expect(hz).toBeLessThan(132);
  });

  it('audiationCadenceVoicingMajor gives V7 on dominant and Ionian I rooted on lesson key', () => {
    const v = audiationCadenceVoicingMajor('C', 4);
    expect(v.tonicRootMidi).toBe(60);
    expect(v.dominantRootMidi).toBe(67);
    expect(v.v7midi).toEqual([67, 71, 74, 77]);
    expect(v.ionianMidi).toEqual([60, 64, 67]);
    const gm = audiationCadenceVoicingMajor('G', 3);
    expect(gm.tonicRootMidi).toBe(55);
    expect(gm.v7midi[0]).toBe(62);
    expect(gm.ionianMidi).toEqual([55, 59, 62]);
  });

  it('expectedMidiAtSec returns the active note MIDI by timeline', () => {
    const score = minimalScore({ tempo: 60 });
    const part = pickMelodyPart(score);
    const po = buildPitchedOnsets(score, part, 0);
    expect(expectedMidiAtSec(po, 0)).toBe(60);
    expect(expectedMidiAtSec(po, 0.99)).toBe(60);
    expect(expectedMidiAtSec(po, 1)).toBe(62);
    expect(expectedMidiAtSec(po, 10)).toBe(64);
  });

  it('pickMelodyPart prefers voice', () => {
    const score = minimalScore({
      parts: [
        {
          id: 'rh', name: 'RH', clef: 'treble', hand: 'right', measures: [{ notes: [] }],
        },
        {
          id: 'v', name: 'Voice', clef: 'treble', hand: 'voice', measures: [{ notes: [] }],
        },
      ],
    });
    expect(pickMelodyPart(score).hand).toBe('voice');
  });

  it('buildOnsetSecondsOnly at 60 bpm', () => {
    const score = minimalScore({ tempo: 60 });
    const part = pickMelodyPart(score);
    expect(buildOnsetSecondsOnly(score, part)).toEqual([0, 1, 2]);
  });

  it('scoreMidiRange', () => {
    expect(scoreMidiRange(minimalScore())).toEqual({ min: 60, max: 64 });
  });

  it('transposeScore shifts pitches', () => {
    const t = transposeScore(minimalScore(), 2);
    expect(t.parts[0].measures[0].notes[0].pitches[0]).toBe(62);
  });

  it('computeTransposeToFitRange centers', () => {
    const r = computeTransposeToFitRange(60, 64, 60, 72);
    expect(r.semitones).toBeGreaterThanOrEqual(-12);
    expect(r.semitones).toBeLessThanOrEqual(12);
    expect(60 + r.semitones).toBeGreaterThanOrEqual(60);
    expect(64 + r.semitones).toBeLessThanOrEqual(72);
  });

  it('scoreRhythmTaps passes on aligned taps', () => {
    const start = 1000;
    const onsets = [0, 1, 2];
    const taps = [1000, 2005, 3005];
    expect(scoreRhythmTaps(taps, onsets, start, 120)).toBe(true);
  });

  it('rhythmTapExpectations allows a single onset with one tap', () => {
    expect(rhythmTapExpectations(1)).toEqual({ minHits: 1, minTapEvents: 1 });
  });

  it('scoreRhythmTaps passes for one onset with one well-timed tap', () => {
    const start = 5000;
    expect(scoreRhythmTaps([start + 50], [0], start, 140)).toBe(true);
  });

  it('scoreRhythmTaps aligns to first tap so a delayed start still scores', () => {
    const start = 10_000;
    const onsets = [0, 1, 2];
    const taps = [15_000, 16_005, 17_010];
    expect(scoreRhythmTaps(taps, onsets, start, 140)).toBe(true);
  });

  it('shouldSkipMelodiaRhythmPhase is true for a single note', () => {
    const score = minimalScore({
      parts: [
        {
          id: 'p',
          name: 'P',
          clef: 'treble',
          hand: 'right',
          measures: [{ notes: [{ id: 'n', pitches: [60], duration: 'whole' }] }],
        },
      ],
    });
    expect(shouldSkipMelodiaRhythmPhase(score)).toBe(true);
  });

  it('shouldSkipMelodiaRhythmPhase is false for several notes', () => {
    expect(shouldSkipMelodiaRhythmPhase(minimalScore())).toBe(false);
  });

  it('calibrationTransposeSemitones puts the calibrated MIDI on tonic when within ±6 st', () => {
    const score = minimalScore({ key: 'C' });
    const result = calibrationTransposeSemitones(score, 62);
    expect(result.semitones).toBe(2);
    expect(result.warning).toBeNull();
  });

  it('calibrationTransposeSemitones returns 0 when the captured pitch is exactly tonic', () => {
    const score = minimalScore({ key: 'C' });
    expect(calibrationTransposeSemitones(score, 60).semitones).toBe(0);
    expect(calibrationTransposeSemitones(score, 72).semitones).toBe(0);
  });

  it('calibrationTransposeSemitones picks the nearest tonic octave', () => {
    const score = minimalScore({ key: 'C' });
    const aboveC = calibrationTransposeSemitones(score, 67);
    expect(aboveC.semitones).toBe(-5);
    expect(aboveC.warning).toBeNull();
    const belowC = calibrationTransposeSemitones(score, 55);
    expect(belowC.semitones).toBe(-5);
    expect(belowC.warning).toBeNull();
  });

  it('melodyAnchorReferenceMidi and tonicAnchorMidi shift with curriculum transpose near first pitch', () => {
    const scoreFa = minimalScore({
      parts: [
        {
          id: 'p1',
          name: 'Melody',
          clef: 'treble',
          hand: 'right',
          measures: [{ notes: [{ id: 'n', pitches: [65], duration: 'whole' }] }],
        },
      ],
    });
    expect(melodyAnchorReferenceMidi(scoreFa)).toBe(65);
    expect(tonicAnchorMidiForLesson('C', 0, 65)).toBe(60);
    expect(tonicAnchorMidiForLesson('C', 5, 65)).toBe(65);
  });

  it('tonicDroneFrequencyForLesson bumps Hz when the lesson transpose moves the tonal center up', () => {
    const scoreFa = minimalScore({
      tempo: 60,
      parts: [
        {
          id: 'p1',
          name: 'Melody',
          clef: 'treble',
          hand: 'right',
          measures: [{ notes: [{ id: 'n', pitches: [65], duration: 'whole' }] }],
        },
      ],
    });
    const hz0 = tonicDroneFrequencyForLesson(scoreFa, 0);
    const hzUp5 = tonicDroneFrequencyForLesson(scoreFa, 5);
    expect(hzUp5).toBeGreaterThan(hz0 * 1.28);
    expect(hzUp5).toBeLessThan(hz0 * 1.42);
  });
});
