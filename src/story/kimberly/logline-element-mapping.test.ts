/**
 * Tests for logline element mapping and regeneration
 * 
 * This test ensures that all regenerators return strings, not objects,
 * to prevent React rendering errors when rerolling elements.
 */

import { describe, it, expect } from 'vitest';
import { regenerateElement, genreElementMappings } from './logline-element-mapping';

describe('Logline Element Mapping', () => {
  describe('regenerateElement', () => {
    it('should always return strings, never objects', () => {
      // Test every genre and every element
      const genres = Object.keys(genreElementMappings);
      
      for (const genre of genres) {
        const elements = Object.keys(genreElementMappings[genre]);
        
        for (const elementId of elements) {
          const result = regenerateElement(genre, elementId);
          
          // The result should be a string, not an object
          expect(typeof result).toBe('string');
          
          // Additional check: make sure it's not accidentally stringified JSON
          expect(result).not.toMatch(/^\{.*\}$/);
          
          // Make sure it's not empty
          expect(result.length).toBeGreaterThan(0);
        }
      }
    });
    
    it('should return null for unknown genre', () => {
      const result = regenerateElement('Unknown Genre', 'Some Element');
      expect(result).toBeNull();
    });
    
    it('should return null for unknown element in valid genre', () => {
      const result = regenerateElement('Buddy Love', 'Unknown Element');
      expect(result).toBeNull();
    });
  });
  
  describe('specific problematic regenerators', () => {
    it('should return string for Buddy Love "The Incomplete Hero"', () => {
      const result = regenerateElement('Buddy Love', 'The Incomplete Hero');
      expect(typeof result).toBe('string');
      expect(result).not.toMatch(/^\{.*\}$/);
    });
    
    it('should return string for Buddy Love "The Counterpart"', () => {
      const result = regenerateElement('Buddy Love', 'The Counterpart');
      expect(typeof result).toBe('string');
      expect(result).not.toMatch(/^\{.*\}$/);
    });
    
    it('should return string for Out of the Bottle "The Spell"', () => {
      const result = regenerateElement('Out of the Bottle', 'The Spell');
      expect(typeof result).toBe('string');
      expect(result).not.toMatch(/^\{.*\}$/);
    });
    
    it('should return string for Whydunit "The Dark Turn"', () => {
      const result = regenerateElement('Whydunit', 'The Dark Turn');
      expect(typeof result).toBe('string');
      expect(result).not.toMatch(/^\{.*\}$/);
    });
    
    it('should return string for Superhero "The Curse"', () => {
      const result = regenerateElement('Superhero', 'The Curse');
      expect(typeof result).toBe('string');
      expect(result).not.toMatch(/^\{.*\}$/);
    });
  });
});

