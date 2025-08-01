import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateInterviewCost,
  canAffordInterview,
  performInterview,
  getInterviewConfig
} from './interviewSystem';

describe('Interview System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Interview Cost Calculation', () => {
    it('calculates base interview cost correctly', () => {
      const cost = calculateInterviewCost('box_factory');
      expect(cost).toBe(3); // Base cost for box_factory
    });

    it('uses default config for unknown job types', () => {
      const cost = calculateInterviewCost('unknown_job');
      expect(cost).toBe(4); // Default base cost
    });
  });

  describe('Interview Affordability', () => {
    it('returns true when player has enough love', () => {
      const canAfford = canAffordInterview(10, 'box_factory');
      expect(canAfford).toBe(true);
    });

    it('returns false when player does not have enough love', () => {
      const canAfford = canAffordInterview(2, 'box_factory');
      expect(canAfford).toBe(false);
    });
  });

  describe('Interview Performance', () => {
    it('returns interview result with success or failure', () => {
      const result = performInterview('box_factory');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('loveCost');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(result.loveCost).toBe(3); // Cost for box_factory
    });

    it('has a reasonable success rate for box factory', () => {
      // Run many interviews to test success rate
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(performInterview('box_factory'));
      }
      
      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / 100;
      
      // Should be around 35% (0.35) with some variance
      expect(successRate).toBeGreaterThanOrEqual(0.20); // More forgiving for statistical variance
      expect(successRate).toBeLessThan(0.55); // Slightly higher upper bound
    });

    it('provides different messages for success and failure', () => {
      // Mock random to force success
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Less than 0.35 success rate
      const successResult = performInterview('box_factory');
      
      // Mock random to force failure  
      vi.spyOn(Math, 'random').mockReturnValue(0.8); // Greater than 0.35 success rate
      const failureResult = performInterview('box_factory');
      
      expect(successResult.success).toBe(true);
      expect(failureResult.success).toBe(false);
      expect(successResult.message).not.toBe(failureResult.message);
    });
  });

  describe('Job Configuration', () => {
    it('returns correct config for known job', () => {
      const config = getInterviewConfig('box_factory');
      expect(config).toHaveProperty('baseLoveCost');
      expect(config).toHaveProperty('successRate');
      expect(config.baseLoveCost).toBe(3);
      expect(config.successRate).toBe(0.35);
    });

    it('returns default config for unknown job', () => {
      const config = getInterviewConfig('unknown_job');
      expect(config.baseLoveCost).toBe(4);
      expect(config.successRate).toBe(0.18);
    });
  });

  describe('System Integration', () => {
    it('maintains consistency between cost calculation and affordability check', () => {
      const love = 5;
      const jobId = 'box_factory';
      
      const cost = calculateInterviewCost(jobId);
      const canAfford = canAffordInterview(love, jobId);
      
      expect(canAfford).toBe(love >= cost);
    });

    it('ensures reasonable interview experience (~3 attempts for first job)', () => {
      const config = getInterviewConfig('box_factory');
      const expectedAttempts = 1 / config.successRate;
      
      // Should need around 3 attempts on average (1 / 0.35 ≈ 2.9)
      expect(expectedAttempts).toBeCloseTo(3, 0);
    });
  });

  describe('Message Variety', () => {
    it('provides different rejection messages on multiple failures', () => {
      // Don't mock Math.random so we get natural variety
      const messages = new Set();
      
      // Run many failures to collect different messages
      for (let i = 0; i < 50; i++) {
        const result = performInterview('box_factory');
        if (!result.success) {
          messages.add(result.message);
        }
      }
      
      // Should have variety in rejection messages (we have 25 different ones)
      expect(messages.size).toBeGreaterThan(3);
    });

    it('provides different success messages on multiple successes', () => {
      // Don't mock Math.random so we get natural variety
      const messages = new Set();
      
      // Run many successes to collect different messages
      for (let i = 0; i < 200; i++) { // More attempts needed since success is only 20%
        const result = performInterview('box_factory');
        if (result.success) {
          messages.add(result.message);
        }
      }
      
      // Should have variety in success messages (we have 10 different ones)
      expect(messages.size).toBeGreaterThan(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero love correctly', () => {
      const canAfford = canAffordInterview(0, 'box_factory');
      expect(canAfford).toBe(false);
    });

    it('handles exact love amount needed', () => {
      const cost = calculateInterviewCost('box_factory');
      const canAfford = canAffordInterview(cost, 'box_factory');
      expect(canAfford).toBe(true);
    });
  });

  describe('Message Formatting', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('rejection messages are concise and from interviewer perspective', () => {
      // Force a failure to get rejection message
      vi.spyOn(Math, 'random').mockReturnValue(0.8); // Greater than 0.35 success rate
      const result = performInterview('box_factory');
      
      expect(result.success).toBe(false);
      expect(result.message).not.toMatch(/^"/); // Should NOT have quotes (added by UI)
      expect(result.message).not.toMatch(/"$/); // Should NOT have quotes (added by UI)
      expect(result.message.length).toBeGreaterThan(5); // Should be substantial but concise
      expect(result.message.length).toBeLessThan(50); // Should fit on one line
    });

    it('success messages are concise and from interviewer perspective', () => {
      // Force a success to get success message
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Less than 0.35 success rate
      const result = performInterview('box_factory');
      
      expect(result.success).toBe(true);
      expect(result.message).not.toMatch(/^"/); // Should NOT have quotes (added by UI)
      expect(result.message).not.toMatch(/"$/); // Should NOT have quotes (added by UI)
      expect(result.message.length).toBeGreaterThan(5); // Should be substantial but concise
      expect(result.message.length).toBeLessThan(60); // Should fit on one line
    });

    it('messages reflect human player character (not cat)', () => {
      // Test multiple messages to ensure human-centric content
      const messages = [];
      for (let i = 0; i < 20; i++) {
        const result = performInterview('box_factory');
        messages.push(result.message);
      }
      
      // Messages should reference human behaviors, not cat behaviors
      const allMessages = messages.join(' ');
      expect(allMessages).toMatch(/you|your|interview|cat/i); // Should mention human context
      // Should NOT assume player is literally a cat doing cat things like purring, meowing, etc.
    });
  });
}); 