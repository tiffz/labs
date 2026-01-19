/**
 * Sleep System Regression Tests
 * Tests for cat sleep/wake state transitions
 */

import { screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setupRegressionTest,
  teardownRegressionTest,
  renderAppWithFakeTimers,
  getConsoleErrorSpy,
} from '../test/regressionTestUtils.js';

describe('Sleep System Regression Tests', () => {
  beforeEach(() => {
    setupRegressionTest();
  });

  afterEach(() => {
    teardownRegressionTest();
  });

  it('should transition cat to sleeping state after 30 seconds of inactivity', () => {
    vi.useFakeTimers();
    
    renderAppWithFakeTimers();
    
    // Advance time to trigger sleep (30 seconds)
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    // Verify cat shows sleeping eyes
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
  });

  it('should wake up cat when mouse is moved during sleep', () => {
    vi.useFakeTimers();
    
    renderAppWithFakeTimers();
    
    // Put cat to sleep
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    // Verify cat is sleeping
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    
    // Move mouse to wake up cat
    act(() => {
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
    });
    
    // Verify cat is awake
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(false);
    expect(sleepyEyes.classList.contains('hidden')).toBe(true);
  });

  it('should wake up cat when clicked during sleep', () => {
    vi.useFakeTimers();
    
    renderAppWithFakeTimers();
    
    // Put cat to sleep
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    // Verify cat is sleeping
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    
    // Click on cat to wake it up
    const cat = screen.getByTestId('cat');
    act(() => {
      fireEvent.mouseDown(cat);
    });
    
    // Verify cat is awake
    const openEyes = screen.getByTestId('eye-open');
    expect(openEyes.classList.contains('hidden')).toBe(false);
    expect(sleepyEyes.classList.contains('hidden')).toBe(true);
  });

  it('should reset sleep timers after waking up', () => {
    vi.useFakeTimers();
    
    renderAppWithFakeTimers();
    
    // Put cat to sleep
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    // Wake up cat
    act(() => {
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
    });
    
    // Verify cat is awake
    const openEyes = screen.getByTestId('eye-open');
    const sleepyEyes = screen.getByTestId('eye-sleepy');
    expect(openEyes.classList.contains('hidden')).toBe(false);
    expect(sleepyEyes.classList.contains('hidden')).toBe(true);
    
    // Wait 29 seconds (just before sleep threshold)
    act(() => {
      vi.advanceTimersByTime(29000);
    });
    
    // Should still be awake
    expect(openEyes.classList.contains('hidden')).toBe(false);
    expect(sleepyEyes.classList.contains('hidden')).toBe(true);
    
    // Wait 1 more second to trigger sleep again
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should be sleeping again
    expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    expect(openEyes.classList.contains('hidden')).toBe(true);
  });

  it('should not cause console errors during sleep state transitions', () => {
    vi.useFakeTimers();
    
    renderAppWithFakeTimers();
    
    // Transition through drowsy to sleep
    act(() => {
      vi.advanceTimersByTime(20000); // Drowsy at 20s
      vi.advanceTimersByTime(10000); // Sleep at 30s
    });
    
    // Wake up
    act(() => {
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
    });
    
    // Sleep again
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    
    // Wake up again
    act(() => {
      fireEvent.click(screen.getByTestId('cat'));
    });
    
    // Filter out expected act warnings
    const consoleErrorSpy = getConsoleErrorSpy();
    const reactErrors = consoleErrorSpy.mock.calls.filter((call: unknown[]) => {
      const message = String(call[0] || '');
      return !message.includes('An update to') && !message.includes('not wrapped in act');
    });
    expect(reactErrors).toHaveLength(0);
  });
});
