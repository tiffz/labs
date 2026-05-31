/**
 * Fast structural smoke tests for word rhythm generation.
 * Full matrix audit lives in generationQualityAudit.test.ts (excluded from test:fast).
 */
import { describe, expect, it } from 'vitest';
import {
  generateWordRhythm,
  DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
} from './prosodyEngine';
import { parseRhythm } from '../../shared/rhythm/rhythmParser';

const TIME_SIG = { numerator: 4, denominator: 4 } as const;
const SIXTEENTHS_PER_MEASURE = 16;

const SMOKE_CASES = [
  {
    id: 'maqsum-baseline',
    lyrics: 'Sunrise on the shoreline',
    template: 'D-T-__T-D---T---',
    overrides: {},
  },
  {
    id: 'simple-merge',
    lyrics: 'Ocean waves',
    template: 'D---D---D---D---',
    overrides: { mergeNotes: true },
  },
  {
    id: 'multiline-freestyle',
    lyrics: 'Sunrise on the shoreline\nOcean wind through palm trees',
    template: 'D-T-__T-D---T---',
    overrides: { freestyle: true, freestyleStrength: 50 },
  },
] as const;

describe('generationQualityInvariants (fast smoke)', () => {
  for (const smoke of SMOKE_CASES) {
    it(`[${smoke.id}] produces valid notation with aligned hits`, () => {
      const result = generateWordRhythm(smoke.lyrics, {
        strictDictionaryMode: false,
        timeSignature: TIME_SIG,
        variationSeed: 42,
        generationSettings: {
          ...DEFAULT_WORD_RHYTHM_GENERATION_SETTINGS,
          ...smoke.overrides,
          templateNotation: smoke.template,
        },
      });

      const parsed = parseRhythm(result.notation, TIME_SIG);
      expect(parsed.isValid).toBe(true);
      expect(parsed.measures.length).toBeGreaterThan(0);
      expect(parsed.measures.length).toBeLessThan(50);

      const totalSixteenths = parsed.measures.length * SIXTEENTHS_PER_MEASURE;
      for (const hit of result.hits) {
        expect(hit.startSixteenth).toBeGreaterThanOrEqual(0);
        expect(hit.startSixteenth + hit.durationSixteenths).toBeLessThanOrEqual(totalSixteenths);
      }

      let soundingNoteCount = 0;
      parsed.measures.forEach((measure) =>
        measure.notes.forEach((note) => {
          if (note.sound !== 'rest' && note.sound !== 'simile') soundingNoteCount++;
        })
      );
      expect(result.hits.length).toBe(soundingNoteCount);
    });
  }
});
