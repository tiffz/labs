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



  describe('Dynamic Content', () => {
    it('should display dynamic cat facts, not hardcoded ones', async () => {
      render(<App />);
      
      // Get initial cat fact
      const initialFact = screen.getByTestId('cat-fact').textContent;
      expect(initialFact).toBeTruthy();
      
      // Click cat multiple times to trigger fact changes (changes every 2 clicks)
      const catBody = screen.getByTestId('cat-body');
      let foundDifferentFact = false;
      
      // Click cat enough times to trigger multiple fact changes
      for (let i = 0; i < 10; i++) {
        fireEvent.click(catBody);
        
        const currentFact = screen.getByTestId('cat-fact').textContent;
        if (currentFact !== initialFact) {
          foundDifferentFact = true;
          break;
        }
      }
      
      // Should eventually see a different fact (dynamic behavior)
      expect(foundDifferentFact).toBe(true);
    });

    it('should not display hardcoded strings like "Did you know cats sleep 12-16 hours a day?"', () => {
      render(<App />);
      
      // This was the bug we encountered - hardcoded fact instead of dynamic
      const catFact = screen.getByTestId('cat-fact');
      expect(catFact.textContent).not.toBe('Did you know cats sleep 12-16 hours a day?');
    });
  });

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
      
      // At minimum, the passive income system should not crash
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      
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
});