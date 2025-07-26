/**
 * Tests for the new clean Cat System architecture
 * 
 * Tests the separation of game logic and animation concerns
 */

import { vi } from 'vitest';
import { CatGameStateManager } from './GameState';
import { CatAnimationController } from '../animation/AnimationController';
import type { CatGameEvents } from './GameState';
import type { AnimationEvents } from '../animation/AnimationController';

describe('Cat System Architecture', () => {
  describe('Game State Layer (Pure Business Logic)', () => {
    let gameState: CatGameStateManager;
    let mockEvents: CatGameEvents;

    beforeEach(() => {
      mockEvents = {
        onPounceTriggered: vi.fn(),
        onPlayingTriggered: vi.fn(),
        onLoveGained: vi.fn(),
        onTreatsGained: vi.fn(),
        onEnergyChanged: vi.fn(),
      };

      gameState = new CatGameStateManager({
        energy: 100,
      }, mockEvents);
    });

    test('should maintain pure game state without side effects', () => {
      const initialState = gameState.getState();
      
      expect(initialState.energy).toBe(100);
      expect(initialState.pounceConfidence).toBe(0);
      expect(initialState.wandMode).toBe(false);
    });

    test('should update energy correctly', () => {
      const actions = gameState.getActions();
      
      actions.updateEnergy(-10);
      expect(gameState.getState().energy).toBe(90);
      expect(mockEvents.onEnergyChanged).toHaveBeenCalledWith(90);
      
      // Should clamp to 0-100 range
      actions.updateEnergy(-200);
      expect(gameState.getState().energy).toBe(0);
      
      actions.updateEnergy(150);
      expect(gameState.getState().energy).toBe(100);
    });

    test('should build click excitement from clicks', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      const initialExcitement = gameState.getState().clickExcitement;
      actions.processWandClick(Date.now());
      
      expect(gameState.getState().clickExcitement).toBeGreaterThan(initialExcitement);
    });

    test('should toggle wand mode and reset pounce state', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(true);
      
      // Set some click excitement first
      actions.processWandClick(Date.now());
      expect(gameState.getState().clickExcitement).toBeGreaterThan(0);
      
      // Toggling off should reset pounce state
      actions.toggleWandMode();
      expect(gameState.getState().wandMode).toBe(false);
      expect(gameState.getState().pounceConfidence).toBe(0);
    });

    test('should build click excitement and eventually contribute to confidence', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      const initialExcitement = gameState.getState().clickExcitement;
      
      actions.processWandClick(Date.now());
      expect(gameState.getState().clickExcitement).toBeGreaterThan(initialExcitement);
      
      // Process some movement to see click excitement contribution
      actions.processWandMovement({ x: 100, y: 100 }, Date.now());
      const confidenceAfterMovement = gameState.getState().pounceConfidence;
      expect(confidenceAfterMovement).toBeGreaterThan(0); // Click excitement contributes to confidence
    });

    test('should trigger pounce when confidence threshold is reached', () => {
      const actions = gameState.getActions();
      
      actions.toggleWandMode();
      
      // Build up confidence above threshold (85) 
      // Click boost is 18, so need 5+ clicks to exceed 85
      for (let i = 0; i < 6; i++) {
        actions.processWandClick(Date.now() + i * 10); // Space out timestamps
        actions.processWandMovement({ x: 200 + i, y: 200 + i }, Date.now() + i * 10);
      }
      
      // Should have triggered pounce
      expect(mockEvents.onPounceTriggered).toHaveBeenCalled();
      expect(mockEvents.onEnergyChanged).toHaveBeenCalledWith(95); // -5 energy
    });

    test('should respect pounce cooldown', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Trigger first pounce
      for (let i = 0; i < 6; i++) {
        actions.processWandClick(Date.now() + i * 10);
        actions.processWandMovement({ x: 200 + i, y: 200 + i }, Date.now() + i * 10);
      }
      
      expect(mockEvents.onPounceTriggered).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();
      
      // Try to trigger second pounce immediately (should fail due to cooldown)
      for (let i = 0; i < 6; i++) {
        actions.processWandClick(Date.now() + i * 10);
        actions.processWandMovement({ x: 300 + i, y: 300 + i }, Date.now() + i * 10);
      }
      
      // Should not trigger due to cooldown
      expect(mockEvents.onPounceTriggered).not.toHaveBeenCalled();
    });

    test('should trigger playing state only during active pounces', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      // Click outside of pounce should not trigger playing
      actions.processWandClick(Date.now());
      expect(mockEvents.onPlayingTriggered).not.toHaveBeenCalled();
      
      // Note: Love is only gained from pounces, not clicks directly
      expect(mockEvents.onLoveGained).not.toHaveBeenCalled();
    });

    test('should calculate movement novelty from wand movement', () => {
      const actions = gameState.getActions();
      actions.toggleWandMode();
      
      const now = Date.now();
      
      // Simulate varied movement (should increase novelty)
      actions.processWandMovement({ x: 100, y: 100 }, now);
      actions.processWandMovement({ x: 200, y: 150 }, now + 50);
      actions.processWandMovement({ x: 120, y: 300 }, now + 100);
      
      const state = gameState.getState();
      expect(state.cursorVelocity).toBeGreaterThan(0);
      expect(state.proximityMultiplier).toBeGreaterThan(0);
      expect(state.movementNovelty).toBeDefined();
    });
  });

  describe('Animation Controller Layer (Pure Presentation)', () => {
    let animationController: CatAnimationController;
    let mockEvents: AnimationEvents;

    beforeEach(() => {
      mockEvents = {
        onHeartSpawned: vi.fn(),
        onTrackableHeartSet: vi.fn(),
      };

      animationController = new CatAnimationController(mockEvents);
    });

    afterEach(() => {
      animationController.cleanup();
    });

    test('should handle pounce animation without game logic', () => {
      const pounceData = {
        distance: 100,
        angle: Math.PI / 4,
        intensity: 0.8,
        catEnergy: 100,
        wandPosition: { x: 300, y: 300 },
        catPosition: { x: 200, y: 200 }
      };

      animationController.onPounceTriggered(pounceData);
      
      const state = animationController.getReactState();
      expect(state.isPouncing).toBe(true);
      expect(state.pounceTarget.x).toBeGreaterThan(0); // Should be positive (moving right)
      expect(state.excitementLevel).toBeGreaterThan(0);
    });

    test('should handle playing animation state', () => {
      const playData = {
        intensity: 1.5,
        duration: 500,
      };

      animationController.onPlayingTriggered(playData);
      
      const state = animationController.getReactState();
      expect(state.isPlaying).toBe(true);
      expect(state.isShaking).toBe(true); // Should trigger shake animation
    });

    test('should spawn hearts when love is gained', async () => {
      animationController.onLoveGained(3);
      
      // Hearts are spawned with delays, so wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockEvents.onHeartSpawned).toHaveBeenCalled();
      expect(mockEvents.onTrackableHeartSet).toHaveBeenCalled();
    });

    test('should clean up all timers and animations', () => {
      // Trigger some animations
      animationController.onPounceTriggered({ 
        distance: 50, 
        angle: 0, 
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      animationController.onPlayingTriggered({ intensity: 1, duration: 300 });
      
      expect(animationController.getReactState().isPouncing).toBe(true);
      expect(animationController.getReactState().isPlaying).toBe(true);
      
      // Cleanup should reset everything
      animationController.cleanup();
      
      const state = animationController.getReactState();
      expect(state.isPouncing).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.isShaking).toBe(false);
      expect(state.excitementLevel).toBe(0);
    });

    test('should not interrupt existing pounce animation', () => {
      // Start first pounce
      animationController.onPounceTriggered({ 
        distance: 50, 
        angle: 0, 
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 150, y: 150 }
      });
      const firstTarget = animationController.getReactState().pounceTarget;
      
      // Try to start second pounce
      animationController.onPounceTriggered({ 
        distance: 100, 
        angle: Math.PI, 
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 300, y: 300 },
        catPosition: { x: 200, y: 200 }
      });
      const secondTarget = animationController.getReactState().pounceTarget;
      
      // Target should not have changed
      expect(firstTarget).toEqual(secondTarget);
    });
  });

  describe('Architecture Benefits', () => {
    test('game state should be pure and testable without DOM concerns', () => {
      const gameEvents = {
        onPounceTriggered: vi.fn(),
        onPlayingTriggered: vi.fn(),
        onLoveGained: vi.fn(),
        onTreatsGained: vi.fn(),
        onEnergyChanged: vi.fn(),
      };

      const catGameState = new CatGameStateManager({ energy: 50 }, gameEvents);
      const actions = catGameState.getActions();
      
      // All game logic should work without any DOM or animation concerns
      actions.updateEnergy(25);
      expect(catGameState.getState().energy).toBe(75);
      
      actions.toggleWandMode();
      expect(catGameState.getState().wandMode).toBe(true);
      
      // No timers, no animations, just pure state mutations
    });

    test('animation controller should handle visual effects without game logic', () => {
      const animationEvents = {
        onHeartSpawned: vi.fn(),
        onTrackableHeartSet: vi.fn(),
      };

      const controller = new CatAnimationController(animationEvents);
      
      // Animation controller should handle presentation without knowing game rules
      controller.onPounceTriggered({ 
        distance: 100, 
        angle: 0, 
        intensity: 1,
        catEnergy: 100,
        wandPosition: { x: 200, y: 200 },
        catPosition: { x: 100, y: 100 }
      });
      expect(controller.getReactState().isPouncing).toBe(true);
      
      controller.onPlayingTriggered({ intensity: 1, duration: 400 });
      expect(controller.getReactState().isPlaying).toBe(true);
      
      controller.cleanup();
    });

    test('layers should be independently testable', async () => {
      // This test demonstrates that each layer can be tested in isolation
      // without dependencies on the other layers
      
      // Game state test - no animation dependencies
      const gameEvents = { onPounceTriggered: vi.fn(), onPlayingTriggered: vi.fn(), onLoveGained: vi.fn(), onTreatsGained: vi.fn(), onEnergyChanged: vi.fn() };
      const catGameState = new CatGameStateManager({ energy: 50 }, gameEvents);
      catGameState.getActions().updateEnergy(10);
      expect(catGameState.getState().energy).toBe(60); // 50 (initial) + 10 (added)
      
      // Animation test - no game logic dependencies  
      const animationEvents = { onHeartSpawned: vi.fn(), onTrackableHeartSet: vi.fn() };
      const controller = new CatAnimationController(animationEvents);
      controller.onLoveGained(5);
      
      // Hearts are spawned with delays, so wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(animationEvents.onHeartSpawned).toHaveBeenCalled();
      
      controller.cleanup();
    });
  });
}); 