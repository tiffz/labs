import { describe, test, expect } from 'vitest';
import { gameAwards } from './awardData';

describe('awardData', () => {
  test('all awards have required fields', () => {
    gameAwards.forEach((award) => {
      expect(award).toHaveProperty('id');
      expect(award).toHaveProperty('title');
      expect(award).toHaveProperty('description');
      expect(award).toHaveProperty('type');
      expect(award).toHaveProperty('type');
      expect(award).toHaveProperty('icon');
      expect(award).toHaveProperty('color');
      
      expect(typeof award.id).toBe('string');
      expect(typeof award.title).toBe('string');
      expect(typeof award.description).toBe('string');
      expect(typeof award.icon).toBe('string');
      expect(typeof award.color).toBe('string');
      
      expect(award.id.length).toBeGreaterThan(0);
      expect(award.title.length).toBeGreaterThan(0);
      expect(award.description.length).toBeGreaterThan(0);
    });
  });

  test('all award IDs are unique', () => {
    const ids = gameAwards.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all award targets are valid', () => {
    gameAwards.forEach((award) => {
      if (award.target) {
        expect(award.target).toHaveProperty('actionType');
        if (award.target.actionType) {
          expect(['nose_click', 'happy_jump', 'ear_wiggle', 'cheek_pet'].includes(award.target.actionType)).toBe(true);
        }
        if (award.target.count) {
          expect(typeof award.target.count).toBe('number');
          expect(award.target.count).toBeGreaterThan(0);
        }
      }
    });
  });

  test('award types are valid', () => {
    const validTypes = ['special_action', 'hidden_discovery', 'secret_interaction'];
    gameAwards.forEach((award) => {
      expect(validTypes.includes(award.type)).toBe(true);
    });
  });

  test('award rewards are appropriate', () => {
    gameAwards.forEach((award) => {
      if (award.reward) {
        if (award.reward.love) {
          expect(typeof award.reward.love).toBe('number');
          expect(award.reward.love).toBeGreaterThan(0);
        }
        if (award.reward.treats) {
          expect(typeof award.reward.treats).toBe('number');
          expect(award.reward.treats).toBeGreaterThan(0);
        }
      }
    });
  });

  test('specific awards exist', () => {
    const awardIds = gameAwards.map(a => a.id);
    
    // Check for the specifically requested awards
    expect(awardIds).toContain('boop_achievement');
    expect(awardIds).toContain('happy_jump_achievement');
  });

  test('boop award has correct target', () => {
    const boopAward = gameAwards.find(a => a.id === 'boop_achievement');
    expect(boopAward).toBeDefined();
    expect(boopAward?.target?.actionType).toBe('nose_click');
    expect(boopAward?.target?.count).toBe(1);
    expect(boopAward?.title).toBe('Boop');
  });

  test('joy bringer award has correct target', () => {
    const joyAward = gameAwards.find(a => a.id === 'happy_jump_achievement');
    expect(joyAward).toBeDefined();
    expect(joyAward?.target?.actionType).toBe('happy_jump');
    expect(joyAward?.target?.count).toBe(1);
  });

  test('award colors are valid CSS colors', () => {
    gameAwards.forEach((award) => {
      // Should be either a hex color, named color, or valid CSS color
      expect(typeof award.color).toBe('string');
      expect(award.color.length).toBeGreaterThan(0);
      // Basic validation - should start with # for hex or be a known CSS color name
      expect(
        award.color.startsWith('#') || 
        /^[a-zA-Z]+$/.test(award.color) ||
        award.color.startsWith('rgb') ||
        award.color.startsWith('hsl')
      ).toBe(true);
    });
  });

  test('award icons are valid Material Design icons', () => {
    gameAwards.forEach((award) => {
      // Should be non-empty string (specific icon validation would require Material Icons list)
      expect(typeof award.icon).toBe('string');
      expect(award.icon.length).toBeGreaterThan(0);
      // Should not contain spaces or special characters (basic validation)
      expect(/^[a-z_]+$/.test(award.icon)).toBe(true);
    });
  });

  test('award descriptions are appropriately mysterious', () => {
    gameAwards.forEach((award) => {
      // Awards should be secret, so descriptions should be vague or mysterious
      expect(award.description.length).toBeGreaterThan(10);
      expect(award.description.length).toBeLessThan(200); // Not too verbose
    });
  });

  test('all special action types are covered', () => {
    const specialActions = gameAwards.map(a => a.target?.actionType).filter(Boolean);
    const uniqueActions = new Set(specialActions);
    
    // Should have awards for at least the main interactions
    expect(uniqueActions.has('nose_click')).toBe(true);
    expect(uniqueActions.has('happy_jump')).toBe(true);
  });
});