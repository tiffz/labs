// === ANIMATION UTILITY FUNCTIONS ===

/**
 * Creates a managed timeout that can be easily cleaned up
 * Helps reduce timer management complexity across components
 */
export const createManagedTimeout = (callback: () => void, delay: number) => {
  const timeoutId = setTimeout(callback, delay);
  return () => clearTimeout(timeoutId);
};

/**
 * Creates a state setter with automatic timeout
 * Reduces the pattern of setState(true) followed by setTimeout(setState(false))
 */
export const createTimedState = <T>(
  setter: (value: T) => void,
  activeValue: T,
  inactiveValue: T,
  duration: number
) => {
  setter(activeValue);
  return createManagedTimeout(() => setter(inactiveValue), duration);
};

/**
 * Consolidated animation constants used across components
 */
export const SHARED_ANIMATION_CONSTANTS = {
  // Timing constants
  STANDARD_TRANSITION: 200,
  QUICK_TRANSITION: 150,
  SLOW_TRANSITION: 600,
  
  // Probability constants
  PETTING_EAR_WIGGLE_CHANCE: 0.4,
  POUNCING_EAR_WIGGLE_CHANCE: 0.7,
  HAPPY_PLAY_CHANCE: 0.3,
  
  // Duration ranges
  HAPPY_PLAY_DURATION: { min: 1000, max: 3000 },
} as const;

/**
 * Helper to get random duration within a range
 */
export const randomDuration = (min: number, max: number) => 
  min + Math.random() * (max - min); 