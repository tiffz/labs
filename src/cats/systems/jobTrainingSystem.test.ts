import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateTrainingCost,
  performTraining,
  canAffordTraining,
  getExperienceRequiredForPromotion,
  canPromoteToNextLevel,
  getTrainingConfig
} from './jobTrainingSystem';
import { jobData } from '../data/jobData';

describe('Job Training System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any random number generation for predictable tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Middle value for predictable testing
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Training Cost Calculation', () => {
    it('calculates base training cost correctly', () => {
      const cost = calculateTrainingCost('box_factory', 0);
      expect(cost).toBe(3); // Base cost for box_factory (updated for incremental game scaling)
    });

    it('increases training cost with experience', () => {
      const baseCost = calculateTrainingCost('box_factory', 0);
      const higherCost = calculateTrainingCost('box_factory', 50);
      expect(higherCost).toBeGreaterThan(baseCost);
    });

    it('uses default config for unknown job types', () => {
      const cost = calculateTrainingCost('unknown_job', 0);
      expect(cost).toBe(15); // Default base cost (updated for incremental game scaling)
    });
  });

  describe('Training Performance', () => {
    it('returns training result with experience gained', () => {
      const result = performTraining('box_factory', 0);
      
      expect(result).toHaveProperty('experienceGained');
      expect(result).toHaveProperty('loveCost');
      expect(result).toHaveProperty('wasLucky');
      expect(result.experienceGained).toBeGreaterThan(0);
      expect(result.loveCost).toBe(3); // Base cost for box_factory (updated for incremental game scaling)
    });

    it('applies luck bonus when random chance triggers', () => {
      // Mock random to trigger luck (20% chance, so < 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      
      const result = performTraining('box_factory', 0);
      
      expect(result.wasLucky).toBe(true);
      expect(result).toHaveProperty('bonusAmount');
      expect(result.experienceGained).toBeGreaterThan(1); // Should have bonus
    });

    it('does not apply luck bonus when random chance fails', () => {
      // Mock random to not trigger luck (20% chance, so >= 0.2)
      vi.spyOn(Math, 'random').mockReturnValue(0.8);
      
      const result = performTraining('box_factory', 0);
      
      expect(result.wasLucky).toBe(false);
      expect(result.bonusAmount).toBeUndefined();
    });
  });

  describe('Training Affordability', () => {
    it('returns true when player has enough love', () => {
      const canAfford = canAffordTraining(10, 'box_factory', 0);
      expect(canAfford).toBe(true);
    });

    it('returns false when player does not have enough love', () => {
      const canAfford = canAffordTraining(1, 'box_factory', 0);
      expect(canAfford).toBe(false);
    });
  });

  describe('Experience Requirements for Promotion', () => {
    it('returns correct experience requirement for first job level', () => {
      const required = getExperienceRequiredForPromotion(jobData, 'box_factory', 0);
      expect(required).toBe(3); // Unpaid Intern requires 3 experience
    });

    it('returns correct experience requirement for higher job levels', () => {
      const required = getExperienceRequiredForPromotion(jobData, 'box_factory', 1);
      expect(required).toBe(5); // Box Folder requires 5 experience
    });

    it('returns null when at max level', () => {
      const maxLevel = jobData.find(j => j.id === 'box_factory')!.levels.length;
      const required = getExperienceRequiredForPromotion(jobData, 'box_factory', maxLevel);
      expect(required).toBeNull();
    });

    it('returns null for unknown job', () => {
      const required = getExperienceRequiredForPromotion(jobData, 'unknown_job', 0);
      expect(required).toBeNull();
    });
  });

  describe('Promotion Eligibility', () => {
    it('allows promotion when experience requirement is met exactly', () => {
      const canPromote = canPromoteToNextLevel(jobData, 'box_factory', 0, 3);
      expect(canPromote).toBe(true);
    });

    it('allows promotion when experience exceeds requirement', () => {
      const canPromote = canPromoteToNextLevel(jobData, 'box_factory', 0, 5);
      expect(canPromote).toBe(true);
    });

    it('blocks promotion when experience requirement is not met', () => {
      const canPromote = canPromoteToNextLevel(jobData, 'box_factory', 0, 2);
      expect(canPromote).toBe(false);
    });

    it('blocks promotion at max level', () => {
      const maxLevel = jobData.find(j => j.id === 'box_factory')!.levels.length;
      const canPromote = canPromoteToNextLevel(jobData, 'box_factory', maxLevel, 1000);
      expect(canPromote).toBe(false);
    });

    it('blocks promotion for unknown job', () => {
      const canPromote = canPromoteToNextLevel(jobData, 'unknown_job', 0, 100);
      expect(canPromote).toBe(false);
    });
  });

  describe('Job Configuration', () => {
    it('returns correct config for known job', () => {
      const config = getTrainingConfig('box_factory');
      expect(config).toHaveProperty('baseLoveCost');
      expect(config).toHaveProperty('baseExperienceGain');
      expect(config).toHaveProperty('randomnessRange');
      expect(config).toHaveProperty('luckChance');
      expect(config).toHaveProperty('luckMultiplier');
    });

    it('returns default config for unknown job', () => {
      const config = getTrainingConfig('unknown_job');
      expect(config.baseLoveCost).toBe(15); // Updated default base cost for incremental game scaling
      expect(config.baseExperienceGain).toBe(4);
    });
  });

  describe('System Integration', () => {
    it('maintains consistency between training cost and affordability check', () => {
      const experience = 10;
      const love = 5;
      
      const cost = calculateTrainingCost('box_factory', experience);
      const canAfford = canAffordTraining(love, 'box_factory', experience);
      
      expect(canAfford).toBe(love >= cost);
    });

    it('training and promotion work together correctly', () => {
      let experience = 0;
      let love = 10;
      
      // Should not be able to promote initially
      expect(canPromoteToNextLevel(jobData, 'box_factory', 0, experience)).toBe(false);
      
      // Train until we have enough experience
      while (experience < 3 && love > 0) {
        const trainingResult = performTraining('box_factory', experience);
        love -= trainingResult.loveCost;
        experience += trainingResult.experienceGained;
      }
      
      // Should now be able to promote
      expect(canPromoteToNextLevel(jobData, 'box_factory', 0, experience)).toBe(true);
    });

    it('experience requirements increase with job level', () => {
      const firstJobReq = getExperienceRequiredForPromotion(jobData, 'box_factory', 0);
      const secondJobReq = getExperienceRequiredForPromotion(jobData, 'box_factory', 1);
      const thirdJobReq = getExperienceRequiredForPromotion(jobData, 'box_factory', 2);
      
      expect(firstJobReq).not.toBeNull();
      expect(secondJobReq).not.toBeNull();
      expect(thirdJobReq).not.toBeNull();
      
      if (firstJobReq && secondJobReq && thirdJobReq) {
        expect(secondJobReq).toBeGreaterThan(firstJobReq);
        expect(thirdJobReq).toBeGreaterThan(secondJobReq);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles negative experience values gracefully', () => {
      expect(() => calculateTrainingCost('box_factory', -5)).not.toThrow();
      expect(() => performTraining('box_factory', -5)).not.toThrow();
      expect(() => canAffordTraining(10, 'box_factory', -5)).not.toThrow();
    });

    it('handles zero love values correctly', () => {
      const canAfford = canAffordTraining(0, 'box_factory', 0);
      expect(canAfford).toBe(false);
    });

    it('handles very high experience values', () => {
      const cost = calculateTrainingCost('box_factory', 1000);
      expect(cost).toBeGreaterThan(2); // Should scale with experience
      expect(isFinite(cost)).toBe(true); // Should not be infinite
    });
  });

  describe('Regression Prevention', () => {
    it('ensures UI/backend consistency - promotion logic matches experience requirements', () => {
      // This test specifically prevents the bug we just fixed where UI showed
      // promotions as experience-based but backend required love payment
      
      const jobId = 'box_factory';
      const level = 0;
      const experience = 5; // More than required (3)
      
      // Backend promotion check (what handlePromotion uses)
      const backendCanPromote = canPromoteToNextLevel(jobData, jobId, level, experience);
      
      // UI promotion check (what JobPanel displays)
      const requiredExperience = getExperienceRequiredForPromotion(jobData, jobId, level);
      const uiCanPromote = requiredExperience !== null && experience >= requiredExperience;
      
      // These MUST match - if they don't, we have a UI/backend mismatch
      expect(backendCanPromote).toBe(uiCanPromote);
      expect(backendCanPromote).toBe(true); // Should be promotable with 5 experience
    });

    it('verifies first job experience requirement prevents immediate promotion', () => {
      // Ensures players cannot immediately get first job without training
      const canPromoteImmediately = canPromoteToNextLevel(jobData, 'box_factory', 0, 0);
      expect(canPromoteImmediately).toBe(false);
      
      // But can promote after minimal training
      const canPromoteAfterTraining = canPromoteToNextLevel(jobData, 'box_factory', 0, 3);
      expect(canPromoteAfterTraining).toBe(true);
    });

    it('validates that all job levels have reasonable experience requirements', () => {
      const boxFactoryJob = jobData.find(j => j.id === 'box_factory')!;
      
      for (let level = 0; level < boxFactoryJob.levels.length; level++) {
        const expReq = boxFactoryJob.levels[level].experienceRequired;
        
        // Experience requirements should be non-negative and reasonable
        expect(expReq).toBeGreaterThanOrEqual(0);
        expect(expReq).toBeLessThan(1000); // Sanity check - not absurdly high
        
        // Each level should require more experience than the previous
        if (level > 0) {
          const prevExpReq = boxFactoryJob.levels[level - 1].experienceRequired;
          expect(expReq).toBeGreaterThan(prevExpReq);
        }
      }
    });
  });
}); 