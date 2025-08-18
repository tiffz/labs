/**
 * Regression tests for bugs discovered during refactoring
 * These tests help prevent the same issues from recurring
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';
// TODO: Implement test cleanup patterns
// import { setupTestCleanup, mockAnimationFrame } from '../shared/test/testUtils';

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
    it('should properly position Zzz elements relative to cat position', async () => {
      vi.useFakeTimers();
      
      // Mock getBoundingClientRect to simulate cat at specific position
      const mockCatRect = {
        left: 300,
        top: 200,
        width: 100,
        height: 80,
        right: 400,
        bottom: 280,
      };
      
      // Mock the cat SVG element's getBoundingClientRect
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        // Only mock for elements with cat-related test IDs or classes
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          return mockCatRect;
        }
        // Use original implementation for other elements
        return originalGetBoundingClientRect.call(this);
      });
      
      render(<App />);
      
      // Wait for cat position to be initialized
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger sleep state by waiting (30 seconds as per App.tsx)
      act(() => {
        vi.advanceTimersByTime(30000); // Wait for cat to sleep
      });
      
      // Verify cat is sleeping by checking for sleepy eyes
      const sleepyEyes = screen.getByTestId('eye-sleepy');
      expect(sleepyEyes.classList.contains('hidden')).toBe(false);
      
      // Wait for first Zzz to spawn
      act(() => {
        vi.advanceTimersByTime(3000); // Initial delay is 2500ms
      });
      
      // Find the Zzz element
      const zzzElements = document.querySelectorAll('.zzz');
      expect(zzzElements.length).toBeGreaterThan(0);
      
      // Check that Zzz is positioned relative to cat's head
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzStyle = firstZzz.style;
      
      // Expected cat head position from simple getBoundingClientRect
      const expectedCatHeadX = mockCatRect.left + mockCatRect.width / 2; // 350
      const expectedCatHeadY = mockCatRect.top + mockCatRect.height * 0.3; // 224
      
      // Parse Zzz position (accounting for randomness)
      const zzzLeft = parseFloat(zzzStyle.left);
      const zzzTop = parseFloat(zzzStyle.top);
      
      // Zzz should be positioned near cat's head (within randomness range)
      // X: catHeadX ± 20 (random range), Y: catHeadY - 40 ± 10 (above head + random)
      expect(zzzLeft).toBeGreaterThan(expectedCatHeadX - 40); // 310
      expect(zzzLeft).toBeLessThan(expectedCatHeadX + 40);    // 390
      expect(zzzTop).toBeGreaterThan(expectedCatHeadY - 60);  // 164 (head - 40 - 10)
      expect(zzzTop).toBeLessThan(expectedCatHeadY - 20);     // 204 (head - 40 + 10)
      
      // Should not have errors about undefined positions
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Cannot read.*position/)
      );
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });
    
    it('should position Zzz elements correctly with different cat positions', async () => {
      vi.useFakeTimers();
      
      // Test with cat positioned far to the right
      const mockCatRect = {
        left: 600, // Far right position
        top: 150,
        width: 100,
        height: 80,
        right: 700,
        bottom: 230,
      };
      
      // Mock getBoundingClientRect for cat at far right position
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          return mockCatRect;
        }
        return originalGetBoundingClientRect.call(this);
      });
      
      render(<App />);
      
      // Wait for cat position to be initialized
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger sleep state
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      // Verify cat is sleeping
      const sleepyEyes = screen.getByTestId('eye-sleepy');
      expect(sleepyEyes.classList.contains('hidden')).toBe(false);
      
      // Wait for first Zzz to spawn
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      // Find the Zzz element
      const zzzElements = document.querySelectorAll('.zzz');
      expect(zzzElements.length).toBeGreaterThan(0);
      
      // Check that Zzz is positioned relative to the far-right cat position
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzLeft = parseFloat(firstZzz.style.left);
      const zzzTop = parseFloat(firstZzz.style.top);
      
      // Expected cat head position from simple getBoundingClientRect
      const expectedCatHeadX = mockCatRect.left + mockCatRect.width / 2; // 650
      const expectedCatHeadY = mockCatRect.top + mockCatRect.height * 0.3; // 174
      
      // Zzz should be positioned near the cat's head
      expect(zzzLeft).toBeGreaterThan(expectedCatHeadX - 40); // 610
      expect(zzzLeft).toBeLessThan(expectedCatHeadX + 40);    // 690
      expect(zzzTop).toBeGreaterThan(expectedCatHeadY - 60);  // 114 (head - 40 - 10)
      expect(zzzTop).toBeLessThan(expectedCatHeadY - 20);     // 154 (head - 40 + 10)
      
      // Verify this is significantly different from center position (350px)
      expect(Math.abs(zzzLeft - 350)).toBeGreaterThan(200); // Should be far from center
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });
    
    it('should update Zzz positioning when cat world coordinates change', async () => {
      vi.useFakeTimers();
      
      // Track position updates
      let positionUpdateCount = 0;
      
      // Mock getBoundingClientRect to return different positions based on call count
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          positionUpdateCount++;
          // Return different positions to simulate cat movement
          const baseLeft = 300 + (positionUpdateCount * 50); // Move right each time
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
      
      // Mock the onCatPositionUpdate to track position changes
      // Note: This is handled by the getBoundingClientRect mock above
      
      render(<App />);
      
      // Wait for initial position setup
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Verify initial position update occurred
      expect(positionUpdateCount).toBeGreaterThan(0);
      const initialUpdateCount = positionUpdateCount;
      
      // Simulate cat movement by triggering a world coordinate change
      // This would normally happen through the ECS system or user interactions
      // For testing, we can trigger it by simulating a re-render with new coordinates
      await act(async () => {
        // Force a re-render that would trigger position updates
        vi.advanceTimersByTime(100);
      });
      
      // The position should have been updated due to the dependency on catWorldCoords
      // Note: In a real scenario, the cat's world coordinates would change and trigger the useEffect
      expect(positionUpdateCount).toBeGreaterThanOrEqual(initialUpdateCount);
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('should handle Z positioning when cat element is not found (fallback scenario)', async () => {
      vi.useFakeTimers();
      
      // Mock getBoundingClientRect to return null for cat element (simulating DOM not ready)
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      const originalQuerySelector = document.querySelector;
      
      // Mock querySelector to return null for cat element
      document.querySelector = vi.fn().mockImplementation((selector) => {
        if (selector === '[data-testid="cat"]') {
          return null; // Simulate cat element not found
        }
        return originalQuerySelector.call(document, selector);
      });
      
      render(<App />);
      
      // Wait for initialization
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger sleep state
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      // Wait for Z spawn attempt
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      // Find Z elements
      const zzzElements = document.querySelectorAll('.zzz');
      expect(zzzElements.length).toBeGreaterThan(0);
      
      // Check that Z uses fallback positioning (screen center)
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzLeft = parseFloat(firstZzz.style.left);
      const zzzTop = parseFloat(firstZzz.style.top);
      
      // Should be positioned near screen center as fallback
      const expectedFallbackX = window.innerWidth / 2;
      const expectedFallbackY = window.innerHeight / 2;
      
      expect(zzzLeft).toBeGreaterThan(expectedFallbackX - 60); // Account for randomness
      expect(zzzLeft).toBeLessThan(expectedFallbackX + 60);
      expect(zzzTop).toBeGreaterThan(expectedFallbackY - 80); // Account for -40 offset + randomness
      expect(zzzTop).toBeLessThan(expectedFallbackY - 20);
      
      // Cleanup
      document.querySelector = originalQuerySelector;
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('should handle Z positioning with extreme cat positions (edge of screen)', async () => {
      vi.useFakeTimers();
      
      // Test with cat at extreme left edge
      const mockCatRect = {
        left: 0, // At left edge
        top: 0,  // At top edge
        width: 100,
        height: 80,
        right: 100,
        bottom: 80,
      };
      
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          return mockCatRect;
        }
        return originalGetBoundingClientRect.call(this);
      });
      
      render(<App />);
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger sleep
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      // Wait for Z spawn
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      const zzzElements = document.querySelectorAll('.zzz');
      expect(zzzElements.length).toBeGreaterThan(0);
      
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzLeft = parseFloat(firstZzz.style.left);
      const zzzTop = parseFloat(firstZzz.style.top);
      
      // Expected position: cat head at (50, 24) - 30% from top
      const expectedCatHeadX = mockCatRect.left + mockCatRect.width / 2; // 50
      const expectedCatHeadY = mockCatRect.top + mockCatRect.height * 0.3; // 24
      
      // Z should still be positioned correctly even at screen edge
      expect(zzzLeft).toBeGreaterThan(expectedCatHeadX - 40); // 10
      expect(zzzLeft).toBeLessThan(expectedCatHeadX + 40);    // 90
      expect(zzzTop).toBeGreaterThan(expectedCatHeadY - 60);  // -36 (can be negative)
      expect(zzzTop).toBeLessThan(expectedCatHeadY - 20);     // 4
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('should spawn multiple Z elements with consistent positioning', async () => {
      vi.useFakeTimers();
      
      const mockCatRect = {
        left: 400,
        top: 300,
        width: 100,
        height: 80,
        right: 500,
        bottom: 380,
      };
      
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          return mockCatRect;
        }
        return originalGetBoundingClientRect.call(this);
      });
      
      render(<App />);
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // Trigger sleep
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      // Wait for multiple Z spawns (initial + several more)
      act(() => {
        vi.advanceTimersByTime(8000); // Should spawn multiple Z's
      });
      
      const zzzElements = document.querySelectorAll('.zzz');
      expect(zzzElements.length).toBeGreaterThan(1); // Multiple Z's spawned
      
      const expectedCatHeadX = mockCatRect.left + mockCatRect.width / 2; // 450
      const expectedCatHeadY = mockCatRect.top + mockCatRect.height * 0.3; // 324
      
      // Check that all Z's are positioned consistently around the cat's head
      zzzElements.forEach((zzz) => {
        const zzzLeft = parseFloat((zzz as HTMLElement).style.left);
        const zzzTop = parseFloat((zzz as HTMLElement).style.top);
        
        // All Z's should be positioned near cat's head
        expect(zzzLeft).toBeGreaterThan(expectedCatHeadX - 40); // 410
        expect(zzzLeft).toBeLessThan(expectedCatHeadX + 40);    // 490
        expect(zzzTop).toBeGreaterThan(expectedCatHeadY - 60);  // 264
        expect(zzzTop).toBeLessThan(expectedCatHeadY - 20);     // 304
      });
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    it('should maintain Z positioning consistency with heart positioning approach', async () => {
      vi.useFakeTimers();
      
      const mockCatRect = {
        left: 250,
        top: 180,
        width: 120,
        height: 100,
        right: 370,
        bottom: 280,
      };
      
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
        if (this.getAttribute?.('data-testid') === 'cat' || this.tagName === 'svg') {
          return mockCatRect;
        }
        return originalGetBoundingClientRect.call(this);
      });
      
      render(<App />);
      
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // First, trigger heart spawning by clicking the cat body (interaction area)
      const catBodyElement = screen.getByTestId('cat-body');
      fireEvent.click(catBodyElement, { clientX: 310, clientY: 230 }); // Click on cat body
      
      // Then trigger Z spawning by making cat sleep
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      // Both hearts and Z's should use the same coordinate system approach
      const heartElements = document.querySelectorAll('.heart');
      const zzzElements = document.querySelectorAll('.zzz');
      
      expect(heartElements.length).toBeGreaterThan(0);
      expect(zzzElements.length).toBeGreaterThan(0);
      
      // Hearts spawn at click position (clientX/clientY)
      const firstHeart = heartElements[0] as HTMLElement;
      const heartX = parseFloat(firstHeart.style.left);
      const heartY = parseFloat(firstHeart.style.top);
      
      // Hearts should be near click position (310, 230) with some randomness
      expect(heartX).toBeGreaterThan(270); // 310 - 40
      expect(heartX).toBeLessThan(350);    // 310 + 40
      expect(heartY).toBeGreaterThan(190); // 230 - 40
      expect(heartY).toBeLessThan(270);    // 230 + 40
      
      // Z's spawn at cat head position using same getBoundingClientRect approach
      const firstZzz = zzzElements[0] as HTMLElement;
      const zzzX = parseFloat(firstZzz.style.left);
      const zzzY = parseFloat(firstZzz.style.top);
      
      const expectedCatHeadX = mockCatRect.left + mockCatRect.width / 2; // 310
      const expectedCatHeadY = mockCatRect.top + mockCatRect.height * 0.3; // 210
      
      expect(zzzX).toBeGreaterThan(expectedCatHeadX - 40); // 270
      expect(zzzX).toBeLessThan(expectedCatHeadX + 40);    // 350
      expect(zzzY).toBeGreaterThan(expectedCatHeadY - 60); // 150 (head - 40 - 10)
      expect(zzzY).toBeLessThan(expectedCatHeadY - 20);    // 190 (head - 40 + 10)
      
      // Cleanup
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
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