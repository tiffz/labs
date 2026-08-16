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

/**
 * The app picks ONE canonical name per rhythm — the spelling in the owner's teachers' books — and
 * every description refers to rhythms by that name only. Other spellings live in `alternateNames`,
 * where the reader can see which tradition each belongs to.
 *
 * Without this, prose drifts: one description says "Khaleeji", the picker says "Kahleegi", and a
 * learner cannot tell whether those are two rhythms. The failure is silent — nothing else in the
 * suite reads description text.
 */
describe('canonical names in prose', () => {
  const alternates = Object.values(RHYTHM_DATABASE).flatMap((r) =>
    (r.alternateNames ?? []).map((a) => ({ rhythmId: r.id, alternate: a.name }))
  );

  const mentions = (text: string, name: string) =>
    new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);

  it('has alternates to check', () => {
    // Guards the loop below from silently passing on an empty set.
    expect(alternates.length).toBeGreaterThan(10);
  });

  it('never uses an alternate spelling in a description', () => {
    const offenders = Object.values(RHYTHM_DATABASE).flatMap((r) =>
      alternates
        .filter(({ alternate }) => mentions(r.description, alternate))
        .map(({ rhythmId, alternate }) =>
          `${r.id}.description says "${alternate}" (an alternate name for ${rhythmId})`
        )
    );
    expect(offenders).toEqual([]);
  });

  it('never uses an alternate spelling in a "Used in" line', () => {
    const offenders = Object.values(RHYTHM_DATABASE).flatMap((r) =>
      alternates
        .filter(({ alternate }) => mentions(r.usedIn ?? '', alternate))
        .map(({ rhythmId, alternate }) =>
          `${r.id}.usedIn says "${alternate}" (an alternate name for ${rhythmId})`
        )
    );
    expect(offenders).toEqual([]);
  });

  it('never uses an alternate spelling in a variation note', () => {
    const offenders = Object.values(RHYTHM_DATABASE).flatMap((r) =>
      r.variations.flatMap((v) =>
        alternates
          .filter(({ alternate }) => mentions(v.note ?? '', alternate))
          .map(({ rhythmId, alternate }) =>
            `${r.id} variation ${v.notation} says "${alternate}" (an alternate name for ${rhythmId})`
          )
      )
    );
    expect(offenders).toEqual([]);
  });

  it('does not list a rhythm as an alternate name of itself', () => {
    const offenders = Object.values(RHYTHM_DATABASE)
      .flatMap((r) => (r.alternateNames ?? []).map((a) => ({ id: r.id, name: r.name, a })))
      .filter(({ name, a }) => a.name === name)
      .map(({ id, a }) => `${id} lists its own canonical name "${a.name}" as an alternate`);
    expect(offenders).toEqual([]);
  });
});

/**
 * No non-Latin script in anything the reader sees.
 *
 * The owner does not read Arabic, Persian or Kurdish, so she cannot check what the app publishes
 * under her name in those scripts. Original script stays in source comments, where it is provenance
 * for the next editor and always sits beside an English gloss.
 *
 * Displayed fields only. URLs are exempt — Wikipedia article ids are percent-encoded and are not
 * read as text.
 */
describe('English-only user-facing text', () => {
  /** Anything outside Basic Latin, Latin-1, Latin Extended-A/B, and common punctuation. */
  const NON_LATIN = /[^ -ɏ‐-›−]/u;

  const displayed = Object.values(RHYTHM_DATABASE).flatMap((r) => [
    { field: `${r.id}.name`, text: r.name },
    { field: `${r.id}.description`, text: r.description },
    { field: `${r.id}.usedIn`, text: r.usedIn ?? '' },
    ...(r.alternateNames ?? []).flatMap((a) => [
      { field: `${r.id}.alternateNames["${a.name}"].name`, text: a.name },
      { field: `${r.id}.alternateNames["${a.name}"].context`, text: a.context ?? '' },
    ]),
    ...r.variations.map((v) => ({
      field: `${r.id} variation ${v.notation} note`,
      text: v.note ?? '',
    })),
    ...r.learnMoreLinks.map((l) => ({ field: `${r.id} link title`, text: l.title })),
  ]);

  it('has strings to check', () => {
    // Guards the assertion below from passing on an empty set.
    expect(displayed.length).toBeGreaterThan(50);
  });

  it('renders no Arabic, Persian or Kurdish script', () => {
    const offenders = displayed
      .filter(({ text }) => NON_LATIN.test(text))
      .map(({ field, text }) => `${field}: "${text}"`);
    expect(offenders).toEqual([]);
  });
});
