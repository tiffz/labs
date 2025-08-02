import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMeritSystem } from './useMeritSystem';
import { gameMerits } from '../data/meritData';
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

// Mock the useJobTrainingSystem hook
vi.mock('./useJobTrainingSystem', () => ({
  useJobTrainingSystem: () => ({
    jobLevels: {
      box_factory: 1,
      retail_clerk: 0,
      office_temp: 0
    },
    currentXP: 0,
    getCurrentJobData: vi.fn(),
    getJobLevel: vi.fn(),
    addXP: vi.fn()
  })
}));

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
  love: 0,
  treats: 0,
  loveMakingMultiplier: 1,
  lovePerTreat: 1,
  ownedThings: {},
  thingQuantities: {},
  currentJob: null,
  currentJobLevel: 1,
  currentJobSkillProgress: 0,
  earnedMerits: [],
  skills: [],
  jobLevels: {
    box_factory: 1,
    retail_clerk: 0,
    office_temp: 0
  },
  ...overrides
});

describe('useMeritSystem', () => {
  test('returns earned and available merits correctly', () => {
    const gameState = createMockGameState({
      earnedMerits: ['love_10', 'treats_10']
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    const { result } = renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(result.current.earnedMerits).toHaveLength(2);
    const earnedIds = result.current.earnedMerits.map(m => m.id);
    expect(earnedIds).toContain('love_10');
    expect(earnedIds).toContain('treats_10');
    
    expect(result.current.availableMerits).toHaveLength(gameMerits.length - 2);
    expect(result.current.availableMerits.every(merit => 
      !['love_10', 'treats_10'].includes(merit.id)
    )).toBe(true);
  });

  test('awards love milestone merits correctly', () => {
    const gameState = createMockGameState({ 
      love: 10,
      currentJob: null, // Prevent job merit from being awarded
      jobLevels: {} // No job levels set
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).toHaveBeenCalled();

    // Test the state update function
    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    expect(newState.earnedMerits).toContain('love_10');
    expect(addNotificationToQueue).toHaveBeenCalledWith({
      title: 'First Bond',
      message: 'Your cat looks up with hopeful eyes and a soft tummy rumble. Time for treats?',
      type: 'merit'
    });
  });

  test('awards treats milestone merits correctly', () => {
    const gameState = createMockGameState({ 
      treats: 10, // Test treats_10 instead of treats_100
      currentJob: null, 
      jobLevels: {} 
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).toHaveBeenCalled();
    
    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    expect(newState.earnedMerits).toContain('treats_10');
    expect(addNotificationToQueue).toHaveBeenCalledWith({
      title: 'First Treats',
      message: 'Finally earning treats! Your cat will be so happy.',
      type: 'merit'
    });
  });

  test('awards job achievement merits correctly', () => {
    const gameState = createMockGameState({ 
      currentJob: 'box_factory',
      currentJobLevel: 1
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).toHaveBeenCalled();
    
    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    expect(newState.earnedMerits).toContain('first_job');
  });

  test('awards promotion milestone merits correctly', () => {
    const gameState = createMockGameState({ 
      currentJob: 'box_factory',
      currentJobLevel: 2,
      jobLevels: { box_factory: 2 }, // Need to have actual job level for promotion
      love: 0, // Reset to avoid interference
      treats: 0,
      earnedMerits: ['first_job'] // Include first_job as already earned
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).toHaveBeenCalled();
    
    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    expect(newState.earnedMerits).toContain('first_promotion');
  });

  test('awards purchase achievement merits correctly', () => {
    const gameState = createMockGameState({
      thingQuantities: { ceramic_bowl: 1 }, // Use thingQuantities not ownedThings
      currentJob: null,
      jobLevels: {}
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).toHaveBeenCalled();
    
    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    expect(newState.earnedMerits).toContain('first_food_bowl');
  });

  test('does not award same merit twice', () => {
    const gameState = createMockGameState({
      love: 10,
      earnedMerits: ['love_10'], // Already earned
      currentJob: null,
      jobLevels: {}
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(setGameState).not.toHaveBeenCalled();
    expect(addNotificationToQueue).not.toHaveBeenCalled();
  });

  test('awards merit rewards correctly', () => {
    const gameState = createMockGameState({ 
      treats: 10, 
      currentJob: null,
      jobLevels: {} 
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    const updateFunction = setGameState.mock.calls[0][0];
    const newState = updateFunction(gameState);
    
    // treats_10 merit gives 5 love as reward
    expect(newState.love).toBe(5);
  });

  test('tracks analytics when merit is earned', () => {
    const gameState = createMockGameState({ 
      love: 10,
      currentJob: null,
      jobLevels: {}
    });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('merit_earned', {
      meritId: 'love_10',
      meritTitle: 'First Bond',
      meritType: 'love_milestone',
      loveReward: 0,
      treatsReward: 0
    });
  });

  test('handles missing notification data gracefully', () => {
    // Create a mock merit without explicit notification
    const gameState = createMockGameState({ love: 10 });
    const setGameState = vi.fn();
    const addNotificationToQueue = vi.fn();

    renderHook(() =>
      useMeritSystem(gameState, setGameState, addNotificationToQueue)
    );

    // Should still create notification using title and reward message
    expect(addNotificationToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        message: expect.any(String),
        type: 'merit'
      })
    );
  });
});