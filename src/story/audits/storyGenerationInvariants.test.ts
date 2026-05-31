/**
 * Fast smoke tests for story generation (presubmit).
 * Exhaustive audits: comprehensive-generation-audit.test.ts, placeholderLeakAudit.test.ts
 */
import { describe, expect, it } from 'vitest';
import { generateStoryDNA } from '../data/storyGenerator';
import type { StoryDNA } from '../types';

const SMOKE_GENRES = ['Buddy Love', 'Monster in the House', 'Golden Fleece'] as const;
const PLACEHOLDER = /\{(subject|object|possessive|reflexive|is|has)\}/;

function assertNoPlaceholders(dna: StoryDNA): void {
  const strings = [
    dna.logline,
    dna.hero,
    dna.flaw,
    dna.nemesis,
    dna.initialSetting,
    dna.act2Setting,
    ...Object.values(dna.generatedContent ?? {}).filter((v): v is string => typeof v === 'string'),
  ];
  for (const value of strings) {
    expect(value).not.toMatch(PLACEHOLDER);
    expect(value.trim().length).toBeGreaterThan(0);
  }
}

describe('storyGenerationInvariants (fast smoke)', () => {
  for (const genre of SMOKE_GENRES) {
    it(`[${genre}] generates valid DNA without placeholder leaks`, () => {
      for (let i = 0; i < 5; i++) {
        const dna = generateStoryDNA(genre, `Theme ${i}`);
        assertNoPlaceholders(dna);
        expect(dna.genre).toBe(genre);
      }
    });
  }
});
