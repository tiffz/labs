import { describe, test, expect } from 'vitest';
import { calculateBaseLovePerInteraction } from './lovePerInteractionSystem';

describe('lovePerInteractionSystem', () => {
  describe('calculateBaseLovePerInteraction', () => {
    test('returns minimum base love of 1 when current love is 0', () => {
      const result = calculateBaseLovePerInteraction(0);
      expect(result).toBe(1);
    });

    test('returns minimum base love of 1 when current love is negative', () => {
      const result = calculateBaseLovePerInteraction(-100);
      expect(result).toBe(1);
    });

    test('returns 1 for small amounts of current love', () => {
      expect(calculateBaseLovePerInteraction(5)).toBe(1);
      expect(calculateBaseLovePerInteraction(49)).toBe(1);
      expect(calculateBaseLovePerInteraction(99)).toBe(1);
    });

    test('calculates 1% of current love, rounded down', () => {
      expect(calculateBaseLovePerInteraction(100)).toBe(1); // 1% of 100 = 1
      expect(calculateBaseLovePerInteraction(150)).toBe(1); // 1% of 150 = 1.5 → 1
      expect(calculateBaseLovePerInteraction(200)).toBe(2); // 1% of 200 = 2
      expect(calculateBaseLovePerInteraction(250)).toBe(2); // 1% of 250 = 2.5 → 2
      expect(calculateBaseLovePerInteraction(500)).toBe(5); // 1% of 500 = 5
      expect(calculateBaseLovePerInteraction(999)).toBe(9); // 1% of 999 = 9.99 → 9
    });

    test('handles medium to large amounts correctly', () => {
      expect(calculateBaseLovePerInteraction(1000)).toBe(10); // 1% of 1000 = 10
      expect(calculateBaseLovePerInteraction(2500)).toBe(25); // 1% of 2500 = 25
      expect(calculateBaseLovePerInteraction(5000)).toBe(50); // 1% of 5000 = 50
      expect(calculateBaseLovePerInteraction(9999)).toBe(99); // 1% of 9999 = 99.99 → 99
    });

    test('scales without cap based on 1% of current love', () => {
      expect(calculateBaseLovePerInteraction(10000)).toBe(100); // 1% of 10000 = 100
      expect(calculateBaseLovePerInteraction(50000)).toBe(500); // 1% of 50000 = 500
      expect(calculateBaseLovePerInteraction(1000000)).toBe(10000); // 1% of 1M = 10000
      expect(calculateBaseLovePerInteraction(12345678)).toBe(123456); // 1% of 12.3M = 123456
    });
  });

  describe('regression tests', () => {
    test('should not cap love per interaction at 100 (regression for cap bug)', () => {
      // This test captures a specific bug where love per interaction was incorrectly
      // capped at 100, preventing scaling with very high love amounts.
      // The system should always return 1% of current love (rounded down) with no upper limit.
      
      // These values would have been capped at 100 in the buggy version
      expect(calculateBaseLovePerInteraction(15000)).toBe(150); // 1% of 15K = 150 (was capped to 100)
      expect(calculateBaseLovePerInteraction(100000)).toBe(1000); // 1% of 100K = 1000 (was capped to 100)
      expect(calculateBaseLovePerInteraction(500000)).toBe(5000); // 1% of 500K = 5000 (was capped to 100)
      expect(calculateBaseLovePerInteraction(10000000)).toBe(100000); // 1% of 10M = 100K (was capped to 100)
      
      // Edge case: exactly at the old cap threshold
      expect(calculateBaseLovePerInteraction(10000)).toBe(100); // This was the boundary where cap kicked in
      expect(calculateBaseLovePerInteraction(10001)).toBe(100); // Just above boundary should work correctly
    });

    test('should maintain linear scaling for very large love amounts', () => {
      // Verify that the system scales linearly without any artificial limits
      const testCases = [
        { love: 50000, expected: 500 },
        { love: 100000, expected: 1000 },
        { love: 250000, expected: 2500 },
        { love: 1000000, expected: 10000 },
        { love: 5000000, expected: 50000 },
        { love: 50000000, expected: 500000 },
      ];

      testCases.forEach(({ love, expected }) => {
        const result = calculateBaseLovePerInteraction(love);
        expect(result).toBe(expected);
        expect(result).toBe(Math.floor(love * 0.01)); // Always 1% rounded down
      });
    });
  });
});