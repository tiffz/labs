import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  calculateSkillTrainingCost,
  canAffordSkillTraining,
  performSkillTraining,
  checkForSkillLevelUp,
  getNextLevelExperience
} from './skillTrainingSystem';
import { skillData } from './skillData';

describe('calculateSkillTrainingCost', () => {
  test('should return first increment cost for no progress', () => {
    const cost = calculateSkillTrainingCost('petting_technique', {});
    expect(cost).toBe(2); // First increment cost
  });

  test('should return next increment cost based on progress', () => {
    const cost1 = calculateSkillTrainingCost('petting_technique', { 0: 1 }); // Second increment
    const cost2 = calculateSkillTrainingCost('petting_technique', { 0: 2 }); // Third increment
    
    expect(cost1).toBeGreaterThanOrEqual(3);
    expect(cost2).toBeGreaterThanOrEqual(cost1);
  });

  test('should return null when skill is mastered', () => {
    const cost = calculateSkillTrainingCost('petting_technique', { 0: 4, 1: 5, 2: 5, 3: 4, 4: 4 });
    expect(cost).toBe(null);
  });
});

describe('performSkillTraining', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('should return consistent structure', () => {
    const result = performSkillTraining('petting_technique', {});
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('loveCost');
    expect(result).toHaveProperty('message');
    expect(typeof result!.success).toBe('boolean');
    expect(typeof result!.loveCost).toBe('number');
    expect(typeof result!.message).toBe('string');
  });

  test('should return loveCost matching training cost', () => {
    const skillIncrements = {};
    const result = performSkillTraining('petting_technique', skillIncrements);
    const expectedCost = calculateSkillTrainingCost('petting_technique', skillIncrements);
    
    expect(result!.loveCost).toBe(expectedCost);
  });

  test('should have variety in messages', () => {
    const messages = new Set<string>();
    
    // Run training multiple times to collect messages
    for (let i = 0; i < 50; i++) {
      const result = performSkillTraining('petting_technique', {});
      if (result) {
        messages.add(result.message);
      }
    }
    
    expect(messages.size).toBeGreaterThan(3); // Should have variety
  });

  test('should return null for unknown skill', () => {
    const result = performSkillTraining('unknown_skill', {});
    expect(result).toBe(null);
  });

  test('should return null when skill is mastered', () => {
    const result = performSkillTraining('petting_technique', { 0: 4, 1: 5, 2: 5, 3: 4, 4: 4 });
    expect(result).toBe(null);
  });
});

describe('canAffordSkillTraining', () => {
  test('should return true when player has enough love', () => {
    const skillIncrements = {};
    const cost = calculateSkillTrainingCost('petting_technique', skillIncrements);
    expect(canAffordSkillTraining(cost!, 'petting_technique', skillIncrements)).toBe(true);
    expect(canAffordSkillTraining(cost! + 10, 'petting_technique', skillIncrements)).toBe(true);
  });

  test('should return false when player does not have enough love', () => {
    const skillIncrements = {};
    const cost = calculateSkillTrainingCost('petting_technique', skillIncrements);
    expect(canAffordSkillTraining(cost! - 1, 'petting_technique', skillIncrements)).toBe(false);
    expect(canAffordSkillTraining(0, 'petting_technique', skillIncrements)).toBe(false);
  });

  test('should work with different skill progression levels', () => {
    const skillIncrements = { 0: 2 };
    const cost = calculateSkillTrainingCost('petting_technique', skillIncrements);
    
    expect(canAffordSkillTraining(cost!, 'petting_technique', skillIncrements)).toBe(true);
    expect(canAffordSkillTraining(cost! - 1, 'petting_technique', skillIncrements)).toBe(false);
  });
});

describe('checkForSkillLevelUp', () => {
  test('should return false for unknown skill', () => {
    const result = checkForSkillLevelUp(skillData, 'unknown_skill', {}, { 0: 1 });
    expect(result).toBe(false);
  });

  test('should return false when no level up occurs', () => {
    const result = checkForSkillLevelUp(skillData, 'petting_technique', { 0: 1 }, { 0: 2 });
    expect(result).toBe(false);
  });

  test('should return true when level up occurs', () => {
    const result = checkForSkillLevelUp(skillData, 'petting_technique', { 0: 3 }, { 0: 4 });
    expect(result).toBe(true);
  });

  test('should return true for multiple level jumps', () => {
    const result = checkForSkillLevelUp(skillData, 'petting_technique', {}, { 0: 4, 1: 4 });
    expect(result).toBe(true);
  });

  test('should work for different skills', () => {
    const result = checkForSkillLevelUp(skillData, 'wand_technique', { 0: 3 }, { 0: 4 });
    expect(result).toBe(true);
  });
});

describe('getNextLevelExperience', () => {
  test('should return null for unknown skill', () => {
    const result = getNextLevelExperience(skillData, 'unknown_skill', 1);
    expect(result).toBe(null);
  });

  test('should return null for max level', () => {
    const pettingSkill = skillData.find(s => s.id === 'petting_technique')!;
    const maxLevel = pettingSkill.levels.length;
    
    const result = getNextLevelExperience(skillData, 'petting_technique', maxLevel);
    expect(result).toBe(null);
  });

  test('should return correct increment count for next level', () => {
    const result = getNextLevelExperience(skillData, 'petting_technique', 0);
    expect(result).toBe(4); // First level has 4 increments
  });

  test('should work for different levels', () => {
    const result = getNextLevelExperience(skillData, 'petting_technique', 1);
    expect(result).toBe(5); // Second level has 5 increments
  });
});

describe('Skills training system integration', () => {
  test('should have consistent training costs across skills', () => {
    const skillIncrements = {};
    
    skillData.forEach(skill => {
      const cost = calculateSkillTrainingCost(skill.id, skillIncrements);
      expect(cost).toBeGreaterThan(0);
      expect(Number.isInteger(cost!)).toBe(true);
    });
  });

  test('should provide predictable training results', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // First call for success chance (0.1 < 0.7 = success for first increment)
      .mockReturnValueOnce(0); // Second call for message selection
    
    const result = performSkillTraining('petting_technique', {});
    
    expect(result!.success).toBe(true); // Should succeed with Math.random() = 0.1 < 0.7
    expect(result!.loveCost).toBe(2); // Base cost for first increment
    expect(result!.message).toBeTruthy();
    expect(result!.increment).toBeTruthy(); // Increment should be included on success
  });

  test('should support the complete training flow', () => {
    const skillId = 'petting_technique';
    const startIncrements = {};
    
    // Check initial state
    expect(canAffordSkillTraining(10, skillId, startIncrements)).toBe(true);
    
    // Perform training
    const result = performSkillTraining(skillId, startIncrements);
    expect(result).not.toBe(null);
    expect(result!.loveCost).toBeGreaterThan(0);
    
    // Verify result structure
    expect(typeof result!.success).toBe('boolean');
    expect(typeof result!.message).toBe('string');
  });
});