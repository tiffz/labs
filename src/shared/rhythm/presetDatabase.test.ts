import { describe, expect, it } from 'vitest';
import { RHYTHM_DATABASE, getPresetNotation } from './presetDatabase';

describe('presetDatabase malfuf/kahleegi defaults', () => {
  it('uses 8/8 defaults with ornament variations', () => {
    expect(RHYTHM_DATABASE.malfuf.timeSignature).toEqual({ numerator: 8, denominator: 8 });
    expect(RHYTHM_DATABASE.malfuf.basePattern).toBe('D-----T-----T---');
    expect(RHYTHM_DATABASE.malfuf.variations[0]?.note).toBeUndefined();
    expect(RHYTHM_DATABASE.malfuf.variations[0]?.timeSignature).toEqual({
      numerator: 8,
      denominator: 8,
    });
    expect(
      RHYTHM_DATABASE.malfuf.variations.some((variation) => variation.notation === 'D-K-K-D-K-K-T-K-')
    ).toBe(true);

    expect(RHYTHM_DATABASE.kahleegi.timeSignature).toEqual({ numerator: 8, denominator: 8 });
    expect(RHYTHM_DATABASE.kahleegi.basePattern).toBe('D-----D-----T---');
    expect(RHYTHM_DATABASE.kahleegi.variations[0]?.note).toBeUndefined();
    expect(RHYTHM_DATABASE.kahleegi.variations[0]?.timeSignature).toEqual({
      numerator: 8,
      denominator: 8,
    });
    expect(
      RHYTHM_DATABASE.kahleegi.variations.some(
        (variation) => variation.notation === 'D-K-K-D-K-K-T-K-'
      )
    ).toBe(true);
  });

  it('keeps legacy 2/4 mapping behavior for 4/4 flows', () => {
    expect(
      getPresetNotation(RHYTHM_DATABASE.malfuf, { numerator: 4, denominator: 4 })
    ).toBe('D--T--T-D--T--T-');
    expect(
      getPresetNotation(RHYTHM_DATABASE.kahleegi, { numerator: 4, denominator: 4 })
    ).toBe('D--D--T-D--D--T-');
  });

  it('declares valid related rhythm links for known rhythm families', () => {
    const rhythmIds = new Set(Object.keys(RHYTHM_DATABASE));
    const families = ['maqsum', 'saeidi', 'baladi', 'malfuf', 'kahleegi'] as const;

    families.forEach((id) => {
      const related = RHYTHM_DATABASE[id].relatedRhythmIds ?? [];
      expect(related.length).toBeGreaterThan(0);
      related.forEach((relatedId) => {
        expect(rhythmIds.has(relatedId)).toBe(true);
        expect(relatedId).not.toBe(id);
      });
    });
  });
});
