/**
 * Placeholder Leak Detection
 * 
 * This test generates many stories and checks for any placeholder
 * strings that leaked through without being replaced.
 */

import { describe, it, expect } from 'vitest';
import { generateStoryDNA } from '../data/storyGenerator';
import { clearCharacterNames } from '../kimberly/realistic-names';
import type { StoryDNA } from '../types';

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
  'Superhero'
];

const PLACEHOLDER_PATTERNS = [
  /{subject}/,
  /{object}/,
  /{possessive}/,
  /{reflexive}/,
  /{is}/,
  /{has}/
];

function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(text));
}

function checkForPlaceholders(dna: StoryDNA, genre: string): string[] {
  const issues: string[] = [];
  
  // Check all string fields
  if (hasPlaceholders(dna.logline)) {
    issues.push(`[${genre}] Logline: ${dna.logline}`);
  }
  if (hasPlaceholders(dna.hero)) {
    issues.push(`[${genre}] Hero: ${dna.hero}`);
  }
  if (hasPlaceholders(dna.flaw)) {
    issues.push(`[${genre}] Flaw: ${dna.flaw}`);
  }
  if (hasPlaceholders(dna.nemesis)) {
    issues.push(`[${genre}] Nemesis: ${dna.nemesis}`);
  }
  if (hasPlaceholders(dna.setting)) {
    issues.push(`[${genre}] Setting: ${dna.setting}`);
  }
  
  // Check generated content cache
  if (dna.generatedContent) {
    Object.entries(dna.generatedContent).forEach(([key, value]) => {
      if (typeof value === 'string' && hasPlaceholders(value)) {
        issues.push(`[${genre}] Generated[${key}]: ${value}`);
      }
    });
  }
  
  return issues;
}

describe('Placeholder Leak Detection', () => {
  it('should not have any placeholder strings in generated output', () => {
    const allIssues: string[] = [];
    const samplesPerGenre = 20;
    
    for (const genre of GENRES) {
      for (let i = 0; i < samplesPerGenre; i++) {
        clearCharacterNames();
        const dna = generateStoryDNA(genre);
        const issues = checkForPlaceholders(dna, genre);
        allIssues.push(...issues);
      }
    }
    
    if (allIssues.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('PLACEHOLDER LEAKS DETECTED:');
      console.log('='.repeat(80));
      allIssues.forEach(issue => console.log(issue));
      console.log('='.repeat(80) + '\n');
    }
    
    expect(allIssues).toHaveLength(0);
  });
});

