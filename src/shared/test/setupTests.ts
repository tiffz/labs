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

// Global test cleanup to prevent animation frame leaks and memory issues
afterEach(() => {
  // Cancel all pending animation frames after each test
  const globalWithHelper = global as typeof global & { __cancelAllAnimationFrames?: () => void };
  if (globalWithHelper.__cancelAllAnimationFrames) {
    globalWithHelper.__cancelAllAnimationFrames();
  }
  
  // Clean up any remaining timers from the animation frame mock
  // This prevents setTimeout leaks from requestAnimationFrame mocks
  try {
    // Get the highest timeout ID to know the range
    const testTimeoutId = setTimeout(() => {}, 0);
    // Clear a reasonable range of timeout IDs (up to 1000 should cover most test scenarios)
    // This is safer than clearing all IDs which could interfere with vitest internals
    for (let i = 0; i < Math.min(testTimeoutId, 1000); i++) {
      try {
        clearTimeout(i);
      } catch {
        // Ignore errors for invalid IDs
      }
    }
    clearTimeout(testTimeoutId);
  } catch {
    // Ignore errors during cleanup
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

// Silence GA / external network calls during tests to avoid noisy console errors
Object.defineProperty(window, 'gtag', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

// Mock HTMLCanvasElement.getContext to suppress VexFlow errors in tests
// VexFlow tries to use canvas for text measurement, but JSDOM doesn't support it
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(
  contextId: string | RenderingContextType,
  ...args: unknown[]
): RenderingContext | null {
  if (contextId === '2d' || contextId === 'webgl' || contextId === 'webgl2') {
    // Return a minimal mock context for VexFlow and other canvas users
    const mockContext = {
      canvas: this,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({
        width: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 0,
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
        emHeightAscent: 0,
        emHeightDescent: 0,
        hangingBaseline: 0,
        alphabeticBaseline: 0,
        ideographicBaseline: 0,
      }),
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      getImageData: () => new ImageData(1, 1),
      putImageData: () => {},
      createImageData: () => new ImageData(1, 1),
      drawImage: () => {},
      getTransform: () => new DOMMatrix(),
      setTransform: () => {},
      resetTransform: () => {},
    } as unknown as CanvasRenderingContext2D;
    return mockContext;
  }
  // Fall back to original for other context types
  return originalGetContext.call(this, contextId as RenderingContextType, ...args);
};