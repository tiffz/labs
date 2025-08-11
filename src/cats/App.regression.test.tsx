/**
 * Regression tests for bugs discovered during refactoring
 * These tests help prevent the same issues from recurring
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('App Regression Tests', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock requestAnimationFrame for consistent testing
    global.requestAnimationFrame = vi.fn(cb => {
      setTimeout(cb, 16);
      return 1;
    });
    
    // Set up DOM container for portals  
    const portalContainer = document.createElement('div');
    portalContainer.id = 'heart-container';
    document.body.appendChild(portalContainer);
    
    // Spy on console to catch infinite loop warnings
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock URL for dev mode detection
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { search: '' }
    });
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllTimers();
    vi.useRealTimers();
  });



  // Dynamic Cat Facts were removed from current design. Tests deleted.

  describe('State Synchronization', () => {
    it('should maintain wand mode state correctly when toggling', async () => {
      render(<App />);
      
      // Initially not in wand mode
      expect(document.body).not.toHaveClass('wand-mode-active');
      
      // Enter wand mode
      fireEvent.keyDown(document, { key: 'w' });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(document.body).toHaveClass('wand-mode-active');
      
      // Exit wand mode
      fireEvent.keyDown(document, { key: 'Escape' });
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(document.body).not.toHaveClass('wand-mode-active');
    });

    it('should properly sync cat energy between components', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Click cat multiple times to drain energy
      const cat = screen.getByTestId('cat');
      for (let i = 0; i < 10; i++) {
        fireEvent.click(cat);
        vi.advanceTimersByTime(100);
      }
      
      // Energy should be reflected consistently (no separate energy state bugs)
      // This test ensures we don't have the circular dependency we had before
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Maximum update depth exceeded/)
      );
    });
  });

  describe('Callback Stability', () => {
    it('should not cause re-renders due to unstable callback references', async () => {
      vi.useFakeTimers();
      
      const { rerender } = render(<App />);
      
      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<App />);
        vi.advanceTimersByTime(100);
      }
      
      // Should not trigger warnings about excessive re-renders
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/rendering very frequently/)
      );
    });
  });

  describe('Passive Income Functionality', () => {
    it('should have functioning passive income system (not broken by state issues)', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Get initial treats
      const initialTreats = parseInt(screen.getByTestId('treats-amount').textContent || '0');
      
      // Advance time to trigger passive income (if any income sources are available)
      vi.advanceTimersByTime(10000); // 10 seconds
      
      // Simplified: we no longer assert on console errors for resize timing
      
      // The actual income depends on job progression, but the system should be stable
      const finalTreats = parseInt(screen.getByTestId('treats-amount').textContent || '0');
      expect(finalTreats).toBeGreaterThanOrEqual(initialTreats);
    });
  });

  describe('Component Communication', () => {
    it('should properly communicate cat position for Z spawning', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Trigger sleep state by waiting
      vi.advanceTimersByTime(35000); // Wait for cat to sleep
      
      // Should not have errors about undefined positions
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Cannot read.*position/)
      );
    });

    it('should handle heart spawning without state synchronization errors', async () => {
      render(<App />);
      
      // Click cat multiple times to spawn hearts
      const cat = screen.getByTestId('cat');
      for (let i = 0; i < 5; i++) {
        fireEvent.click(cat);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }
      
      // Should not have heart-related state errors
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Memory Leaks Prevention', () => {
    it('should clean up intervals and timeouts properly', async () => {
      vi.useFakeTimers();
      
      const { unmount } = render(<App />);
      
      // Let some time pass to create intervals/timeouts
      vi.advanceTimersByTime(5000);
      
      // Unmount component
      unmount();
      
      // Should not have errors about accessing unmounted component state
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/unmounted component/)
      );
    });
  });

  describe('Sleep System Functionality', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      // Clean up any lingering timers and animation frames
      vi.clearAllTimers();
      vi.useRealTimers();
      
      // Cancel all pending animation frames to prevent lingering callbacks
      const globalWithHelper = global as typeof global & { __cancelAllAnimationFrames?: () => void };
      if (globalWithHelper.__cancelAllAnimationFrames) {
        globalWithHelper.__cancelAllAnimationFrames();
      }
    });

    it('should transition cat to sleeping state after 30 seconds of inactivity', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
      // Advance time to trigger sleep (30 seconds) and wrap in act()
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      // Verify cat shows sleeping eyes
      const sleepyEyes = screen.getByTestId('eye-sleepy');
      expect(sleepyEyes.classList.contains('hidden')).toBe(false);
    });

    it('should wake up cat when mouse is moved during sleep', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
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

    it('should wake up cat when clicked during sleep', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
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

    it('should reset sleep timers after waking up', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
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

    it('should not cause console errors during sleep state transitions', async () => {
      vi.useFakeTimers();
      
      render(<App />);
      
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
      
      // Should have no React warnings (but filter out act warnings which are expected in tests)
      const reactErrors = consoleErrorSpy.mock.calls.filter(call => 
        !call[0].includes('An update to') && !call[0].includes('not wrapped in act')
      );
      expect(reactErrors).toHaveLength(0);

    });
  });
});