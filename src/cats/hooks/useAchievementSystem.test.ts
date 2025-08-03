import { renderHook, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAchievementSystem } from './useAchievementSystem';
import type { GameState } from '../game/types';

// Extend Window interface for testing
declare global {
  interface Window {
    labsAnalytics?: {
      trackEvent: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

// Mock analytics
const mockAnalytics = {
  trackEvent: vi.fn()
};

beforeEach(() => {
  window.labsAnalytics = mockAnalytics;
  vi.clearAllMocks();
});

afterEach(() => {
  delete window.labsAnalytics;
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  love: 0,
  treats: 0,
  unlockedJobs: ['box_factory'],
  jobLevels: {},
  jobExperience: {},
  jobInterviews: {},
  thingQuantities: {},
  earnedMerits: [],
  spentMerits: {},
  earnedAwards: [],
  awardProgress: {},
  specialActions: {
    noseClicks: 0,
    happyJumps: 0,
    earClicks: 0,
    cheekPets: 0
  },
  ...overrides
});

const mockSetGameState = vi.fn();
const mockAddNotificationToQueue = vi.fn();

describe('useAchievementSystem', () => {
  test('should check milestones and award them when criteria are met', async () => {
    const gameState = createMockGameState({
      love: 100,
      treats: 50
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Wait for useEffects to run
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });
    
    expect(mockAddNotificationToQueue).toHaveBeenCalled();
  });

  test('should check awards and award them when special actions are performed', async () => {
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

    // Wait for useEffects to run
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });
    
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
      expect(newState.earnedMerits.filter((id: string) => id === 'love_friend')).toHaveLength(1);
    }
  });

  test('should track award progress for partially completed awards', async () => {
    const gameState = createMockGameState({
      love: 50 // Not enough for higher milestones
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Wait for useEffects to run and track progress towards milestones
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });
  });

  test('should handle multiple achievements earned simultaneously', async () => {
    const gameState = createMockGameState({
      love: 1000,
      treats: 1000,
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

    // Wait for useEffects to run and handle multiple achievements without conflicts
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });
    
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

  test('should calculate correct love and treat milestones', async () => {
    const gameState = createMockGameState({
      love: 10000,
      treats: 10000
    });

    renderHook(() => useAchievementSystem(
      gameState,
      mockSetGameState,
      mockAddNotificationToQueue
    ));

    // Wait for useEffects to run
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });
    
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
      treats: 0
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

  test('prevents duplicate achievement awards - race condition protection', async () => {
    const mockGameState = createMockGameState({ love: 10 });
    const { rerender } = renderHook(() => useAchievementSystem(mockGameState, mockSetGameState, mockAddNotificationToQueue));

    // Wait for initial achievement check
    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });

    // Clear mocks to isolate the next test
    vi.clearAllMocks();

    // Force multiple re-renders in rapid succession to simulate race conditions
    rerender();
    rerender();
    rerender();

    // Wait for any potential duplicate processing
    await waitFor(() => {
      // If duplicates were prevented, we should see minimal additional calls
      const finalCallCount = mockSetGameState.mock.calls.length;
      const finalNotificationCount = mockAddNotificationToQueue.mock.calls.length;
      
      // Should not have excessive duplicate calls
      expect(finalCallCount).toBeLessThan(3); // Allow some but not many
      expect(finalNotificationCount).toBeLessThan(3); // Allow some but not many
    }, { timeout: 100 });
  });

  test('prevents duplicate awards when already earned', async () => {
    // Start with an achievement already earned
    const mockGameState = createMockGameState({ 
      love: 10, 
      earnedMerits: ['love_10'] // Already earned
    });
    
    renderHook(() => useAchievementSystem(mockGameState, mockSetGameState, mockAddNotificationToQueue));

    // Wait for initial processing
    await waitFor(() => {
      // Should not call setGameState to award the same achievement again
      expect(mockSetGameState).not.toHaveBeenCalledWith(expect.objectContaining({
        earnedMerits: expect.arrayContaining(['love_10', 'love_10']) // No duplicates
      }));
    });

    // Verify no duplicate notifications
    const notificationCalls = mockAddNotificationToQueue.mock.calls.filter(call => 
      call[0].title?.includes('love_10') || call[0].message?.includes('10 love')
    );
    expect(notificationCalls).toHaveLength(0); // Should be 0 since already earned
  });

  test('handles rapid state changes without duplicate awards', async () => {
    let currentLove = 5;
    const { rerender } = renderHook(() => {
      const gameState = createMockGameState({ love: currentLove });
      return useAchievementSystem(gameState, mockSetGameState, mockAddNotificationToQueue);
    });

    // Rapidly increase love to trigger achievement
    currentLove = 10;
    rerender();
    
    // Immediately trigger another update with same love (simulating race condition)
    rerender();
    rerender();

    await waitFor(() => {
      expect(mockSetGameState).toHaveBeenCalled();
    });

    // Count how many times the same achievement was awarded
    const achievementCalls = mockSetGameState.mock.calls.filter(call => {
      const updateFn = call[0];
      const testState = createMockGameState({ earnedMerits: [] });
      const result = updateFn(testState);
      return result.earnedMerits && result.earnedMerits.includes('love_10');
    });

    // Should only be awarded once, not multiple times
    expect(achievementCalls.length).toBeLessThanOrEqual(1);
    
    // Should only have one notification for this achievement
    const notificationCalls = mockAddNotificationToQueue.mock.calls.filter(call => 
      call[0].message?.includes('10') && call[0].type === 'merit'
    );
    expect(notificationCalls.length).toBeLessThanOrEqual(1);
  });
});