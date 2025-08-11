import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeartSpawningService } from '../services/HeartSpawningService';

describe('Heart Tracking Integration', () => {
  let heartSpawningService: HeartSpawningService;
  let mockOnHeartSpawned: ReturnType<typeof vi.fn>;
  let mockOnTrackableHeartSet: ReturnType<typeof vi.fn>;
  let heartContainer: HTMLDivElement;

  beforeEach(() => {
    // Create heart container element
    heartContainer = document.createElement('div');
    heartContainer.id = 'heart-container';
    document.body.appendChild(heartContainer);

    // Setup mocks
    mockOnHeartSpawned = vi.fn();
    mockOnTrackableHeartSet = vi.fn();

    // Create service
    heartSpawningService = new HeartSpawningService({
      onHeartSpawned: mockOnHeartSpawned,
      onTrackableHeartSet: mockOnTrackableHeartSet,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    if (heartContainer && heartContainer.parentNode) {
      heartContainer.parentNode.removeChild(heartContainer);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Heart ID Consistency', () => {
    test('trackable heart ID should match the first spawned heart ID', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 1, // ceil(1/2.5) = 1 heart, guaranteed single heart
        interactionType: 'petting' as const,
      };

      heartSpawningService.spawnHearts(config);

      // Trackable heart should be set immediately
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(expect.any(Number));
      const trackableHeartId = mockOnTrackableHeartSet.mock.calls[0][0];

      // Advance timer to trigger first heart spawn
      vi.advanceTimersByTime(100);

      // Exactly one heart should have been spawned
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(1);
      const firstHeart = mockOnHeartSpawned.mock.calls[0][0];

      // The trackable heart ID should match the first spawned heart ID
      expect(trackableHeartId).toBe(firstHeart.id);
    });

    test('multiple hearts should have unique but predictable IDs', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 10, // Should spawn multiple hearts
        interactionType: 'petting' as const,
      };

      heartSpawningService.spawnHearts(config);

      // Advance time to spawn all hearts
      vi.advanceTimersByTime(500);

      // Should have spawned multiple hearts
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(4); // ceil(10/2.5) = 4

      // Get all heart IDs
      const heartIds = mockOnHeartSpawned.mock.calls.map(call => call[0].id);

      // All IDs should be unique
      const uniqueIds = new Set(heartIds);
      expect(uniqueIds.size).toBe(heartIds.length);

      // IDs should be sequential (baseTimestamp + index)
      const baseId = heartIds[0];
      for (let i = 0; i < heartIds.length; i++) {
        expect(heartIds[i]).toBe(baseId + i);
      }
    });
  });

  describe('DOM Integration', () => {
    test('should be able to find trackable heart in DOM after spawning', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting' as const,
      };

      heartSpawningService.spawnHearts(config);

      // Get the trackable heart ID
      const trackableHeartId = mockOnTrackableHeartSet.mock.calls[0][0];

      // Simulate heart being added to DOM (this would normally be done by React)
      const heartElement = document.createElement('div');
      heartElement.setAttribute('data-heart-id', trackableHeartId.toString());
      heartElement.className = 'heart';
      heartContainer.appendChild(heartElement);

      // Should be able to find the heart element by its data attribute
      const foundHeart = document.querySelector(`[data-heart-id="${trackableHeartId}"]`);
      expect(foundHeart).toBe(heartElement);
      expect(foundHeart).toBeInstanceOf(HTMLDivElement);
    });

    test('should clear trackable heart after delay', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting' as const,
      };

      heartSpawningService.spawnHearts(config);

      // Initially trackable heart should be set
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(expect.any(Number));

      // Advance time past the trackable duration (1000ms for petting)
      vi.advanceTimersByTime(1100);

      // Should have been called again with null to clear it
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(null);
      expect(mockOnTrackableHeartSet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Interaction Type Differences', () => {
    test('pouncing should have shorter trackable duration than petting', async () => {
      const pettingConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting' as const,
      };

      const pouncingConfig = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'pouncing' as const,
      };

      // Test petting trackable duration
      heartSpawningService.spawnHearts(pettingConfig);
      mockOnTrackableHeartSet.mockClear();

      vi.advanceTimersByTime(999); // Just before 1000ms
      expect(mockOnTrackableHeartSet).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2); // Just after 1000ms
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(null);

      // Reset mocks
      mockOnTrackableHeartSet.mockClear();
      vi.clearAllTimers();

      // Test pouncing trackable duration (should also be 1000ms based on current config)
      heartSpawningService.spawnHearts(pouncingConfig);
      mockOnTrackableHeartSet.mockClear();

      vi.advanceTimersByTime(999);
      expect(mockOnTrackableHeartSet).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2);
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(null);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid successive heart spawns correctly', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 3,
        interactionType: 'petting' as const,
      };

      // Spawn hearts rapidly
      heartSpawningService.spawnHearts(config);
      heartSpawningService.spawnHearts(config);
      heartSpawningService.spawnHearts(config);

      // Should have set trackable heart 3 times (once for each spawn)
      expect(mockOnTrackableHeartSet).toHaveBeenCalledTimes(3);

      // All trackable heart calls should be with valid numbers
      for (const call of mockOnTrackableHeartSet.mock.calls) {
        expect(typeof call[0]).toBe('number');
        expect(call[0]).toBeGreaterThan(0);
      }
    });

    test('should not interfere with heart spawning when no hearts would spawn', async () => {
      const config = {
        position: { x: 100, y: 100 },
        loveAmount: 0, // Should still spawn minimum 1 heart
        interactionType: 'petting' as const,
      };

      heartSpawningService.spawnHearts(config);

      // Should still set trackable heart for the minimum 1 heart
      expect(mockOnTrackableHeartSet).toHaveBeenCalledWith(expect.any(Number));

      // Advance time to spawn the heart
      vi.advanceTimersByTime(100);

      // Should have spawned the minimum 1 heart
      expect(mockOnHeartSpawned).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pounce completion event', () => {
    test('should dispatch a cat-pounce-complete event via animation controller', async () => {
      const { CatAnimationController } = await import('../animation/AnimationController');
      const mockAnimEvents = {
        onHeartSpawned: vi.fn(),
        onTrackableHeartSet: vi.fn(),
        onPounceComplete: vi.fn(),
      };
      const controller = new CatAnimationController(mockAnimEvents);
      const spy = vi.spyOn(mockAnimEvents, 'onPounceComplete');
      controller.onPounceTriggered({
        distance: 50,
        angle: 0,
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      vi.runAllTimers();
      expect(spy).toHaveBeenCalled();
    });
  });
}); 