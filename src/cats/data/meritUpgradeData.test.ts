import { describe, test, expect } from 'vitest';
import { 
  meritUpgradeData, 
  getMeritUpgradeCost, 
  getTotalMeritUpgradeMultiplier,
  getMeritUpgradeEffect,
  getAvailableMeritPoints 
} from './meritUpgradeData';

describe('meritUpgradeData', () => {
  describe('meritUpgradeData array', () => {
    test('contains expected number of upgrades', () => {
      expect(meritUpgradeData).toHaveLength(5);
    });

    test('all upgrades have required properties', () => {
      meritUpgradeData.forEach(upgrade => {
        expect(upgrade).toHaveProperty('id');
        expect(upgrade).toHaveProperty('name');
        expect(upgrade).toHaveProperty('description');
        expect(upgrade).toHaveProperty('icon');
        expect(upgrade).toHaveProperty('maxLevel');
        expect(upgrade).toHaveProperty('effectType');
        expect(upgrade).toHaveProperty('effectAmount');
        
        expect(typeof upgrade.id).toBe('string');
        expect(typeof upgrade.name).toBe('string');
        expect(typeof upgrade.description).toBe('string');
        expect(typeof upgrade.icon).toBe('string');
        expect(typeof upgrade.maxLevel).toBe('number');
        expect(typeof upgrade.effectType).toBe('string');
        expect(typeof upgrade.effectAmount).toBe('number');
      });
    });

    test('all upgrades have max level of 10', () => {
      meritUpgradeData.forEach(upgrade => {
        expect(upgrade.maxLevel).toBe(10);
      });
    });

    test('does not contain Cat Whisperer upgrade', () => {
      const catWhispererUpgrade = meritUpgradeData.find(upgrade => 
        upgrade.name === 'Cat Whisperer' || upgrade.id === 'cat_whisperer'
      );
      expect(catWhispererUpgrade).toBeUndefined();
    });
  });

  describe('getMeritUpgradeCost', () => {
    test('returns correct cost for level 0 (first upgrade)', () => {
      expect(getMeritUpgradeCost(0)).toBe(1);
    });

    test('returns correct cost for level 1 (second upgrade)', () => {
      expect(getMeritUpgradeCost(1)).toBe(2);
    });

    test('returns correct cost for level 5 (sixth upgrade)', () => {
      expect(getMeritUpgradeCost(5)).toBe(6);
    });

    test('returns correct cost for level 9 (tenth upgrade)', () => {
      expect(getMeritUpgradeCost(9)).toBe(10);
    });

    test('follows linear progression (current level + 1)', () => {
      for (let level = 0; level < 10; level++) {
        expect(getMeritUpgradeCost(level)).toBe(level + 1);
      }
    });
  });

  describe('getTotalMeritUpgradeMultiplier', () => {
    test('returns default multiplier when no upgrades purchased', () => {
      const multiplier = getTotalMeritUpgradeMultiplier({}, 'love_per_pet_multiplier');
      expect(multiplier).toBe(1);
    });

    test('calculates correct multiplier for single upgrade', () => {
      const spentMerits = { love_per_pet_multiplier: 1 };
      const multiplier = getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_pet_multiplier');
      
      // First level gives 20% bonus, so multiplier should be 1.2
      expect(multiplier).toBe(1.2);
    });

    test('calculates correct multiplier for multiple levels', () => {
      const spentMerits = { love_per_pet_multiplier: 3 };
      const multiplier = getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_pet_multiplier');
      
      // Three levels give 60% bonus, so multiplier should be 1.6
      expect(multiplier).toBe(1.6);
    });

    test('handles max level upgrades correctly', () => {
      const spentMerits = { love_per_pet_multiplier: 10 };
      const multiplier = getTotalMeritUpgradeMultiplier(spentMerits, 'love_per_pet_multiplier');
      
      // Ten levels give 200% bonus, so multiplier should be 3.0
      expect(multiplier).toBe(3.0);
    });

    test('returns 1 for non-existent effect types', () => {
      const spentMerits = { love_per_pet_multiplier: 5 };
      const multiplier = getTotalMeritUpgradeMultiplier(spentMerits, 'non_existent_type');
      
      expect(multiplier).toBe(1);
    });
  });

  describe('getMeritUpgradeEffect', () => {
    test('calculates correct effect for valid upgrade', () => {
      const effect = getMeritUpgradeEffect('love_per_pet_multiplier', 3);
      expect(effect).toBeCloseTo(0.6); // 3 levels * 0.2 effect amount (use toBeCloseTo for floating point)
    });

    test('returns 0 for non-existent upgrade', () => {
      const effect = getMeritUpgradeEffect('non_existent_upgrade', 5);
      expect(effect).toBe(0);
    });

    test('returns 0 for level 0', () => {
      const effect = getMeritUpgradeEffect('love_per_pet_multiplier', 0);
      expect(effect).toBe(0);
    });
  });

  describe('getAvailableMeritPoints', () => {
    test('returns correct available points when no merits spent', () => {
      const earnedMerits = ['merit1', 'merit2', 'merit3'];
      const spentMerits = {};
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(3);
    });

    test('returns correct available points when some merits spent', () => {
      const earnedMerits = ['merit1', 'merit2', 'merit3', 'merit4', 'merit5'];
      const spentMerits = { love_per_pet_multiplier: 2 }; // Level 2, costs 1+2 = 3 merits total
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(2); // 5 earned - 3 spent = 2 available
    });

    test('returns 0 when all merits are spent', () => {
      const earnedMerits = ['merit1', 'merit2', 'merit3'];
      const spentMerits = { love_per_pet_multiplier: 2 }; // Level 2, costs 1+2 = 3 merits total
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(0);
    });

    test('returns 0 when more merits spent than earned (safeguard)', () => {
      const earnedMerits = ['merit1'];
      const spentMerits = { love_per_pet_multiplier: 5 }; // Spent 15 merits total
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(0); // Should be capped at 0
    });

    test('handles undefined spentMerits gracefully', () => {
      const earnedMerits = ['merit1', 'merit2'];
      const spentMerits = undefined;
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(2);
    });

    test('handles empty arrays correctly', () => {
      const earnedMerits: string[] = [];
      const spentMerits = {};
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(0);
    });

    test('calculates spent merits correctly for complex upgrade combinations', () => {
      const earnedMerits = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'];
      const spentMerits = {
        love_per_pet_multiplier: 3, // Level 3: 1+2+3 = 6 merits
        love_per_pounce_multiplier: 1, // Level 1: 1 merit
        feeding_effectiveness_multiplier: 2 // Level 2: 1+2 = 3 merits
      }; // Total: 10 merits spent
      
      const available = getAvailableMeritPoints(earnedMerits, spentMerits);
      expect(available).toBe(0); // 10 earned - 10 spent = 0 available
    });
  });
});