import { describe, it, expect } from 'vitest';
import { recognizeRhythm } from './rhythmRecognition';
import { RHYTHM_DATABASE } from '../data/rhythmDatabase';

describe('rhythmRecognition', () => {
  describe('recognizeRhythm', () => {
    it('should recognize basic Maqsum pattern', () => {
      const result = recognizeRhythm('D-T-__T-D---T---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Maqsum');
      expect(result?.matchedVariation.notation).toBe('D-T-__T-D---T---');
    });

    it('should recognize Maqsum pattern case-insensitively', () => {
      const result = recognizeRhythm('d-t-__t-d---t---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Maqsum');
    });

    it('should recognize Maqsum pattern with spaces', () => {
      const result = recognizeRhythm('D-T-__T-D---T--- D-T-__T-D---T---');
      expect(result).toBeNull(); // Should not match because it's doubled
    });

    it('should recognize Maqsum variation with Ka', () => {
      const result = recognizeRhythm('D-T-__T-D-K-T---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Maqsum');
    });

    it('should recognize Maqsum variation with double Ka', () => {
      const result = recognizeRhythm('D-T-__T-D-K-T-K-');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Maqsum');
    });

    it('should recognize Maqsum variation with early Ka', () => {
      const result = recognizeRhythm('D-T-K-T-D-K-T---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Maqsum');
    });

    it('should recognize basic Ayoub pattern', () => {
      const result = recognizeRhythm('D--KD-T-');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Ayoub');
    });

    it('should recognize Ayoub variation with Tak', () => {
      const result = recognizeRhythm('D-TKD-T-');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Ayoub');
    });

    it('should recognize Ayoub variation from La Bass Fe Eyne', () => {
      const result = recognizeRhythm('D-TKT-D-');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Ayoub');
      expect(result?.matchedVariation.note).toContain('La Bass Fe Eyne');
    });

    it('should recognize basic Saeidi pattern', () => {
      const result = recognizeRhythm('D-T-__D-D---T---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Saeidi');
    });

    it('should recognize Saeidi variations', () => {
      const variations = [
        'D-T-__D-D-K-T---',
        'D-T-__D-D-K-T-K-',
        'D-T-K-D-D-K-T---',
        'D-T-K-D-D-K-T-K-',
      ];

      variations.forEach((notation) => {
        const result = recognizeRhythm(notation);
        expect(result).not.toBeNull();
        expect(result?.rhythm.name).toBe('Saeidi');
      });
    });

    it('should recognize basic Baladi pattern', () => {
      const result = recognizeRhythm('D-D-__T-D---T---');
      expect(result).not.toBeNull();
      expect(result?.rhythm.name).toBe('Baladi');
    });

    it('should recognize Baladi variations', () => {
      const variations = [
        'D-D-__T-D-K-T-K-',
        'D-D-K-T-D-K-T---',
        'D-D-K-T-D-K-T-K-',
      ];

      variations.forEach((notation) => {
        const result = recognizeRhythm(notation);
        expect(result).not.toBeNull();
        expect(result?.rhythm.name).toBe('Baladi');
      });
    });

    it('should return null for unrecognized patterns', () => {
      const result = recognizeRhythm('D-D-D-D-T-T-T-T-');
      expect(result).toBeNull();
    });

    it('should return null for empty input', () => {
      const result = recognizeRhythm('');
      expect(result).toBeNull();
    });

    it('should handle notation with newlines', () => {
      const result = recognizeRhythm('D-T-__T-D---T---\nD-T-__T-D---T---');
      expect(result).toBeNull(); // Should not match because it's doubled
    });
  });


  describe('RHYTHM_DATABASE', () => {
    it('should have all required rhythms', () => {
      expect(RHYTHM_DATABASE.maqsum).toBeDefined();
      expect(RHYTHM_DATABASE.ayoub).toBeDefined();
      expect(RHYTHM_DATABASE.saeidi).toBeDefined();
      expect(RHYTHM_DATABASE.baladi).toBeDefined();
    });

    it('should have valid structure for each rhythm', () => {
      Object.values(RHYTHM_DATABASE).forEach((rhythm) => {
        expect(rhythm.name).toBeDefined();
        expect(rhythm.description).toBeDefined();
        expect(rhythm.learnMoreLinks).toBeDefined();
        expect(Array.isArray(rhythm.learnMoreLinks)).toBe(true);
        expect(rhythm.basePattern).toBeDefined();
        expect(rhythm.variations).toBeDefined();
        expect(Array.isArray(rhythm.variations)).toBe(true);
        expect(rhythm.variations.length).toBeGreaterThan(0);
      });
    });

    it('should have valid learn more links', () => {
      Object.values(RHYTHM_DATABASE).forEach((rhythm) => {
        expect(rhythm.learnMoreLinks.length).toBeGreaterThan(0);
        rhythm.learnMoreLinks.forEach((link) => {
          expect(link.title).toBeDefined();
          expect(link.url).toBeDefined();
          expect(link.url).toMatch(/^https?:\/\//);
        });
      });
    });

    it('should have base pattern in variations', () => {
      Object.values(RHYTHM_DATABASE).forEach((rhythm) => {
        const hasBasePattern = rhythm.variations.some(
          (v) => v.notation === rhythm.basePattern
        );
        expect(hasBasePattern).toBe(true);
      });
    });
  });
});

