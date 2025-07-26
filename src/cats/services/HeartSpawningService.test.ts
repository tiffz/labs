import { describe, test, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { HeartSpawningService, type HeartConfig, type HeartSpawningEvents, type HeartVisuals } from './HeartSpawningService';

describe('HeartSpawningService', () => {
  let heartSpawningService: HeartSpawningService;
  let mockOnHeartSpawned: MockedFunction<(heart: HeartVisuals) => void>;
  let mockOnTrackableHeartSet: MockedFunction<(heartId: number | null) => void>;
  let mockEvents: HeartSpawningEvents;

  beforeEach(() => {
    mockOnHeartSpawned = vi.fn();
    mockOnTrackableHeartSet = vi.fn();
    mockEvents = {
      onHeartSpawned: mockOnHeartSpawned,
      onTrackableHeartSet: mockOnTrackableHeartSet,
    };
    heartSpawningService = new HeartSpawningService(mockEvents);
  });

  describe('Heart Count Calculation', () => {
    test('should spawn minimum 1 heart for small love amounts', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 1,
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for the first heart to spawn
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should spawn at least 1 heart
      expect(mockOnHeartSpawned).toHaveBeenCalled();
    });

    test('should spawn multiple hearts for larger love amounts', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 10, // Should spawn 4 hearts (10/2.5 = 4)
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for all delayed hearts to spawn
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should spawn 4 hearts for 10 love
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(4);
    });

    test('should cap hearts at maximum 5 for performance', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 50, // Would normally spawn 20 hearts
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for all delayed hearts to spawn (5 hearts * 100ms delay = 500ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Should cap at 5 hearts
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(5);
    });
  });

  describe('Visual Configuration Differences', () => {
    test('petting hearts should spawn with longer delays', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 5, // Should spawn 2 hearts
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for first heart
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(1);
      
      // Wait for second heart (should take 100ms for petting)
      await new Promise(resolve => setTimeout(resolve, 70));
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(2);
    });

    test('pouncing hearts should spawn with shorter delays', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 5, // Should spawn 2 hearts
        interactionType: 'pouncing'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for first heart
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(1);
      
      // Wait for second heart (should take 50ms for pouncing)
      await new Promise(resolve => setTimeout(resolve, 40));
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(2);
    });

    test('pouncing hearts should have different animation durations than petting', async () => {
      const pettingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting'
      };

      const pouncingConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'pouncing'
      };

      heartSpawningService.spawnHearts(pettingConfig);
      await new Promise(resolve => setTimeout(resolve, 10));
      const pettingHeart = mockOnHeartSpawned.mock.calls[0][0];

      mockOnHeartSpawned.mockClear();

      heartSpawningService.spawnHearts(pouncingConfig);
      await new Promise(resolve => setTimeout(resolve, 10));
      const pouncingHeart = mockOnHeartSpawned.mock.calls[0][0];

      // Petting should be slower (1.2s) than pouncing (0.8s)
      expect(pettingHeart.animationDuration).toBeGreaterThan(pouncingHeart.animationDuration);
    });
  });

  describe('Heart Properties', () => {
    test('should create hearts with correct position and spread', async () => {
      const config: HeartConfig = {
        position: { x: 200, y: 150 },
        loveAmount: 3,
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const heartCall = mockOnHeartSpawned.mock.calls[0];
      const heart = heartCall[0];

      // Heart should be near the original position (within spread distance)
      expect(heart.x).toBeGreaterThan(150);
      expect(heart.x).toBeLessThan(250);
      expect(heart.y).toBeGreaterThan(100);
      expect(heart.y).toBeLessThan(200);
      
      // Should have required properties
      expect(heart).toHaveProperty('id');
      expect(heart).toHaveProperty('scale');
      expect(heart).toHaveProperty('rotation');
      expect(heart).toHaveProperty('translateX');
      expect(heart).toHaveProperty('animationDuration');
    });

    test('should scale hearts based on love amount', async () => {
      const smallLoveConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 1,
        interactionType: 'petting'
      };

      const largeLoveConfig: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 10,
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(smallLoveConfig);
      await new Promise(resolve => setTimeout(resolve, 10));
      const smallHeart = mockOnHeartSpawned.mock.calls[0][0];

      mockOnHeartSpawned.mockClear();

      heartSpawningService.spawnHearts(largeLoveConfig);
      await new Promise(resolve => setTimeout(resolve, 10));
      const largeHeart = mockOnHeartSpawned.mock.calls[0][0];

      // Larger love amount should produce larger hearts
      expect(largeHeart.scale).toBeGreaterThan(smallHeart.scale);
    });

    test('should ensure unique heart IDs', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 5, // Should spawn 2 hearts
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const firstHeartId = mockOnHeartSpawned.mock.calls[0][0].id;
      
      // Spawn another set
      heartSpawningService.spawnHearts(config);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const secondHeartId = mockOnHeartSpawned.mock.calls[1][0].id;
      
      // IDs should be unique
      expect(firstHeartId).not.toBe(secondHeartId);
    });
  });

  describe('Trackable Hearts', () => {
    test('should set trackable heart for any spawn', () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(expect.any(Number));
    });

    test('should clear trackable heart after delay', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(null);
    });

    test('should not set trackable heart when no hearts spawn', () => {
      // This shouldn't happen in practice, but test edge case
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 0, // Edge case
        interactionType: 'petting'
      };

      heartSpawningService.spawnHearts(config);
      
      // Still should spawn minimum 1 heart and set trackable
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero love amount gracefully', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 0,
        interactionType: 'petting'
      };

      expect(() => {
        heartSpawningService.spawnHearts(config);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should spawn minimum 1 heart
      expect(mockOnHeartSpawned).toHaveBeenCalled();
    });

    test('should handle negative love amount gracefully', async () => {
      const config: HeartConfig = {
        position: { x: 100, y: 100 },
        loveAmount: -5,
        interactionType: 'petting'
      };

      expect(() => {
        heartSpawningService.spawnHearts(config);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should spawn minimum 1 heart
      expect(mockOnHeartSpawned).toHaveBeenCalled();
    });

    test('should handle extreme position values', async () => {
      const config: HeartConfig = {
        position: { x: -1000, y: 10000 },
        loveAmount: 3,
        interactionType: 'petting'
      };

      expect(() => {
        heartSpawningService.spawnHearts(config);
      }).not.toThrow();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const heart = mockOnHeartSpawned.mock.calls[0][0];
      expect(heart.x).toBeDefined();
      expect(heart.y).toBeDefined();
    });
  });
}); 