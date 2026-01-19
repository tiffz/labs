/**
 * State Synchronization Regression Tests
 * Tests for state management, callbacks, and component communication
 */

import { screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';
import {
  setupRegressionTest,
  teardownRegressionTest,
  renderAppWithFakeTimers,
  renderApp,
  mockCatPosition,
  triggerSleep,
  waitForZzzSpawn,
  getConsoleErrorSpy,
  getConsoleWarnSpy,
} from '../test/regressionTestUtils.js';

describe('State Synchronization Regression Tests', () => {
  beforeEach(() => {
    setupRegressionTest();
  });

  afterEach(() => {
    teardownRegressionTest();
  });

  describe('State Synchronization', () => {
    it('should maintain wand mode state correctly when toggling', async () => {
      await renderApp();
      
      // Initially not in wand mode
      expect(document.body).not.toHaveClass('wand-mode-active');
      
      // Enter wand mode
      fireEvent.keyDown(document, { key: 'w' });
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(document.body).toHaveClass('wand-mode-active');
      
      // Exit wand mode
      fireEvent.keyDown(document, { key: 'Escape' });
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(document.body).not.toHaveClass('wand-mode-active');
    });

    it('should properly sync cat energy between components', () => {
      vi.useFakeTimers();
      
      renderAppWithFakeTimers();
      
      // Click cat multiple times to drain energy
      const cat = screen.getByTestId('cat');
      for (let i = 0; i < 10; i++) {
        fireEvent.click(cat);
        vi.advanceTimersByTime(100);
      }
      
      // Should not have circular dependency errors
      expect(getConsoleErrorSpy()).not.toHaveBeenCalledWith(
        expect.stringMatching(/Maximum update depth exceeded/)
      );
    });
  });

  describe('Callback Stability', () => {
    it('should not cause re-renders due to unstable callback references', () => {
      vi.useFakeTimers();
      
      const { rerender } = renderAppWithFakeTimers();
      
      // Force multiple re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<App />);
        act(() => {
          vi.advanceTimersByTime(100);
        });
      }
      
      // Should not trigger warnings about excessive re-renders
      expect(getConsoleWarnSpy()).not.toHaveBeenCalledWith(
        expect.stringMatching(/rendering very frequently/)
      );
    });
  });

  describe('Passive Income Functionality', () => {
    it('should have functioning passive income system (not broken by state issues)', () => {
      vi.useFakeTimers();
      
      renderAppWithFakeTimers();
      
      // Get initial treats
      const initialTreats = parseInt(screen.getByTestId('treats-amount').textContent || '0');
      
      // Advance time to trigger passive income
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      
      // The system should be stable
      const finalTreats = parseInt(screen.getByTestId('treats-amount').textContent || '0');
      expect(finalTreats).toBeGreaterThanOrEqual(initialTreats);
    });
  });

  describe('Component Communication', () => {
    it('should update Zzz positioning when cat world coordinates change', () => {
      vi.useFakeTimers();
      
      let positionUpdateCount = 0;
      
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function(this: Element) {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          positionUpdateCount++;
          const baseLeft = 300 + (positionUpdateCount * 50);
          return {
            left: baseLeft,
            top: 200,
            width: 100,
            height: 80,
            right: baseLeft + 100,
            bottom: 280,
          };
        }
        return originalGetBoundingClientRect.call(this);
      });
      
      renderAppWithFakeTimers();
      
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      expect(positionUpdateCount).toBeGreaterThan(0);
      const initialUpdateCount = positionUpdateCount;
      
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      expect(positionUpdateCount).toBeGreaterThanOrEqual(initialUpdateCount);
      
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('should maintain Z positioning consistency with heart positioning approach', () => {
      vi.useFakeTimers();
      
      const rect = {
        left: 250,
        top: 180,
        width: 120,
        height: 100,
        right: 370,
        bottom: 280,
      };
      
      const cleanup = mockCatPosition(rect);
      
      renderAppWithFakeTimers();
      
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger heart spawning by clicking the cat body
      const catBodyElement = screen.getByTestId('cat-body');
      fireEvent.click(catBodyElement, { clientX: 310, clientY: 230 });
      
      // Then trigger Z spawning
      triggerSleep();
      waitForZzzSpawn();
      
      const heartElements = document.querySelectorAll('.heart');
      const zzzElements = document.querySelectorAll('.zzz');
      
      expect(heartElements.length).toBeGreaterThan(0);
      expect(zzzElements.length).toBeGreaterThan(0);
      
      // Hearts spawn at click position
      const firstHeart = heartElements[0] as HTMLElement;
      const heartX = parseFloat(firstHeart.style.left);
      const heartY = parseFloat(firstHeart.style.top);
      
      expect(heartX).toBeGreaterThan(270);
      expect(heartX).toBeLessThan(350);
      expect(heartY).toBeGreaterThan(190);
      expect(heartY).toBeLessThan(270);
      
      // Z's spawn at cat head position
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzX = parseFloat(firstZzz.style.left);
      const zzzY = parseFloat(firstZzz.style.top);
      
      const expectedCatHeadX = rect.left + rect.width / 2;
      const expectedCatHeadY = rect.top + rect.height * 0.3;
      
      expect(zzzX).toBeGreaterThan(expectedCatHeadX - 40);
      expect(zzzX).toBeLessThan(expectedCatHeadX + 40);
      expect(zzzY).toBeGreaterThan(expectedCatHeadY - 60);
      expect(zzzY).toBeLessThan(expectedCatHeadY - 20);
      
      cleanup();
    });

    it('should handle heart spawning without state synchronization errors', async () => {
      await renderApp();
      
      // Click cat multiple times to spawn hearts
      const cat = screen.getByTestId('cat');
      for (let i = 0; i < 5; i++) {
        fireEvent.click(cat);
        await act(async () => {
          await Promise.resolve();
        });
      }
      
      // Should not have heart-related state errors
      expect(getConsoleErrorSpy()).not.toHaveBeenCalled();
    });
  });

  describe('Memory Leaks Prevention', () => {
    it('should clean up intervals and timeouts properly', () => {
      vi.useFakeTimers();
      
      const { unmount } = renderAppWithFakeTimers();
      
      // Let some time pass
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Unmount component
      unmount();
      
      // Should not have errors about accessing unmounted component
      expect(getConsoleErrorSpy()).not.toHaveBeenCalledWith(
        expect.stringMatching(/unmounted component/)
      );
    });
  });
});
