/**
 * Comprehensive Generation Audit
 * 
 * Simulates hundreds of story generations across all genres to catch:
 * - Grammar errors
 * - Missing punctuation
 * - Placeholder leaks ({subject}, {hero}, etc.)
 * - Genre mismatches
 * - Empty/undefined values
 * - Logical inconsistencies
 */

import { describe, it, expect } from 'vitest';
import { generateStoryDNA } from '../data/storyGenerator';
import type { StoryDNA } from '../types';

const GENRES = [
  'Monster in the House',
  'Golden Fleece',
  'Out of the Bottle',
  'Dude with a Problem',
  'Rites of Passage',
  'Buddy Love',
  'Whydunit',
  'Fool Triumphant',
  'Institutionalized',
  'Superhero'
];

const THEMES = [
  'Love conquers all',
  'Power corrupts',
  'Truth will out',
  'Redemption',
  'Family',
  'Identity',
  'Justice',
  'Freedom',
  'Revenge',
  'Sacrifice'
];

describe('Comprehensive Generation Audit', () => {
  // Test each genre extensively
  GENRES.forEach(genre => {
    describe(`Genre: ${genre}`, () => {
      it('should generate 50 valid stories without errors', () => {
        const issues: string[] = [];
        
        for (let i = 0; i < 50; i++) {
          const theme = THEMES[i % THEMES.length];
          const dna = generateStoryDNA(genre, theme);
          
          // Check all DNA fields
          const allIssues = auditStoryDNA(dna, genre);
          if (allIssues.length > 0) {
            issues.push(`Run ${i + 1}:\n${allIssues.join('\n')}`);
          }
        }
        
        if (issues.length > 0) {
          console.log(`\n=== ISSUES FOUND IN ${genre} ===`);
          console.log(issues.join('\n\n'));
        }
        
        expect(issues).toHaveLength(0);
      });
    });
  });

  // Cross-genre audit
  it('should generate 100 random stories across all genres without errors', () => {
    const issues: string[] = [];
    
    for (let i = 0; i < 100; i++) {
      const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
      const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const dna = generateStoryDNA(genre, theme);
      
      const allIssues = auditStoryDNA(dna, genre);
      if (allIssues.length > 0) {
        issues.push(`${genre} / ${theme} (Run ${i + 1}):\n${allIssues.join('\n')}`);
      }
    }
    
    if (issues.length > 0) {
      console.log('\n=== CROSS-GENRE ISSUES ===');
      console.log(issues.join('\n\n'));
    }
    
    expect(issues).toHaveLength(0);
  });
});

/**
 * Audits a single StoryDNA for issues
 */
function auditStoryDNA(dna: StoryDNA, genre: string): string[] {
  const issues: string[] = [];

  // Check for placeholder leaks
  const placeholderPattern = /\{(subject|object|possessive|reflexive|is|has|hero|their|them|they)\}/gi;
  
  // Check logline
  if (placeholderPattern.test(dna.logline)) {
    issues.push(`❌ Logline has placeholder: "${dna.logline}"`);
  }
  if (!dna.logline.trim().endsWith('.') && !dna.logline.trim().endsWith('!') && !dna.logline.trim().endsWith('?')) {
    issues.push(`❌ Logline missing punctuation: "${dna.logline}"`);
  }
  if (dna.logline.includes('undefined')) {
    issues.push(`❌ Logline has undefined: "${dna.logline}"`);
  }
  if (dna.logline.includes(' .') || dna.logline.includes(' ,')) {
    issues.push(`❌ Logline has space before punctuation: "${dna.logline}"`);
  }

  // Check hero name
  if (!dna.heroName || dna.heroName.trim() === '') {
    issues.push(`❌ Hero name is empty`);
  }
  if (placeholderPattern.test(dna.heroName)) {
    issues.push(`❌ Hero name has placeholder: "${dna.heroName}"`);
  }

  // Check nemesis
  if (!dna.nemesisName || dna.nemesisName.trim() === '') {
    issues.push(`❌ Nemesis name is empty`);
  }
  if (placeholderPattern.test(dna.nemesisName)) {
    issues.push(`❌ Nemesis name has placeholder: "${dna.nemesisName}"`);
  }

  // Check flaw
  if (!dna.flaw || dna.flaw.trim() === '') {
    issues.push(`❌ Flaw is empty`);
  }
  if (placeholderPattern.test(dna.flaw)) {
    issues.push(`❌ Flaw has placeholder: "${dna.flaw}"`);
  }

  // Check all generated content (beats)
  if (dna.generatedContent) {
    Object.entries(dna.generatedContent).forEach(([beatKey, beatValue]) => {
      if (!beatValue || beatValue.trim() === '') {
        issues.push(`❌ Beat "${beatKey}" is empty`);
      }
      if (placeholderPattern.test(beatValue)) {
        issues.push(`❌ Beat "${beatKey}" has placeholder: "${beatValue}"`);
      }
      if (beatValue.includes('undefined')) {
        issues.push(`❌ Beat "${beatKey}" has undefined: "${beatValue}"`);
      }
      if (beatValue.includes(' .') || beatValue.includes(' ,')) {
        issues.push(`❌ Beat "${beatKey}" has space before punctuation: "${beatValue}"`);
      }
      
      // Check for double spaces
      if (beatValue.includes('  ')) {
        issues.push(`❌ Beat "${beatKey}" has double spaces: "${beatValue}"`);
      }
      
      // Check for missing articles (common grammar error)
      if (/\sin\s[a-z]+\s(cliff|mountain|valley|forest)\b/.test(beatValue)) {
        // This might be "in bustling cliff" which is grammatically odd
        const match = beatValue.match(/\sin\s([a-z]+\s)?([a-z]+)\b/);
        if (match) {
          const adjective = match[1]?.trim();
          const noun = match[2];
          // Check if adjective makes sense with noun
          if (adjective === 'bustling' && ['cliff', 'mountain', 'valley', 'desert', 'beach', 'meadow'].includes(noun)) {
            issues.push(`❌ Beat "${beatKey}" has odd adjective-noun combo: "in ${adjective} ${noun}" - "${beatValue}"`);
          }
        }
      }
    });
  }

  // Check logline elements
  if (dna.loglineElements) {
    Object.entries(dna.loglineElements).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (placeholderPattern.test(value)) {
          issues.push(`❌ Logline element "${key}" has placeholder: "${value}"`);
        }
        if (value.includes('undefined')) {
          issues.push(`❌ Logline element "${key}" has undefined: "${value}"`);
        }
        if (value.includes(' .') || value.includes(' ,')) {
          issues.push(`❌ Logline element "${key}" has space before punctuation: "${value}"`);
        }
      }
    });
  }

  // Genre-specific validation
  switch (genre) {
    case 'Monster in the House':
      if (dna.loglineElements && typeof dna.loglineElements === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements = dna.loglineElements as any;
        if (!elements.monster || !elements.house || !elements.sin) {
          issues.push(`❌ Monster in the House missing required elements`);
        }
      }
      break;
    case 'Golden Fleece':
      if (dna.loglineElements && typeof dna.loglineElements === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements = dna.loglineElements as any;
        if (!elements.prize || !elements.journey || !elements.team) {
          issues.push(`❌ Golden Fleece missing required elements (prize: ${!!elements.prize}, journey: ${!!elements.journey}, team: ${!!elements.team})`);
        }
      }
      break;
    case 'Buddy Love':
      if (dna.loglineElements && typeof dna.loglineElements === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const elements = dna.loglineElements as any;
        if (!elements.incompleteness || !elements.completion) {
          issues.push(`❌ Buddy Love missing required elements`);
        }
        // These should be strings, not objects
        if (typeof elements.incompleteness === 'object') {
          issues.push(`❌ Buddy Love incompleteness is an object, should be string`);
        }
        if (typeof elements.completion === 'object') {
          issues.push(`❌ Buddy Love completion is an object, should be string`);
        }
      }
      break;
  }

  return issues;
}

