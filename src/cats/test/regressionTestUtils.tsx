/**
 * Shared utilities for Cat Clicker regression tests
 * Centralizes common setup/teardown and mock configurations
 */

import { render, cleanup as rtlCleanup, act } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import App from '../App';

// Track rendered components for cleanup
let renderedComponents: Array<{ unmount: () => void }> = [];
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect;

export interface MockCatRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * Standard cat rectangle for consistent testing
 */
export const DEFAULT_CAT_RECT: MockCatRect = {
  left: 300,
  top: 200,
  width: 100,
  height: 80,
  right: 400,
  bottom: 280,
};

/**
 * Setup function to be called in beforeEach
 * Sets up common mocks and DOM elements
 */
export function setupRegressionTest() {
  // Clear any previous renders
  renderedComponents = [];
  
  // Store original getBoundingClientRect
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  
  // Mock requestAnimationFrame for consistent testing
  let rafIdCounter = 0;
  const rafCallbacks = new Map<number, FrameRequestCallback>();
  global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    const id = ++rafIdCounter;
    if (vi.isFakeTimers()) {
      cb(performance.now());
    } else {
      rafCallbacks.set(id, cb);
      setTimeout(() => {
        rafCallbacks.delete(id);
        cb(performance.now());
      }, 0);
    }
    return id;
  });
  global.cancelAnimationFrame = vi.fn((id: number) => {
    rafCallbacks.delete(id);
  });
  
  // Set up DOM container for portals
  const portalContainer = document.createElement('div');
  portalContainer.id = 'heart-container';
  document.body.appendChild(portalContainer);
  
  // Spy on console
  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  // Mock URL for dev mode detection
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { search: '' }
  });
  
  return { consoleWarnSpy, consoleErrorSpy };
}

/**
 * Teardown function to be called in afterEach
 * Cleans up all mocks and renders
 */
export function teardownRegressionTest() {
  // Unmount all React components first
  renderedComponents.forEach(component => {
    try {
      component.unmount();
    } catch {
      // Ignore errors during cleanup
    }
  });
  renderedComponents = [];
  
  // Clean up React Testing Library
  rtlCleanup();
  
  // Clean up DOM
  document.body.innerHTML = '';
  
  // Restore console spies
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();
  
  // Restore original getBoundingClientRect
  if (originalGetBoundingClientRect) {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  }
  
  // Clean up timers
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
  
  // Cancel all pending animation frames
  const globalWithHelper = global as typeof global & { __cancelAllAnimationFrames?: () => void };
  if (globalWithHelper.__cancelAllAnimationFrames) {
    globalWithHelper.__cancelAllAnimationFrames();
  }
}

/**
 * Render App with fake timers (synchronous)
 */
export function renderAppWithFakeTimers() {
  const result = render(<App />);
  renderedComponents.push({ unmount: result.unmount });
  act(() => {
    vi.advanceTimersByTime(200);
  });
  return result;
}

/**
 * Render App with real timers (async)
 */
export async function renderApp() {
  const result = render(<App />);
  renderedComponents.push({ unmount: result.unmount });
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

/**
 * Mock getBoundingClientRect for cat element
 */
export function mockCatPosition(rect: MockCatRect) {
  originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function(this: Element) {
    if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
      return rect;
    }
    return originalGetBoundingClientRect.call(this);
  }) as Mock;
  
  return () => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  };
}

/**
 * Calculate expected cat head position from rect
 */
export function getCatHeadPosition(rect: MockCatRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height * 0.3,
  };
}

/**
 * Trigger sleep state by advancing timers 30 seconds
 */
export function triggerSleep() {
  act(() => {
    vi.advanceTimersByTime(30000);
  });
}

/**
 * Wait for Zzz elements to spawn (3 seconds after sleep)
 */
export function waitForZzzSpawn() {
  act(() => {
    vi.advanceTimersByTime(3000);
  });
}

/**
 * Get console error spy for assertions
 */
export function getConsoleErrorSpy() {
  return consoleErrorSpy;
}

/**
 * Get console warn spy for assertions
 */
export function getConsoleWarnSpy() {
  return consoleWarnSpy;
}
