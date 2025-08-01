import { describe, test, expect } from 'vitest';
import { skillData, getSkillLevel, getSkillProgress, getSkillEffect } from './skillData';

describe('skillData', () => {
  test('should have correct structure', () => {
    expect(skillData).toHaveLength(6);
    
    skillData.forEach(skill => {
      expect(skill).toHaveProperty('id');
      expect(skill).toHaveProperty('name');
      expect(skill).toHaveProperty('description');
      expect(skill).toHaveProperty('icon');
      expect(skill).toHaveProperty('effectType');
      expect(skill).toHaveProperty('effectAmount');
      expect(skill).toHaveProperty('levels');
      expect(skill.levels.length).toBeGreaterThan(0);
    });
  });

  test('should have all expected skills', () => {
    const skillIds = skillData.map(s => s.id);
    expect(skillIds).toContain('petting_technique');
    expect(skillIds).toContain('wand_technique');
    expect(skillIds).toContain('interior_design');
    expect(skillIds).toContain('food_prep');
    expect(skillIds).toContain('work_ethic');
    expect(skillIds).toContain('work_smarts');
  });

  test('should have correct effect types', () => {
    const pettingSkill = skillData.find(s => s.id === 'petting_technique');
    expect(pettingSkill?.effectType).toBe('love_per_pet');
    
    const wandSkill = skillData.find(s => s.id === 'wand_technique');
    expect(wandSkill?.effectType).toBe('love_per_pounce');
    
    const interiorSkill = skillData.find(s => s.id === 'interior_design');
    expect(interiorSkill?.effectType).toBe('furniture_love_multiplier');
  });
});

describe('getSkillLevel', () => {
  test('should return 0 for unknown skill', () => {
    expect(getSkillLevel('unknown_skill', 10)).toBe(0);
  });

  test('should return 0 for no increments', () => {
    expect(getSkillLevel('petting_technique', {})).toBe(0); // No increments completed
  });

  test('should return correct level for petting technique', () => {
    expect(getSkillLevel('petting_technique', { 0: 4 })).toBe(1);  // Level 1 completed (4/4 increments)
    expect(getSkillLevel('petting_technique', { 0: 4, 1: 5 })).toBe(2);  // Level 2 completed (5/5 increments)
    expect(getSkillLevel('petting_technique', { 0: 4, 1: 5, 2: 5 })).toBe(3); // Level 3 completed
  });

  test('should handle partial completion correctly', () => {
    expect(getSkillLevel('petting_technique', { 0: 2 })).toBe(0);  // Partial level 1, so still level 0
    expect(getSkillLevel('petting_technique', { 0: 4, 1: 2 })).toBe(1); // Level 1 done, level 2 partial
  });
});

describe('getSkillProgress', () => {
  test('should return correct progress for unknown skill', () => {
    const result = getSkillProgress('unknown_skill', {});
    expect(result).toEqual({ currentLevel: 0, isMaxLevel: false, currentLevelProgress: 0, currentTarget: null });
  });

  test('should return correct progress at level start', () => {
    const result = getSkillProgress('petting_technique', {});
    expect(result.currentLevel).toBe(0);
    expect(result.currentLevelProgress).toBeCloseTo(0, 5);
    expect(result.currentTarget).toEqual({ levelIndex: 0, incrementIndex: 0 });
  });

  test('should return correct progress mid-level', () => {
    const result = getSkillProgress('petting_technique', { 0: 2 });
    expect(result.currentLevel).toBe(0);
    expect(result.currentLevelProgress).toBeCloseTo(0.5, 5); // 2/4 = 0.5
    expect(result.currentTarget).toEqual({ levelIndex: 0, incrementIndex: 2 });
  });

  test('should return correct progress at max level', () => {
    const result = getSkillProgress('petting_technique', { 0: 4, 1: 5, 2: 5, 3: 4, 4: 4 });
    expect(result.currentLevel).toBe(5);
    expect(result.isMaxLevel).toBe(true);
    expect(result.currentTarget).toBe(null);
  });
});

describe('getSkillEffect', () => {
  test('should return 0 for unknown skill', () => {
    expect(getSkillEffect('unknown_skill', {})).toBe(0);
  });

  test('should return correct effect for petting technique', () => {
    expect(getSkillEffect('petting_technique', {})).toBe(0);  // Level 0, effect = 0 * 2
    expect(getSkillEffect('petting_technique', { 0: 4 })).toBe(2);  // Level 1, effect = 1 * 2
    expect(getSkillEffect('petting_technique', { 0: 4, 1: 5 })).toBe(4); // Level 2, effect = 2 * 2
  });

  test('should return correct effect for wand technique', () => {
    expect(getSkillEffect('wand_technique', {})).toBe(0);  // Level 0, effect = 0 * 3
    expect(getSkillEffect('wand_technique', { 0: 4 })).toBe(3);  // Level 1, effect = 1 * 3
    expect(getSkillEffect('wand_technique', { 0: 4, 1: 4 })).toBe(6); // Level 2, effect = 2 * 3
  });

  test('should return correct effect for percentage-based skills', () => {
    expect(getSkillEffect('interior_design', { 0: 4 })).toBe(0.1);  // Level 1, effect = 1 * 0.1
    expect(getSkillEffect('food_prep', { 0: 4 })).toBe(0.15); // Level 1, effect = 1 * 0.15
  });
});

describe('skill level progression consistency', () => {
  test('all skills should have sensible progression', () => {
    skillData.forEach(skill => {
      expect(skill.levels.length).toBeGreaterThan(0);
      expect(skill.effectAmount).toBeGreaterThan(0);
      
      // Check that each level has increments
      skill.levels.forEach((level) => {
        expect(level.increments.length).toBeGreaterThan(0);
        expect(level.title).toBeTruthy();
        
        // Check that each increment is valid
        level.increments.forEach(increment => {
          expect(increment.title).toBeTruthy();
          expect(increment.description).toBeTruthy();
          expect(increment.successRate).toBeGreaterThan(0);
          expect(increment.successRate).toBeLessThanOrEqual(1);
          expect(increment.loveCost).toBeGreaterThan(0);
        });
      });
    });
  });
});