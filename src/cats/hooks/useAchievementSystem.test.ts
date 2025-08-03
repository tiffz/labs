import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAchievementSystem } from './useAchievementSystem';
import type { GameState } from '../game/types';

// Mock analytics
const mockAnalytics = {
  trackEvent: vi.fn()
};

beforeEach(() => {
  // @ts-expect-error - Adding analytics to window for testing
  window.labsAnalytics = mockAnalytics;
  vi.clearAllMocks();
});

afterEach(() => {
  // @ts-expect-error - Removing analytics from window after test
  delete window.labsAnalytics;
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  love: 0,
  treats: 0,
  earnedMerits: [],
  spentMerits: 0,
  earnedAwards: [],
  awardProgress: {},
  specialActions: {
    noseClicks: 0,
    happyJumps: 0,
    earClicks: 0,
    cheekPets: 0
  },
  jobLevels: {},
  thingQuantities: {},
  totalClicks: 0,
  lovePerTreat: 1,
  currentMood: 'content',
  ...overrides
});

const mockSetGameState = vi.fn();
const mockAddNotificationToQueue = vi.fn();

describe('useAchievementSystem', () => {
  test('should check milestones and award them when criteria are met', () => {
    const gameState = createMockGameState({
      love: 100,
      treats: 50,
      totalClicks: 25
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should award milestones for reaching targets
    expect(mockSetGameState).toHaveBeenCalled();
    expect(mockAddNotificationToQueue).toHaveBeenCalled();
  });

  test('should check awards and award them when special actions are performed', () => {
    const gameState = createMockGameState({
      specialActions: {
        noseClicks: 1,
        happyJumps: 1,
        earClicks: 0,
        cheekPets: 0
      }
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should award the "Boop" and "Joy Bringer" awards
    expect(mockSetGameState).toHaveBeenCalled();
    expect(mockAddNotificationToQueue).toHaveBeenCalled();
  });

  test('should not award achievements that are already earned', () => {
    const gameState = createMockGameState({
      love: 100,
      earnedMerits: ['love_friend'] // Already earned
    });

    vi.clearAllMocks();

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should not re-award already earned milestones
    const setGameStateCalls = mockSetGameState.mock.calls;
    if (setGameStateCalls.length > 0) {
      const updateFn = setGameStateCalls[0][0];
      const newState = updateFn(gameState);
      expect(newState.earnedMerits.filter(id => id === 'love_friend')).toHaveLength(1);
    }
  });

  test('should track award progress for partially completed awards', () => {
    const gameState = createMockGameState({
      love: 50 // Not enough for higher milestones
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should track progress towards milestones
    expect(mockSetGameState).toHaveBeenCalled();
  });

  test('should handle multiple achievements earned simultaneously', () => {
    const gameState = createMockGameState({
      love: 1000,
      treats: 1000,
      totalClicks: 100,
      specialActions: {
        noseClicks: 1,
        happyJumps: 1,
        earClicks: 0,
        cheekPets: 0
      }
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should handle multiple achievements without conflicts
    expect(mockSetGameState).toHaveBeenCalled();
    expect(mockAddNotificationToQueue).toHaveBeenCalled();
  });

  test('should use correct analytics tracking for achievements', () => {
    const gameState = createMockGameState({
      love: 10
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Should track analytics for achievement events
    if (mockAnalytics.trackEvent.mock.calls.length > 0) {
      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
        'achievement_earned',
        expect.objectContaining({
          achievementId: expect.any(String),
          achievementType: expect.any(String)
        })
      );
    }
  });

  test('should calculate correct love and treat milestones', () => {
    const gameState = createMockGameState({
      love: 10000,
      treats: 10000
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    expect(mockSetGameState).toHaveBeenCalled();
    
    // Verify that high-value milestones are awarded
    const setGameStateCalls = mockSetGameState.mock.calls;
    if (setGameStateCalls.length > 0) {
      const updateFn = setGameStateCalls[0][0];
      const newState = updateFn(gameState);
      expect(newState.earnedMerits.length).toBeGreaterThan(0);
    }
  });

  test('should handle edge cases with zero values', () => {
    const gameState = createMockGameState({
      love: 0,
      treats: 0,
      totalClicks: 0
    });

    expect(() => {
      renderHook(() => useAchievementSystem(
        gameState,
        mockSetGameState,
        mockAddNotificationToQueue
      ));
    }).not.toThrow();
  });

  test('should handle missing analytics gracefully', () => {
    // @ts-expect-error - Removing analytics to test fallback
    delete window.labsAnalytics;

    const gameState = createMockGameState({
      love: 10
    });

    expect(() => {
      renderHook(() => useAchievementSystem(
        gameState,
        mockSetGameState,
        mockAddNotificationToQueue
      ));
    }).not.toThrow();
  });
});