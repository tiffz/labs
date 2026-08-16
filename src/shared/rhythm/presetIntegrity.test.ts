import { describe, expect, it } from 'vitest';
import { RHYTHM_DATABASE } from './presetDatabase';
import {
  collectRhythmPresetIntegrityIssues,
  getPresetReferenceNotation,
  referenceAttackSkeletonMatches,
} from './presetIntegrity';

/*
 * Both fixtures below plant Kahleegi's second dum inside Malfuf's ornamented line. Identify that
 * line by its NOTATION, not by its note text: the note is user-facing copy and gets reworded, and
 * an earlier version of these tests silently stopped planting anything when it did - the `.map`
 * matched nothing, the fixture equalled the real database, and the assertions failed for a reason
 * that had nothing to do with the invariant under test.
 */
const MALFUF_ORNAMENT_NOTATION = 'D-K-K-T-K-K-T-K-';
const ornamentVariation = RHYTHM_DATABASE.malfuf.variations.find(
  (v) => v.notation === MALFUF_ORNAMENT_NOTATION
);
if (!ornamentVariation?.note) {
  // A bare non-null assertion here throws `Cannot read properties of undefined`, which takes the
  // whole file down and says nothing about why. Name the missing thing instead.
  throw new Error(
    `presetIntegrity.test: no Malfuf variation ${MALFUF_ORNAMENT_NOTATION} with a note. ` +
      `If that line was renumbered or removed, update MALFUF_ORNAMENT_NOTATION.`
  );
}
const ORNAMENT_NOTE = ornamentVariation.note;

function malfufWithKahleegiOrnamentLine() {
  const planted = RHYTHM_DATABASE.malfuf.variations.map((v) =>
    v.notation === MALFUF_ORNAMENT_NOTATION ? { ...v, notation: 'D-K-K-D-K-K-T-K-' } : v
  );
  // Fail loudly if the target line is ever renamed or removed, rather than testing nothing.
  if (planted.every((v, i) => v.notation === RHYTHM_DATABASE.malfuf.variations[i].notation)) {
    throw new Error(`Fixture planted nothing: no Malfuf variation ${MALFUF_ORNAMENT_NOTATION}`);
  }
  return { ...RHYTHM_DATABASE, malfuf: { ...RHYTHM_DATABASE.malfuf, variations: planted } };
}

describe('collectRhythmPresetIntegrityIssues', () => {
  it('reports no issues for the live rhythm database', () => {
    const issues = collectRhythmPresetIntegrityIssues(RHYTHM_DATABASE);
    expect(issues).toEqual([]);
  });

  it('flags identical labeled variations across related rhythms with different bases', () => {
    const issues = collectRhythmPresetIntegrityIssues(malfufWithKahleegiOrnamentLine());
    expect(
      issues.some((m) =>
        m.includes('malfuf') && m.includes('kahleegi') && m.includes('copy/paste')
      )
    ).toBe(true);
  });

  it('flags ka-ornament lines that break the native backbone (Kahleegi stroke in a Malfuf slot)', () => {
    const issues = collectRhythmPresetIntegrityIssues(malfufWithKahleegiOrnamentLine());
    expect(
      issues.some(
        (m) =>
          m.includes('malfuf') &&
          m.includes(ORNAMENT_NOTE) &&
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

  /*
   * The repo bans em dashes in UI copy (docs/USER_COPY_STYLE.md), and `npm run check:ui-copy`
   * enforces it — but that script walks `.tsx` files only, so this database has never been in its
   * scope. An em dash sat in a variation note through a green presubmit.
   *
   * This checks the same rule where the copy actually lives. Extending check-ui-copy.mjs to `.ts`
   * repo-wide would flag 96 pre-existing strings across 1,353 files and is the owner's call.
   */
  it('uses no em dashes in user-facing copy', () => {
    const offenders = displayed
      .filter(({ text }) => text.includes('—'))
      .map(({ field, text }) => `${field}: "${text}"`);
    expect(offenders).toEqual([]);
  });
});
