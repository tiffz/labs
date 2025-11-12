import { describe, it, expect } from 'vitest';
import { generateStoryDNA, getNewSuggestion } from './storyGenerator';

describe('Story Generator', () => {
  describe('generateStoryDNA', () => {
    it('generates a valid story DNA with random genre and theme', () => {
      const dna = generateStoryDNA('Random', 'Random');

      expect(dna).toBeDefined();
      expect(dna.genre).toBeDefined();
      expect(dna.theme).toBeDefined();
      expect(dna.hero).toBeDefined();
      expect(dna.flaw).toBeDefined();
      expect(dna.nemesis).toBeDefined();
      expect(dna.initialSetting).toBeDefined();
      expect(dna.act2Setting).toBeDefined();
      expect(dna.bStoryCharacter).toBeDefined();
    });

    it('generates a story DNA with specific genre and theme', () => {
      const dna = generateStoryDNA('Whydunit', 'Forgiveness');

      expect(dna.genre).toBe('Whydunit');
      expect(dna.theme).toBe('Forgiveness');
    });

    it('ensures act2Setting is different from initialSetting', () => {
      // Run multiple times to check consistency
      for (let i = 0; i < 10; i++) {
        const dna = generateStoryDNA('Random', 'Random');
        expect(dna.act2Setting).not.toBe(dna.initialSetting);
      }
    });

    it('generates different heroes on multiple calls', () => {
      const heroes = new Set();
      for (let i = 0; i < 20; i++) {
        const dna = generateStoryDNA('Random', 'Random');
        heroes.add(dna.hero);
      }
      // Should have at least some variety
      expect(heroes.size).toBeGreaterThan(1);
    });
  });

  describe('getNewSuggestion', () => {
    const mockDNA = {
      genre: 'Whydunit',
      theme: 'Forgiveness',
      hero: 'John Smith, a Cynical Detective',
      heroName: 'John Smith',
      flaw: 'Grudge-holding',
      nemesis: 'Victor Kane, a Megalomaniac CEO',
      nemesisName: 'Victor Kane',
      initialSetting: 'Rainy Metropolis',
      act2Setting: 'A neon-lit city',
      bStoryCharacter: 'Maria Garcia, a Sarcastic Informant',
      bStoryCharacterName: 'Maria Garcia',
      minorCharacterName: 'Robert Lee',
      generatedContent: {},
    };

    it('generates a new hero suggestion', () => {
      const suggestion = getNewSuggestion('hero', mockDNA);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });

    it('generates a new flaw suggestion', () => {
      const suggestion = getNewSuggestion('flaw', mockDNA);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
    });

    it('generates a new nemesis suggestion', () => {
      const suggestion = getNewSuggestion('nemesis', mockDNA);
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
    });

    it('generates genre-specific elements', () => {
      const detective = getNewSuggestion('The Detective', mockDNA);
      expect(detective).toBeDefined();
      expect(typeof detective).toBe('string');

      const secret = getNewSuggestion('The Secret', mockDNA);
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
    });

    it('generates beat sub-elements', () => {
      const visualSnapshot = getNewSuggestion('beat_OpeningImage_VisualSnapshot', mockDNA);
      expect(visualSnapshot).toBeDefined();
      expect(typeof visualSnapshot).toBe('string');
      expect(visualSnapshot).toContain(mockDNA.initialSetting);
    });

    it('returns Error for unknown rerollId', () => {
      const suggestion = getNewSuggestion('unknown-id', mockDNA);
      expect(suggestion).toBe('Error');
    });

    it('incorporates DNA values into suggestions', () => {
      const flawShown = getNewSuggestion('beat_OpeningImage_FlawShown', mockDNA);
      expect(flawShown).toContain(mockDNA.flaw);

      const bStory = getNewSuggestion('beat_BStory_NewCharacter', mockDNA);
      expect(bStory).toContain(mockDNA.bStoryCharacterName);

      const themeEmbodied = getNewSuggestion('beat_BStory_ThemeEmbodied', mockDNA);
      expect(themeEmbodied).toContain(mockDNA.theme);
    });
  });
});

