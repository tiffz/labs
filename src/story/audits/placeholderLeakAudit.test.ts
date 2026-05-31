/**
 * Placeholder leak audit (excluded from test:fast via *Audit* filename).
 * Fast smoke: storyGenerationInvariants.test.ts
 */
import { describe, it, expect } from 'vitest';
import { generateStoryDNA } from '../data/storyGenerator';
import { clearCharacterNames } from '../kimberly/realistic-names';
import type { StoryDNA } from '../types';
import { logAuditFailures } from '../../shared/test/auditLogging';

const GENRES = [
  'Buddy Love',
  'Monster in the House',
  'Golden Fleece',
  'Out of the Bottle',
  'Dude with a Problem',
  'Rites of Passage',
  'Whydunit',
  'Fool Triumphant',
  'Institutionalized',
  'Superhero',
];

const PLACEHOLDER_PATTERNS = [
  /{subject}/,
  /{object}/,
  /{possessive}/,
  /{reflexive}/,
  /{is}/,
  /{has}/,
];

function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

function checkForPlaceholders(dna: StoryDNA, genre: string): string[] {
  const issues: string[] = [];

  if (hasPlaceholders(dna.logline)) issues.push(`[${genre}] Logline: ${dna.logline}`);
  if (hasPlaceholders(dna.hero)) issues.push(`[${genre}] Hero: ${dna.hero}`);
  if (hasPlaceholders(dna.flaw)) issues.push(`[${genre}] Flaw: ${dna.flaw}`);
  if (hasPlaceholders(dna.nemesis)) issues.push(`[${genre}] Nemesis: ${dna.nemesis}`);
  if (hasPlaceholders(dna.initialSetting)) {
    issues.push(`[${genre}] Initial setting: ${dna.initialSetting}`);
  }
  if (hasPlaceholders(dna.act2Setting)) issues.push(`[${genre}] Act 2 setting: ${dna.act2Setting}`);

  if (dna.generatedContent) {
    Object.entries(dna.generatedContent).forEach(([key, value]) => {
      if (typeof value === 'string' && hasPlaceholders(value)) {
        issues.push(`[${genre}] Generated[${key}]: ${value}`);
      }
    });
  }

  return issues;
}

describe('Placeholder Leak Audit', () => {
  it('should not have any placeholder strings in generated output', () => {
    const allIssues: string[] = [];
    const samplesPerGenre = 20;

    for (const genre of GENRES) {
      for (let i = 0; i < samplesPerGenre; i++) {
        clearCharacterNames();
        const dna = generateStoryDNA(genre, 'Random');
        allIssues.push(...checkForPlaceholders(dna, genre));
      }
    }

    logAuditFailures('PLACEHOLDER LEAKS DETECTED:', allIssues);
    expect(allIssues).toHaveLength(0);
  });
});
