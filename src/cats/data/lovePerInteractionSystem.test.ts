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

    test('caps at maximum 100 love per interaction', () => {
      expect(calculateBaseLovePerInteraction(10000)).toBe(100); // 1% of 10000 = 100 (at cap)
      expect(calculateBaseLovePerInteraction(50000)).toBe(100); // 1% of 50000 = 500 → capped to 100
      expect(calculateBaseLovePerInteraction(1000000)).toBe(100); // 1% of 1M = 10000 → capped to 100
    });
  });
});