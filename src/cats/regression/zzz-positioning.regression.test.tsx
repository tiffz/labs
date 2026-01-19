/**
 * Zzz Positioning Regression Tests
 * Tests for Z element positioning during cat sleep
 */

import { screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupRegressionTest,
  teardownRegressionTest,
  renderAppWithFakeTimers,
  mockCatPosition,
  getCatHeadPosition,
  triggerSleep,
  waitForZzzSpawn,
  getConsoleErrorSpy,
  DEFAULT_CAT_RECT,
  type MockCatRect,
} from '../test/regressionTestUtils.js';

describe('Zzz Positioning Regression Tests', () => {
  beforeEach(() => {
    setupRegressionTest();
  });

  afterEach(() => {
    teardownRegressionTest();
  });

  it('should properly position Zzz elements relative to cat position', () => {
    vi.useFakeTimers();
    
    const cleanup = mockCatPosition(DEFAULT_CAT_RECT);
    
    renderAppWithFakeTimers();
    triggerSleep();
    
    // Verify cat is sleeping
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    
    waitForZzzSpawn();
    
    // Find the Zzz element
    const zzzElements = document.querySelectorAll('.zzz');
    expect(zzzElements.length).toBeGreaterThan(0);
    
    // Check positioning
    const firstZzz = zzzElements[0] as HTMLElement;
    const zzzLeft = parseFloat(firstZzz.style.left);
    const zzzTop = parseFloat(firstZzz.style.top);
    
    const expectedHead = getCatHeadPosition(DEFAULT_CAT_RECT);
    
    // Zzz should be positioned near cat's head (within randomness range)
    expect(zzzLeft).toBeGreaterThan(expectedHead.x - 40);
    expect(zzzLeft).toBeLessThan(expectedHead.x + 40);
    expect(zzzTop).toBeGreaterThan(expectedHead.y - 60);
    expect(zzzTop).toBeLessThan(expectedHead.y - 20);
    
    // Should not have errors about undefined positions
    expect(getConsoleErrorSpy()).not.toHaveBeenCalledWith(
      expect.stringMatching(/Cannot read.*position/)
    );
    
    cleanup();
  });

  it('should position Zzz elements correctly with different cat positions', () => {
    vi.useFakeTimers();
    
    // Test with cat positioned far to the right
    const farRightRect: MockCatRect = {
      left: 600,
      top: 150,
      width: 100,
      height: 80,
      right: 700,
      bottom: 230,
    };
    
    const cleanup = mockCatPosition(farRightRect);
    
    renderAppWithFakeTimers();
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    triggerSleep();
    
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    
    waitForZzzSpawn();
    
    const zzzElements = document.querySelectorAll('.zzz');
    expect(zzzElements.length).toBeGreaterThan(0);
    
    const firstZzz = zzzElements[0] as HTMLElement;
    const zzzLeft = parseFloat(firstZzz.style.left);
    
    const expectedHead = getCatHeadPosition(farRightRect);
    
    expect(zzzLeft).toBeGreaterThan(expectedHead.x - 40);
    expect(zzzLeft).toBeLessThan(expectedHead.x + 40);
    
    // Verify this is significantly different from center position (350px)
    expect(Math.abs(zzzLeft - 350)).toBeGreaterThan(200);
    
    cleanup();
  });

  it('should handle Z positioning with extreme cat positions (edge of screen)', () => {
    vi.useFakeTimers();
    
    const edgeRect: MockCatRect = {
      left: 0,
      top: 0,
      width: 100,
      height: 80,
      right: 100,
      bottom: 80,
    };
    
    const cleanup = mockCatPosition(edgeRect);
    
    renderAppWithFakeTimers();
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    triggerSleep();
    waitForZzzSpawn();
    
    const zzzElements = document.querySelectorAll('.zzz');
    expect(zzzElements.length).toBeGreaterThan(0);
    
    const firstZzz = zzzElements[0] as HTMLElement;
    const zzzLeft = parseFloat(firstZzz.style.left);
    const zzzTop = parseFloat(firstZzz.style.top);
    
    const expectedHead = getCatHeadPosition(edgeRect);
    
    expect(zzzLeft).toBeGreaterThan(expectedHead.x - 40);
    expect(zzzLeft).toBeLessThan(expectedHead.x + 40);
    expect(zzzTop).toBeGreaterThan(expectedHead.y - 60);
    expect(zzzTop).toBeLessThan(expectedHead.y - 20);
    
    cleanup();
  });

  it('should spawn multiple Z elements with consistent positioning', () => {
    vi.useFakeTimers();
    
    const rect: MockCatRect = {
      left: 400,
      top: 300,
      width: 100,
      height: 80,
      right: 500,
      bottom: 380,
    };
    
    const cleanup = mockCatPosition(rect);
    
    renderAppWithFakeTimers();
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    triggerSleep();
    
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    
    // Wait for multiple Z spawns
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    
    const zzzElements = document.querySelectorAll('.zzz');
    expect(zzzElements.length).toBeGreaterThan(1);
    
    const expectedHead = getCatHeadPosition(rect);
    
    // Check that all Z's are positioned consistently
    zzzElements.forEach((zzz) => {
      const zzzLeft = parseFloat((zzz as HTMLElement).style.left);
      const zzzTop = parseFloat((zzz as HTMLElement).style.top);
      
      expect(zzzLeft).toBeGreaterThan(expectedHead.x - 40);
      expect(zzzLeft).toBeLessThan(expectedHead.x + 40);
      expect(zzzTop).toBeGreaterThan(expectedHead.y - 60);
      expect(zzzTop).toBeLessThan(expectedHead.y - 20);
    });
    
    cleanup();
  });

  it('should handle Z positioning when cat element is not found (fallback scenario)', () => {
    vi.useFakeTimers();
    
    const originalQuerySelector = document.querySelector;
    document.querySelector = vi.fn().mockImplementation((selector) => {
      if (selector === '[data-testid="cat"]') {
        return null;
      }
      return originalQuerySelector.call(document, selector);
    });
    
    renderAppWithFakeTimers();
    
    act(() => {
      vi.advanceTimersByTime(100);
    });
    
    triggerSleep();
    waitForZzzSpawn();
    
    const zzzElements = document.querySelectorAll('.zzz');
    expect(zzzElements.length).toBeGreaterThan(0);
    
    // Should use fallback positioning (screen center)
    const firstZzz = zzzElements[0] as HTMLElement;
    const zzzLeft = parseFloat(firstZzz.style.left);
    const zzzTop = parseFloat(firstZzz.style.top);
    
    const expectedFallbackX = window.innerWidth / 2;
    const expectedFallbackY = window.innerHeight / 2;
    
    expect(zzzLeft).toBeGreaterThan(expectedFallbackX - 60);
    expect(zzzLeft).toBeLessThan(expectedFallbackX + 60);
    expect(zzzTop).toBeGreaterThan(expectedFallbackY - 80);
    expect(zzzTop).toBeLessThan(expectedFallbackY - 20);
    
    document.querySelector = originalQuerySelector;
  });
});
