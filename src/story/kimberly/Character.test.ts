/**
 * Tests for Kimberly System Character class
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  Character, 
  createHero, 
  createVillain,
  createMentor
} from './Character';

describe('Character', () => {
  let femaleChar: Character;
  let maleChar: Character;
  let neutralChar: Character;

  beforeEach(() => {
    femaleChar = new Character('hero', 'female');
    maleChar = new Character('hero', 'male');
    neutralChar = new Character('hero', 'neutral');
  });

  describe('name generation', () => {
    it('generates a name for female character', () => {
      expect(femaleChar.Kimberly()).toBeTruthy();
      expect(typeof femaleChar.Kimberly()).toBe('string');
    });

    it('generates a name for male character', () => {
      expect(maleChar.Kimberly()).toBeTruthy();
      expect(typeof maleChar.Kimberly()).toBe('string');
    });

    it('generates a name for neutral character', () => {
      expect(neutralChar.Kimberly()).toBeTruthy();
      expect(typeof neutralChar.Kimberly()).toBe('string');
    });

    it('returns consistent name on multiple calls', () => {
      const name1 = femaleChar.Kimberly();
      const name2 = femaleChar.Kimberly();
      expect(name1).toBe(name2);
    });

    it('allows setting custom name', () => {
      femaleChar.setName('CustomName');
      expect(femaleChar.Kimberly()).toBe('CustomName');
    });
  });

  describe('female pronouns', () => {
    it('returns correct subject pronoun', () => {
      expect(femaleChar.she()).toBe('she');
      expect(femaleChar.She()).toBe('She');
    });

    it('returns correct object pronoun', () => {
      expect(femaleChar.her()).toBe('her');
      expect(femaleChar.Her()).toBe('Her');
    });

    it('returns correct possessive', () => {
      expect(femaleChar.hers()).toBe('her');
      expect(femaleChar.Hers()).toBe('Her');
    });

    it('returns correct possessive pronoun', () => {
      expect(femaleChar.hersAlone()).toBe('hers');
    });

    it('returns correct reflexive', () => {
      expect(femaleChar.herself()).toBe('herself');
    });
  });

  describe('male pronouns', () => {
    it('returns correct subject pronoun', () => {
      expect(maleChar.she()).toBe('he');
      expect(maleChar.She()).toBe('He');
    });

    it('returns correct object pronoun', () => {
      expect(maleChar.her()).toBe('him');
      expect(maleChar.Her()).toBe('Him');
    });

    it('returns correct possessive', () => {
      expect(maleChar.hers()).toBe('his');
      expect(maleChar.Hers()).toBe('His');
    });

    it('returns correct possessive pronoun', () => {
      expect(maleChar.hersAlone()).toBe('his');
    });

    it('returns correct reflexive', () => {
      expect(maleChar.herself()).toBe('himself');
    });
  });

  describe('neutral pronouns', () => {
    it('returns correct subject pronoun', () => {
      expect(neutralChar.she()).toBe('they');
      expect(neutralChar.She()).toBe('They');
    });

    it('returns correct object pronoun', () => {
      expect(neutralChar.her()).toBe('them');
      expect(neutralChar.Her()).toBe('Them');
    });

    it('returns correct possessive', () => {
      expect(neutralChar.hers()).toBe('their');
      expect(neutralChar.Hers()).toBe('Their');
    });

    it('returns correct possessive pronoun', () => {
      expect(neutralChar.hersAlone()).toBe('theirs');
    });

    it('returns correct reflexive', () => {
      expect(neutralChar.herself()).toBe('themselves');
    });
  });

  describe('metadata', () => {
    it('returns correct gender', () => {
      expect(femaleChar.getGender()).toBe('female');
      expect(maleChar.getGender()).toBe('male');
      expect(neutralChar.getGender()).toBe('neutral');
    });

    it('returns correct role', () => {
      expect(femaleChar.getRole()).toBe('hero');
      
      const villain = new Character('villain', 'male');
      expect(villain.getRole()).toBe('villain');
    });
  });

  describe('factory functions', () => {
    it('createHero creates hero character', () => {
      const hero = createHero('female');
      expect(hero.getRole()).toBe('hero');
      expect(hero.getGender()).toBe('female');
    });

    it('createVillain creates villain character', () => {
      const villain = createVillain('male');
      expect(villain.getRole()).toBe('villain');
      expect(villain.getGender()).toBe('male');
    });

    it('createMentor creates mentor character', () => {
      const mentor = createMentor('neutral');
      expect(mentor.getRole()).toBe('mentor');
      expect(mentor.getGender()).toBe('neutral');
    });

    it('creates character with random gender when not specified', () => {
      const hero = createHero();
      expect(['female', 'male', 'neutral']).toContain(hero.getGender());
    });
  });

  describe('template usage', () => {
    it('can be used in template strings', () => {
      const text = `${femaleChar.Kimberly()} looked at ${femaleChar.her()} reflection. ${femaleChar.She()} knew ${femaleChar.she()} had to act.`;
      
      expect(text).toContain(femaleChar.Kimberly());
      expect(text).toContain('her');
      expect(text).toContain('She');
      expect(text).toContain('she');
    });
  });
});

