import '@testing-library/jest-dom';

// Mock requestAnimationFrame and cancelAnimationFrame for test environment
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++animationFrameId;
  // Use setTimeout with minimal delay to simulate animation frame
  setTimeout(() => {
    animationFrameCallbacks.delete(id);
    callback(performance.now());
  }, 16); // ~60fps
  animationFrameCallbacks.set(id, callback);
  return id;
};

global.cancelAnimationFrame = (id: number): void => {
  animationFrameCallbacks.delete(id);
};

// Mock performance.now() for consistent timing in tests
if (!global.performance) {
  global.performance = {} as Performance;
}
if (!global.performance.now) {
  global.performance.now = () => Date.now();
}

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