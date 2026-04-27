import { describe, expect, it } from 'vitest';
import { RHYTHM_DATABASE } from './presetDatabase';
import {
  collectRhythmPresetIntegrityIssues,
  getPresetReferenceNotation,
  referenceAttackSkeletonMatches,
} from './presetIntegrity';

describe('collectRhythmPresetIntegrityIssues', () => {
  it('reports no issues for the live rhythm database', () => {
    const issues = collectRhythmPresetIntegrityIssues(RHYTHM_DATABASE);
    expect(issues).toEqual([]);
  });

  it('flags identical labeled variations across related rhythms with different bases', () => {
    const bad = {
      ...RHYTHM_DATABASE,
      malfuf: {
        ...RHYTHM_DATABASE.malfuf,
        variations: RHYTHM_DATABASE.malfuf.variations.map((v) =>
          v.note === '8/8 with ka ornaments'
            ? { ...v, notation: 'D-K-K-D-K-K-T-K-' }
            : v
        ),
      },
    };
    const issues = collectRhythmPresetIntegrityIssues(bad);
    expect(
      issues.some((m) =>
        m.includes('malfuf') && m.includes('kahleegi') && m.includes('copy/paste')
      )
    ).toBe(true);
  });

  it('flags ka-ornament lines that break the native backbone (Kahleegi stroke in a Malfuf slot)', () => {
    const bad = {
      ...RHYTHM_DATABASE,
      malfuf: {
        ...RHYTHM_DATABASE.malfuf,
        variations: RHYTHM_DATABASE.malfuf.variations.map((v) =>
          v.note === '8/8 with ka ornaments'
            ? { ...v, notation: 'D-K-K-D-K-K-T-K-' }
            : v
        ),
      },
    };
    const issues = collectRhythmPresetIntegrityIssues(bad);
    expect(
      issues.some(
        (m) =>
          m.includes('malfuf') &&
          m.includes('8/8 with ka ornaments') &&
          m.includes('attack skeleton')
      )
    ).toBe(true);
  });
});

describe('getPresetReferenceNotation', () => {
  it('resolves 8/8 vs 2/4 mapping for asymmetric presets', () => {
    expect(
      getPresetReferenceNotation(RHYTHM_DATABASE.malfuf, { numerator: 8, denominator: 8 })
    ).toBe('D-----T-----T---');
    expect(
      getPresetReferenceNotation(RHYTHM_DATABASE.malfuf, { numerator: 2, denominator: 4 })
    ).toBe('D--T--T-');
  });
});

describe('referenceAttackSkeletonMatches', () => {
  it('accepts Malfuf ka ornaments over the 8/8 Malfuf skeleton', () => {
    const r = referenceAttackSkeletonMatches(
      'D-----T-----T---',
      { numerator: 8, denominator: 8 },
      'D-K-K-T-K-K-T-K-',
      { numerator: 8, denominator: 8 }
    );
    expect(r).toEqual({ ok: true });
  });

  it('rejects Kahleegi-style dum in the middle Malfuf cell', () => {
    const r = referenceAttackSkeletonMatches(
      'D-----T-----T---',
      { numerator: 8, denominator: 8 },
      'D-K-K-D-K-K-T-K-',
      { numerator: 8, denominator: 8 }
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Tick 6/);
  });
});
