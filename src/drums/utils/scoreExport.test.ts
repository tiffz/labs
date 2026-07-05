import { describe, expect, it } from 'vitest';
import { exportDrumsScoreSheet } from './scoreExport';
import type { ParsedRhythm, TimeSignature } from '../types';

const timeSignature: TimeSignature = { numerator: 4, denominator: 4 };
const rhythm: ParsedRhythm = {
  isValid: true,
  measures: [{ notes: [{ sound: 'dum', duration: 'sixteenth', durationInSixteenths: 16, isDotted: false }] }],
  timeSignature,
  repeats: [],
};

describe('exportDrumsScoreSheet', () => {
  it('rejects invalid rhythms', async () => {
    await expect(exportDrumsScoreSheet({
      rhythm: { ...rhythm, isValid: false, measures: [] },
      timeSignature,
      notation: '',
      title: 'Custom Rhythm',
      bpm: 100,
      format: 'png',
    })).rejects.toThrow(/valid rhythm/i);
  });
});
