import { describe, test, expect } from 'vitest';
import { calculateFinalLoveGain } from '../systems/lovePerInteractionSystem';

describe('Love Calculation Integration Tests', () => {
  describe('pouncing and playing love calculation regression', () => {
    test('should use base love per interaction system instead of hardcoded values (regression for pouncing/playing bug)', () => {
      // This test ensures that pouncing and playing use the dynamic love per interaction system
      // instead of hardcoded values like "2" for pouncing and "1" for playing
      
      const testCases = [
        {
          baseLovePerInteraction: 1,
          interactionType: 'pouncing' as const,
          expectedMinimum: 2, // Should be 2x base (pouncing multiplier)
        },
        {
          baseLovePerInteraction: 100,
          interactionType: 'pouncing' as const,
          expectedMinimum: 200, // Should be 2x base (pouncing multiplier)
        },
        {
          baseLovePerInteraction: 1000,
          interactionType: 'pouncing' as const,
          expectedMinimum: 2000, // Should be 2x base (pouncing multiplier)
        },
        {
          baseLovePerInteraction: 10000,
          interactionType: 'pouncing' as const,
          expectedMinimum: 20000, // Should be 2x base (pouncing multiplier)
        },
        {
          baseLovePerInteraction: 1000,
          interactionType: 'playing_during_wand' as const,
          expectedMinimum: 1000, // Should be 1x base (same as petting)
        },
      ];

      testCases.forEach(({ baseLovePerInteraction, interactionType, expectedMinimum }) => {
        const energyMultiplier = 1.5; // 50% energy boost
        const meritMultipliers = {
          lovePetMultiplier: 1,
          lovePounceMultiplier: 1,
          loveInteractionMultiplier: 1,
        };

        const result = calculateFinalLoveGain(
          baseLovePerInteraction,
          interactionType,
          energyMultiplier,
          meritMultipliers
        );

        // The result should scale with the base love per interaction
        // Not be a fixed hardcoded value regardless of base
        const expectedBase = Math.round(expectedMinimum * energyMultiplier);
        expect(result).toBe(expectedBase);
        
        // Verify it's not just a hardcoded value
        expect(result).toBeGreaterThanOrEqual(expectedMinimum);
      });
    });

    test('should scale proportionally with very high base love amounts', () => {
      // Verify that the system works correctly even with very high love amounts
      // that the user might have in late game
      
      const veryHighBaseLove = 1050154; // User's reported value
      const energyMultiplier = 2.0; // 100% energy
      const meritMultipliers = {
        lovePetMultiplier: 1.5, // 50% bonus
        lovePounceMultiplier: 2.0, // 100% bonus
        loveInteractionMultiplier: 1.2, // 20% bonus
      };

      // Test pouncing with high values
      const pounceLove = calculateFinalLoveGain(
        veryHighBaseLove,
        'pouncing',
        energyMultiplier,
        meritMultipliers
      );

      // Should be: base * 2 (pouncing) * 2 (energy) * 2 (pounce bonus) * 1.2 (global bonus)
      const expectedPounce = Math.round(veryHighBaseLove * 2 * energyMultiplier * meritMultipliers.lovePounceMultiplier * meritMultipliers.loveInteractionMultiplier);
      expect(pounceLove).toBe(expectedPounce);
      
      // Test playing during wand with high values
      const playLove = calculateFinalLoveGain(
        veryHighBaseLove,
        'playing_during_wand',
        energyMultiplier,
        meritMultipliers
      );

      // Should be: base * 1 (playing) * 2 (energy) * 1.5 (pet bonus) * 1.2 (global bonus)
      const expectedPlay = Math.round(veryHighBaseLove * 1 * energyMultiplier * meritMultipliers.lovePetMultiplier * meritMultipliers.loveInteractionMultiplier);
      expect(playLove).toBe(expectedPlay);
      
      // Verify these are much larger than the old hardcoded values (2 and 1)
      expect(pounceLove).toBeGreaterThan(1000000); // Much larger than hardcoded "2"
      expect(playLove).toBeGreaterThan(1000000);   // Much larger than hardcoded "1"
    });

    test('should maintain correct multiplier relationships', () => {
      // Verify that the relationships between different interaction types are maintained
      
      const baseLove = 1000;
      const energyMultiplier = 1.5;
      const meritMultipliers = {
        lovePetMultiplier: 1,
        lovePounceMultiplier: 1,
        loveInteractionMultiplier: 1,
      };

      const pettingLove = calculateFinalLoveGain(baseLove, 'petting', energyMultiplier, meritMultipliers);
      const pouncingLove = calculateFinalLoveGain(baseLove, 'pouncing', energyMultiplier, meritMultipliers);
      const playingLove = calculateFinalLoveGain(baseLove, 'playing_during_wand', energyMultiplier, meritMultipliers);

      // Pouncing should give exactly 2x the love of petting/playing
      expect(pouncingLove).toBe(pettingLove * 2);
      expect(pouncingLove).toBe(playingLove * 2);
      
      // Petting and playing during wand should give the same amount
      expect(pettingLove).toBe(playingLove);
    });
  });
});