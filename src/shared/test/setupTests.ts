import '@testing-library/jest-dom';
import { configure } from '@testing-library/dom';
import { afterEach } from 'vitest';

/**
 * Give `findBy*` / `waitFor` a timeout proportional to this suite's actual budget.
 *
 * Testing Library defaults `asyncUtilTimeout` to 1000ms. Vitest here allows `testTimeout: 10000`.
 * Nobody chose that 10x gap — it is a library default meeting a config default — and it made every
 * async assertion in the suite fail 9 seconds before its own test was out of time.
 *
 * It surfaced as two nightly failures (2026-09-03, 2026-09-04) in
 * `ChordPlaybackSettingsPanel.test.tsx`, which awaits a button behind
 * `lazy(() => import('./DrumAccompaniment'))` inside `<Suspense fallback={null}>`. Measured, that
 * boundary resolves in ~60ms — 16x under the old limit. It only failed on the nightly's coverage
 * run: 852 files across 6 CI workers with instrumentation, where ~60ms of work does not get ~60ms
 * of CPU. The empty `drums-panel` div in the failure DOM is the `fallback={null}` still showing.
 *
 * Note what this is NOT: widening a timeout to hide a real async bug, which
 * `.agents/rules/flaky-tests.md` rightly forbids. The lazy boundary is correct and deliberate, the
 * test awaits it correctly, and nothing is racing that should not be. The only broken thing was the
 * margin. Preloading the dynamic import — that rule's first suggested fix — was measured here and
 * moved resolution only 64ms → 56ms, because module loading was never the cost.
 *
 * 4000ms keeps two full timeouts inside `testTimeout`, so a genuinely missing element still fails
 * with Testing Library's DOM dump rather than a bare Vitest timeout. Raise `testTimeout` first if
 * you ever raise this.
 */
configure({ asyncUtilTimeout: 4000 });

// Mock requestAnimationFrame and cancelAnimationFrame for test environment
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();
const animationFrameTimeouts = new Map<number, number>();

global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++animationFrameId;
  
  // Use setTimeout with minimal delay to simulate animation frame
  // Global `setTimeout`, not `window.setTimeout`: this setup runs in the node environment too.
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
  // Node types `setTimeout` as `Timeout`, the DOM types it as `number`; the map only ever hands
  // the value straight back to `clearTimeout`, so the numeric coercion is safe in both.
  animationFrameTimeouts.set(id, timeoutId as unknown as number);
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

// Silence GA / external network calls during tests to avoid noisy console errors.
// Guarded: no `window` in the node environment, and nothing there calls gtag.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'gtag', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });
}

/** Node's worker BroadcastChannel can dispatch MessageEvent after tests finish (Vitest flake). */
class MockBroadcastChannel implements BroadcastChannel {
  readonly name: string;
  onmessage: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null = null;
  onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(): void {
    /* no-op — real channel leaks async messages across tests */
  }

  close(): void {
    this.onmessage = null;
    this.onmessageerror = null;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return true;
  }
}

globalThis.BroadcastChannel = MockBroadcastChannel as typeof BroadcastChannel;

/*
 * Canvas mock — jsdom only. Guarded so this same setup file can serve the `node` environment,
 * where there is no HTMLCanvasElement and nothing renders VexFlow anyway. Most test files are
 * pure logic and pay ~165ms each for a jsdom environment they never touch.
 */
if (typeof HTMLCanvasElement !== 'undefined') {
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const mockedGetContext = function (
  this: HTMLCanvasElement,
  contextId: string,
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
  return originalGetContext.call(this, contextId as never, ...(args as [])) as unknown as RenderingContext | null;
};

HTMLCanvasElement.prototype.getContext = mockedGetContext as unknown as HTMLCanvasElement['getContext'];
}