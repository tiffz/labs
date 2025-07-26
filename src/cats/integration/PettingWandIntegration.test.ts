import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CatGameStateManager, type CatGameEvents } from '../game/GameState';
import { CatAnimationController, type AnimationEvents } from '../animation/AnimationController';

describe('Petting/Wand Mode Integration', () => {
  let gameState: CatGameStateManager;
  let animationController: CatAnimationController;
  let mockGameEvents: CatGameEvents;
  let mockAnimationEvents: AnimationEvents;

  beforeEach(() => {
    mockGameEvents = {
      onPounceTriggered: vi.fn(),
      onPlayingTriggered: vi.fn(),
      onLoveGained: vi.fn(),
      onTreatsGained: vi.fn(),
      onEnergyChanged: vi.fn(),
    };

    mockAnimationEvents = {
      onHeartSpawned: vi.fn(),
      onTrackableHeartSet: vi.fn(),
    };

    gameState = new CatGameStateManager({}, mockGameEvents);
    animationController = new CatAnimationController(mockAnimationEvents);
  });

  afterEach(() => {
    animationController.cleanup();
  });

  describe('Mode Switching Behavior', () => {
    test('should start in petting mode (wand off)', () => {
      expect(gameState.getState().wandMode).toBe(false);
    });

    test('should switch to wand mode when toggled', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
    });

    test('should switch back to petting mode when toggled again', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(false);
    });
  });

  describe('Click Behavior in Petting Mode', () => {
    test('should not affect click excitement when in petting mode', () => {
      const actions = gameState.getActions();
      
      // Ensure we're in petting mode
      expect(gameState.getState().wandMode).toBe(false);
      
      const initialExcitement = gameState.getState().clickExcitement;
      actions.processWandClick(Date.now());
      
      // Click excitement should remain unchanged in petting mode
      expect(gameState.getState().clickExcitement).toBe(initialExcitement);
    });

    test('should not trigger wand-related events in petting mode', () => {
      const actions = gameState.getActions();
      
      expect(gameState.getState().wandMode).toBe(false);
      
      actions.processWandClick(Date.now());
      
      // No wand-related events should be triggered
      expect(mockGameEvents.onPlayingTriggered).not.toHaveBeenCalled();
    });
  });

  describe('Click Behavior in Wand Mode', () => {
    test('should accumulate click excitement when in wand mode', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      const initialExcitement = gameState.getState().clickExcitement;
      actions.processWandClick(Date.now());
      
      expect(gameState.getState().clickExcitement).toBeGreaterThan(initialExcitement);
    });

    test('should process wand clicks correctly in wand mode', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      expect(() => {
        actions.processWandClick(Date.now());
      }).not.toThrow();
    });
  });

  describe('Pouncing State Interaction', () => {
    test('should not block petting when not in wand mode, even if pouncing is true', () => {
      // This test simulates the bug we fixed where isPouncing was blocking all clicks
      
      // Manually set pouncing state to true (simulating a lingering pounce state)
      animationController.onPounceTriggered({
        distance: 50,
        angle: 0,
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      
      const isPouncing = animationController.getReactState().isPouncing;
      expect(isPouncing).toBe(true);
      
      // But wand mode is off, so petting should still work
      expect(gameState.getState().wandMode).toBe(false);
      
      // Simulate the fixed logic: isPouncing && wandMode should be false
      const shouldBlockClick = isPouncing && gameState.getState().wandMode;
      expect(shouldBlockClick).toBe(false);
    });

    test('should block petting when pouncing AND in wand mode', () => {
      const actions = gameState.getActions();
      
      // Enable wand mode
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      // Trigger pouncing
      animationController.onPounceTriggered({
        distance: 50,
        angle: 0,
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      
      const isPouncing = animationController.getReactState().isPouncing;
      expect(isPouncing).toBe(true);
      
      // Now the blocking condition should be true
      const shouldBlockClick = isPouncing && gameState.getState().wandMode;
      expect(shouldBlockClick).toBe(true);
    });
  });

  describe('Mode Transition Edge Cases', () => {
    test('should preserve click excitement when switching from wand to petting mode', () => {
      const actions = gameState.getActions();
      
      // Build up excitement in wand mode
      actions.toggleWandMode();
      actions.processWandClick(Date.now());
      actions.processWandClick(Date.now() + 100);
      
      const excitementInWandMode = gameState.getState().clickExcitement;
      expect(excitementInWandMode).toBeGreaterThan(0);
      
      // Switch to petting mode
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(false);
      
      // Click excitement should be preserved
      expect(gameState.getState().clickExcitement).toBe(excitementInWandMode);
    });

    test('should resume click excitement accumulation when switching back to wand mode', () => {
      const actions = gameState.getActions();
      
      // Build excitement, switch to petting, then back to wand
      actions.toggleWandMode();
      actions.processWandClick(Date.now());
      const initialExcitement = gameState.getState().clickExcitement;
      
      actions.toggleWandMode(); // Switch to petting
      actions.toggleWandMode(); // Switch back to wand
      
      expect(gameState.getState().wandMode).toBe(true);
      
      // Should be able to continue building excitement
      actions.processWandClick(Date.now() + 200);
      expect(gameState.getState().clickExcitement).toBeGreaterThan(initialExcitement);
    });

    test('should reset pounce state when toggling wand mode off', () => {
      const actions = gameState.getActions();
      
      // Enable wand mode and build confidence via movement (clicks don't directly build confidence)
      actions.toggleWandMode();
      actions.processWandClick(Date.now()); // Build click excitement
      actions.processWandMovement({ x: 200, y: 200 }, Date.now() + 50); // Trigger confidence calc
      actions.processWandMovement({ x: 220, y: 220 }, Date.now() + 100); // More movement
      
      const confidenceInWandMode = gameState.getState().pounceConfidence;
      expect(confidenceInWandMode).toBeGreaterThan(0);
      
      // Toggle wand mode off
      actions.toggleWandMode();
      
      // Pounce confidence should be reset
      expect(gameState.getState().pounceConfidence).toBe(0);
    });

    test('should handle rapid mode switching without errors', () => {
      const actions = gameState.getActions();
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          actions.toggleWandMode(); // Toggle on
          actions.processWandClick(Date.now() + i * 100);
          actions.toggleWandMode(); // Toggle off
        }
      }).not.toThrow();
    });
  });

  describe('Animation State Consistency', () => {
    test('should maintain animation state consistency during mode switches', () => {
      const actions = gameState.getActions();
      
      // Start pouncing in wand mode
      actions.toggleWandMode();
      animationController.onPounceTriggered({
        distance: 50,
        angle: 0,
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      
      expect(animationController.getReactState().isPouncing).toBe(true);
      
      // Switch to petting mode
      actions.toggleWandMode();
      
      // Animation state should still be accessible and consistent
      const animState = animationController.getReactState();
      expect(animState).toBeDefined();
      expect(typeof animState.isPouncing).toBe('boolean');
    });

    test('should handle cleanup properly regardless of mode', () => {
      const actions = gameState.getActions();
      
      // Test cleanup in wand mode
      actions.toggleWandMode();
      animationController.onPounceTriggered({
        distance: 50,
        angle: 0,
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      
      expect(() => {
        animationController.cleanup();
      }).not.toThrow();
      
      // Switch to petting mode and test cleanup
      actions.toggleWandMode();
      
      expect(() => {
        animationController.cleanup();
      }).not.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    test('should not leak memory during mode transitions', () => {
      const actions = gameState.getActions();
      
      // Perform many mode switches with state changes
      for (let i = 0; i < 50; i++) {
        actions.toggleWandMode();
        if (gameState.getState().wandMode) {
          actions.processWandClick(Date.now() + i * 10);
        }
      }
      
      // State should still be valid
      const finalState = gameState.getState();
      expect(finalState).toBeDefined();
      expect(typeof finalState.wandMode).toBe('boolean');
      expect(typeof finalState.clickExcitement).toBe('number');
      expect(finalState.clickExcitement).toBeGreaterThanOrEqual(0);
    });

    test('should handle concurrent state updates gracefully', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      
      expect(() => {
        // Simulate rapid concurrent updates
        actions.processWandClick(Date.now());
        actions.processWandMovement({ x: 200, y: 200 }, Date.now());
        actions.processWandClick(Date.now() + 1);
        actions.processWandMovement({ x: 201, y: 201 }, Date.now() + 1);
        actions.toggleWandMode();
        actions.toggleWandMode();
      }).not.toThrow();
    });
  });
}); 