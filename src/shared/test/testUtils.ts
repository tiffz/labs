/**
 * Shared test utilities for consistent cleanup patterns across the codebase
 */
import { vi, afterEach, beforeEach } from 'vitest';

/**
 * Timer cleanup utilities
 */
export class TimerCleanup {
  private timers: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private animationFrames: Set<number> = new Set();

  /**
   * Create a timeout that will be automatically cleaned up
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  /**
   * Create an interval that will be automatically cleaned up
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Request animation frame that will be automatically cleaned up
   */
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const frame = requestAnimationFrame((time) => {
      this.animationFrames.delete(frame);
      callback(time);
    });
    this.animationFrames.add(frame);
    return frame;
  }

  /**
   * Clean up all timers, intervals, and animation frames
   */
  cleanup(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.animationFrames.forEach(frame => cancelAnimationFrame(frame));
    
    this.timers.clear();
    this.intervals.clear();
    this.animationFrames.clear();
  }
}

/**
 * DOM cleanup utilities
 */
class DOMCleanup {
  private elementsToCleanup: Set<Element> = new Set();
  private originalBodyHTML: string = '';

  /**
   * Initialize DOM cleanup - call in beforeEach
   */
  init(): void {
    this.originalBodyHTML = document.body.innerHTML;
  }

  /**
   * Track an element for cleanup
   */
  trackElement(element: Element): void {
    this.elementsToCleanup.add(element);
  }

  /**
   * Create and track a DOM element
   */
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: { id?: string; className?: string; parent?: Element }
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    
    if (options?.id) element.id = options.id;
    if (options?.className) element.className = options.className;
    if (options?.parent) {
      options.parent.appendChild(element);
    } else {
      document.body.appendChild(element);
    }
    
    this.trackElement(element);
    return element;
  }

  /**
   * Clean up all tracked DOM elements
   */
  cleanup(): void {
    this.elementsToCleanup.forEach(element => {
      element.remove();
    });
    this.elementsToCleanup.clear();
    
    // Reset body to original state
    document.body.innerHTML = this.originalBodyHTML;
  }
}

/**
 * Mock cleanup utilities
 */
export class MockCleanup {
  private mocks: Set<ReturnType<typeof vi.spyOn>> = new Set();
  private globalMocks: Map<string, unknown> = new Map();

  /**
   * Create a spy that will be automatically restored
   */
  spyOn<T, K extends keyof T>(
    object: T,
    method: K
  ): ReturnType<typeof vi.spyOn> {
    const spy = vi.spyOn(object, method);
    this.mocks.add(spy);
    return spy;
  }

  /**
   * Mock a global property that will be automatically restored
   */
  mockGlobal<T>(
    object: Record<string, unknown>,
    property: string,
    value: T
  ): void {
    const key = `${object.constructor.name}.${property}`;
    if (!this.globalMocks.has(key)) {
      this.globalMocks.set(key, object[property]);
    }
    object[property] = value;
  }

  /**
   * Clean up all mocks and restore original values
   */
  cleanup(): void {
    this.mocks.forEach(mock => mock.mockRestore());
    this.mocks.clear();
    
    // Restore global mocks
    this.globalMocks.forEach((originalValue, key) => {
      const [objectName, property] = key.split('.');
      // This is a simplified restore - in practice you'd need more sophisticated tracking
      if (objectName === 'Window' && typeof window !== 'undefined') {
        (window as Record<string, unknown>)[property] = originalValue;
      }
    });
    this.globalMocks.clear();
  }
}

/**
 * Comprehensive test cleanup manager
 */
export class TestCleanup {
  public timers = new TimerCleanup();
  public dom = new DOMCleanup();
  public mocks = new MockCleanup();

  /**
   * Initialize all cleanup managers - call in beforeEach
   */
  init(): void {
    this.dom.init();
  }

  /**
   * Clean up everything - call in afterEach
   */
  cleanup(): void {
    this.timers.cleanup();
    this.dom.cleanup();
    this.mocks.cleanup();
  }
}

/**
 * Convenience function to set up standard test cleanup
 * Usage in test files:
 * 
 * const cleanup = setupTestCleanup();
 * 
 * // In tests, use:
 * cleanup.timers.setTimeout(() => {...}, 100);
 * cleanup.dom.createElement('div', { id: 'test' });
 * cleanup.mocks.spyOn(console, 'log');
 */
export function setupTestCleanup(): TestCleanup {
  const cleanup = new TestCleanup();

  beforeEach(() => {
    cleanup.init();
  });

  afterEach(() => {
    cleanup.cleanup();
  });

  return cleanup;
}

/**
 * Promise-based timeout for tests that automatically cleans up
 */
export function createTestTimeout(cleanup: TimerCleanup) {
  return (ms: number): Promise<void> => {
    return new Promise(resolve => {
      cleanup.setTimeout(resolve, ms);
    });
  };
}

/**
 * Mock requestAnimationFrame for tests
 */
export function mockAnimationFrame(cleanup: MockCleanup): void {
  cleanup.mockGlobal(global, 'requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    // Execute callback asynchronously to prevent infinite recursion
    setTimeout(() => callback(performance.now()), 0);
    return 1;
  }));

  cleanup.mockGlobal(global, 'cancelAnimationFrame', vi.fn());
}
