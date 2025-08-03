import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CatGameStateManager, type CatGameEvents } from './GameState';

describe('Click Excitement System', () => {
  let gameState: CatGameStateManager;
  let mockEvents: CatGameEvents;

  beforeEach(() => {
    mockEvents = {
      onPounceTriggered: vi.fn(),
      onPlayingTriggered: vi.fn(),
      onLoveGained: vi.fn(),
      onTreatsGained: vi.fn(),
    };
    gameState = new CatGameStateManager({}, mockEvents);
  });

  describe('Click Excitement Accumulation', () => {
    test('should start with zero click excitement', () => {
      expect(gameState.getState().clickExcitement).toBe(0);
    });

    test('should accumulate click excitement when clicking in wand mode', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      const initialExcitement = gameState.getState().clickExcitement;
      actions.processWandClick(Date.now());
      
      expect(gameState.getState().clickExcitement).toBeGreaterThan(initialExcitement);
    });

    test('should not accumulate click excitement outside wand mode', () => {
      const actions = gameState.getActions();
      
      expect(gameState.getState().wandMode).toBe(false);
      
      const initialExcitement = gameState.getState().clickExcitement;
      actions.processWandClick(Date.now());
      
      // Should remain at 0 because wand mode is off
      expect(gameState.getState().clickExcitement).toBe(initialExcitement);
    });

    test('should accumulate excitement from multiple rapid clicks', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const timestamp = Date.now();
      
      actions.processWandClick(timestamp);
      const firstClickExcitement = gameState.getState().clickExcitement;
      
      actions.processWandClick(timestamp + 50);
      const secondClickExcitement = gameState.getState().clickExcitement;
      
      actions.processWandClick(timestamp + 100);
      const thirdClickExcitement = gameState.getState().clickExcitement;
      
      expect(secondClickExcitement).toBeGreaterThan(firstClickExcitement);
      expect(thirdClickExcitement).toBeGreaterThan(secondClickExcitement);
    });

    test('should cap click excitement at 100', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const timestamp = Date.now();
      
      // Spam clicks to try to exceed cap
      for (let i = 0; i < 50; i++) {
        actions.processWandClick(timestamp + i * 10);
      }
      
      expect(gameState.getState().clickExcitement).toBeLessThanOrEqual(100);
    });
  });

  describe('Proximity Multiplier Integration', () => {
    test('should scale click excitement by proximity multiplier', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Simulate wand far from cat (low proximity)
      actions.processWandMovement({ x: 1000, y: 1000 }, Date.now());
      const farProximity = gameState.getState().proximityMultiplier;
      
      const farClickTimestamp = Date.now();
      actions.processWandClick(farClickTimestamp);
      const farExcitement = gameState.getState().clickExcitement;
      
      // Reset excitement
      gameState['state'].clickExcitement = 0;
      
      // Simulate wand close to cat (high proximity)
      actions.processWandMovement({ x: 200, y: 200 }, farClickTimestamp + 100);
      const closeProximity = gameState.getState().proximityMultiplier;
      
      const closeClickTimestamp = farClickTimestamp + 200;
      actions.processWandClick(closeClickTimestamp);
      const closeExcitement = gameState.getState().clickExcitement;
      
      // Close clicks should generate more excitement due to higher proximity
      expect(closeProximity).toBeGreaterThan(farProximity);
      expect(closeExcitement).toBeGreaterThan(farExcitement);
    });
  });

  describe('Time-Based Decay', () => {
    test('should not decay immediately after clicking', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const clickTime = Date.now();
      actions.processWandClick(clickTime);
      const excitementAfterClick = gameState.getState().clickExcitement;
      
      // Process some movement immediately after click (within 500ms protection window)
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 100);
      
      // Should not have decayed yet
      expect(gameState.getState().clickExcitement).toBe(excitementAfterClick);
    });

    test('should start decaying after 500ms delay', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const clickTime = Date.now();
      actions.processWandClick(clickTime);
      const excitementAfterClick = gameState.getState().clickExcitement;
      
      // Process movement after 600ms (beyond protection window)
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 600);
      
      // Should have started decaying
      expect(gameState.getState().clickExcitement).toBeLessThan(excitementAfterClick);
    });

    test('should decay proportional to time elapsed', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const clickTime = Date.now();
      
      // Set initial excitement manually to test decay
      gameState['state'].clickExcitement = 50;
      gameState['state'].lastClickTime = clickTime;
      
      // Short decay time (1 second)
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 1000);
      const shortDecayExcitement = gameState.getState().clickExcitement;
      
      // Reset to same excitement level
      gameState['state'].clickExcitement = 50;
      gameState['state'].lastClickTime = clickTime;
      
      // Longer decay time (3 seconds)
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 3000);
      const longDecayExcitement = gameState.getState().clickExcitement;
      
      // Longer time should result in more decay (lower excitement)
      expect(longDecayExcitement).toBeLessThan(shortDecayExcitement);
    });

    test('should cap decay at 5 seconds', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const clickTime = Date.now();
      
      // Set initial excitement manually to test decay
      gameState['state'].clickExcitement = 50;
      gameState['state'].lastClickTime = clickTime;
      
      // Very long time should cap at 5 seconds of decay
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 10000 + 500); // 10 seconds past click
      const veryLongDecayExcitement = gameState.getState().clickExcitement;
      
      // Reset to same excitement level
      gameState['state'].clickExcitement = 50;
      gameState['state'].lastClickTime = clickTime;
      
      // Exactly 5.5 seconds past click (should be equivalent to 5 seconds of decay)
      actions.processWandMovement({ x: 200, y: 200 }, clickTime + 6000); // 6 seconds past click = 5.5 seconds decay
      const cappedDecayExcitement = gameState.getState().clickExcitement;
      
      // Both should have same decay amount (capped at 5 seconds)
      expect(Math.abs(veryLongDecayExcitement - cappedDecayExcitement)).toBeLessThan(2);
    });

    test('should never decay below zero', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Set small excitement
      gameState['state'].clickExcitement = 1;
      gameState['state'].lastClickTime = Date.now() - 1000;
      
      // Very long decay should not go negative
      actions.processWandMovement({ x: 200, y: 200 }, Date.now() + 10000);
      
      expect(gameState.getState().clickExcitement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Pounce Confidence', () => {
    test('should contribute click excitement to pounce confidence', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Build up click excitement
      const timestamp = Date.now();
      actions.processWandClick(timestamp);
      actions.processWandClick(timestamp + 100);
      
      const excitementLevel = gameState.getState().clickExcitement;
      expect(excitementLevel).toBeGreaterThan(0);
      
      const initialConfidence = gameState.getState().pounceConfidence;
      
      // Process movement to trigger confidence calculation
      actions.processWandMovement({ x: 200, y: 200 }, timestamp + 200);
      
      const finalConfidence = gameState.getState().pounceConfidence;
      
      // Confidence should have increased due to click excitement contribution
      expect(finalConfidence).toBeGreaterThan(initialConfidence);
    });

    test('should combine click excitement with movement confidence', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const timestamp = Date.now();
      
      // Movement only (no clicks)
      actions.processWandMovement({ x: 200, y: 200 }, timestamp);
      actions.processWandMovement({ x: 220, y: 220 }, timestamp + 50);
      const movementOnlyConfidence = gameState.getState().pounceConfidence;
      
      // Reset and do clicks + movement
      gameState['state'].pounceConfidence = 0;
      actions.processWandClick(timestamp + 100);
      actions.processWandClick(timestamp + 150);
      actions.processWandMovement({ x: 200, y: 200 }, timestamp + 200);
      actions.processWandMovement({ x: 220, y: 220 }, timestamp + 250);
      const combinedConfidence = gameState.getState().pounceConfidence;
      
      // Combined should be higher than movement only
      expect(combinedConfidence).toBeGreaterThan(movementOnlyConfidence);
    });

    test('should use 30% of click excitement as contribution', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Set known click excitement level
      gameState['state'].clickExcitement = 60; // Should contribute 18 (30%)
      gameState['state'].lastClickTime = Date.now() - 100; // Recent enough to not decay
      
      const initialConfidence = gameState.getState().pounceConfidence;
      
      // Minimal movement to trigger calculation without adding much movement confidence
      actions.processWandMovement({ x: 200, y: 200 }, Date.now());
      
      const finalConfidence = gameState.getState().pounceConfidence;
      const confidenceGain = finalConfidence - initialConfidence;
      
      // Should be roughly 18 (30% of 60) + minimal movement confidence
      // Being lenient with the check since movement also contributes some
      expect(confidenceGain).toBeGreaterThan(15);
      expect(confidenceGain).toBeLessThan(25);
    });
  });

  describe('Last Click Time Tracking', () => {
    test('should update last click time on each click', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const firstClickTime = Date.now();
      actions.processWandClick(firstClickTime);
      expect(gameState.getState().lastClickTime).toBe(firstClickTime);
      
      const secondClickTime = firstClickTime + 500;
      actions.processWandClick(secondClickTime);
      expect(gameState.getState().lastClickTime).toBe(secondClickTime);
    });

    test('should initialize last click time to 0', () => {
      expect(gameState.getState().lastClickTime).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid clicks without errors', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const timestamp = Date.now();
      
      expect(() => {
        for (let i = 0; i < 100; i++) {
          actions.processWandClick(timestamp + i);
        }
      }).not.toThrow();
    });

    test('should handle clicks with identical timestamps', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const timestamp = Date.now();
      
      expect(() => {
        actions.processWandClick(timestamp);
        actions.processWandClick(timestamp);
        actions.processWandClick(timestamp);
      }).not.toThrow();
      
      expect(gameState.getState().clickExcitement).toBeGreaterThan(0);
    });

    test('should handle movement processing without prior clicks', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      expect(() => {
        actions.processWandMovement({ x: 200, y: 200 }, Date.now());
      }).not.toThrow();
      
      expect(gameState.getState().clickExcitement).toBe(0);
    });
  });
}); 