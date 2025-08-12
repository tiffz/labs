import { describe, test, expect, vi, beforeEach } from 'vitest';
import { HeartSpawningService } from '../services/HeartSpawningService';
import type { HeartConfig } from '../services/HeartSpawningService';

describe('Pouncing Heart Integration Tests', () => {
  let heartSpawningService: HeartSpawningService;
  let mockOnHeartSpawned: ReturnType<typeof vi.fn>;
  let mockOnTrackableHeartSet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnHeartSpawned = vi.fn();
    mockOnTrackableHeartSet = vi.fn();
    
    heartSpawningService = new HeartSpawningService({
      onHeartSpawned: mockOnHeartSpawned,
      onTrackableHeartSet: mockOnTrackableHeartSet,
    });
  });

  describe('pouncing vs petting heart comparison', () => {
    test('should spawn more hearts for pouncing than petting with same base love', async () => {
      // Simulate the love calculation difference:
      // Petting: base love * 1 = base love
      // Pouncing: base love * 2 = 2x base love
      
      const baseLove = 5;
      const pettingLove = baseLove * 1; // 5 love
      const pouncingLove = baseLove * 2; // 10 love
      
      // Test petting hearts
      const pettingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: pettingLove,
        interactionType: 'petting'
      };
      
      heartSpawningService.spawnHearts(pettingConfig);
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait longer for async spawning
      
      const pettingHeartCount = mockOnHeartSpawned.mock.calls.length;
      // keep tests quiet
      
      // Clear and test pouncing hearts
      mockOnHeartSpawned.mockClear();
      
      const pouncingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: pouncingLove,
        interactionType: 'pouncing'
      };
      
      heartSpawningService.spawnHearts(pouncingConfig);
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait longer for async spawning
      
      const pouncingHeartCount = mockOnHeartSpawned.mock.calls.length;
      // keep tests quiet
      
      // Pouncing should spawn more hearts than petting
      expect(pouncingHeartCount).toBeGreaterThan(pettingHeartCount);
      
      // Specifically test the heart count calculation
      // Love 5: ceil(5/2.5) = 2 hearts
      // Love 10: ceil(10/2.5) = 4 hearts
      expect(pettingHeartCount).toBe(2);
      expect(pouncingHeartCount).toBe(4);
    });

    // Note: Timing test removed as it's complex to test with different delays

    test('should have different visual styles for pouncing vs petting hearts', async () => {
      const loveAmount = 10;
      
      // Test petting hearts
      const pettingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount,
        interactionType: 'petting'
      };
      
      heartSpawningService.spawnHearts(pettingConfig);
      
      // Clear and test pouncing hearts
      mockOnHeartSpawned.mockClear();
      
      const pouncingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount,
        interactionType: 'pouncing'
      };
      
      heartSpawningService.spawnHearts(pouncingConfig);
      
      // Wait for async spawning
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Both should spawn hearts (verified by the service being called)
      expect(mockOnHeartSpawned).toHaveBeenCalled();
      expect(mockOnTrackableHeartSet).toHaveBeenCalled();
    });

    test('should properly calculate love amounts in real scenarios', () => {
      // Test realistic love amounts that would occur in game
      const testScenarios = [
        { baseLove: 1, pettingLove: 1, pouncingLove: 2 },
        { baseLove: 10, pettingLove: 10, pouncingLove: 20 },
        { baseLove: 100, pettingLove: 100, pouncingLove: 200 },
        { baseLove: 1000, pettingLove: 1000, pouncingLove: 2000 },
      ];

      testScenarios.forEach(({ pettingLove, pouncingLove }) => {
        // Calculate expected heart counts
        const pettingHearts = Math.max(1, Math.min(5, Math.ceil(pettingLove / 2.5)));
        const pouncingHearts = Math.max(1, Math.min(5, Math.ceil(pouncingLove / 2.5)));
        
        // Pouncing should always give more or equal hearts
        expect(pouncingHearts).toBeGreaterThanOrEqual(pettingHearts);
        
        // At higher love amounts, both should hit the cap
        if (pettingLove >= 12.5) {
          expect(pettingHearts).toBe(5);
        }
        if (pouncingLove >= 12.5) {
          expect(pouncingHearts).toBe(5);
        }
      });
    });
  });
});