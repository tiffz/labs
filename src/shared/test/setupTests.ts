import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

// Mock requestAnimationFrame and cancelAnimationFrame for test environment
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();
const animationFrameTimeouts = new Map<number, NodeJS.Timeout>();

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++animationFrameId;
  
  // Use setTimeout with minimal delay to simulate animation frame
  const timeoutId = setTimeout(() => {
    // Only call callback if the frame hasn't been cancelled
    if (animationFrameCallbacks.has(id)) {
      animationFrameCallbacks.delete(id);
      animationFrameTimeouts.delete(id);
      
      try {
        callback(performance.now());
      } catch (error) {
        // Suppress errors from cancelled frames during cleanup
        console.warn('Animation frame callback error (likely from cleanup):', error);
      }
    }
  }, 1); // Faster than 16ms for tests
  
  animationFrameCallbacks.set(id, callback);
  animationFrameTimeouts.set(id, timeoutId);
  return id;
};

global.cancelAnimationFrame = (id: number): void => {
  const timeoutId = animationFrameTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    animationFrameTimeouts.delete(id);
  }
  animationFrameCallbacks.delete(id);
};

// Helper to cancel all pending animation frames (useful for test cleanup)
(global as typeof global & { __cancelAllAnimationFrames?: () => void }).__cancelAllAnimationFrames = () => {
  for (const [, timeoutId] of animationFrameTimeouts) {
    clearTimeout(timeoutId);
  }
  animationFrameCallbacks.clear();
  animationFrameTimeouts.clear();
};

// Mock performance.now() for consistent timing in tests
if (!global.performance) {
  global.performance = {} as Performance;
}
if (!global.performance.now) {
  global.performance.now = () => Date.now();
}

// Global test cleanup to prevent animation frame leaks
afterEach(() => {
  // Cancel all pending animation frames after each test
  const globalWithHelper = global as typeof global & { __cancelAllAnimationFrames?: () => void };
  if (globalWithHelper.__cancelAllAnimationFrames) {
    globalWithHelper.__cancelAllAnimationFrames();
  }
});

// Mock DOMMatrix for test environment
global.DOMMatrix = class DOMMatrix {
  public transformString?: string;
  
  constructor(transformString?: string) {
    this.transformString = transformString;
  }

  // Mock the methods used in Cat.tsx
  translate() {
    return new DOMMatrix();
  }

  scale() {
    return new DOMMatrix();
  }

  // Mock properties
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
} as typeof DOMMatrix; 