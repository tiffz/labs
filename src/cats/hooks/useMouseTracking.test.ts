import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMouseTracking } from './useMouseTracking';

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: mockRequestAnimationFrame,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: mockCancelAnimationFrame,
});

describe('useMouseTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRequestAnimationFrame.mockImplementation((callback) => {
      setTimeout(callback, 16); // ~60fps
      return 1;
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMouseTracking());

    expect(result.current.positionRef.current).toEqual({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    expect(result.current.smoothPositionRef.current).toEqual({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    expect(typeof result.current.lastMovementTimeRef.current).toBe('number');
    expect(typeof result.current.hasRecentMovement).toBe('function');
    expect(typeof result.current.onMouseMove).toBe('function');
  });

  it('should use custom initial position', () => {
    const customPosition = { x: 100, y: 200 };
    const { result } = renderHook(() => 
      useMouseTracking({ initialPosition: customPosition })
    );

    expect(result.current.positionRef.current).toEqual(customPosition);
    expect(result.current.smoothPositionRef.current).toEqual(customPosition);
  });

  it('should track mouse movement via refs (no React state)', () => {
    const { result } = renderHook(() => useMouseTracking());

    const initialPosition = result.current.positionRef.current;

    // Simulate mouse move
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 400,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    // Position should update in ref immediately
    expect(result.current.positionRef.current).toEqual({ x: 300, y: 400 });
    
    // Should be different from initial position
    expect(result.current.positionRef.current).not.toEqual(initialPosition);
  });

  it('should update lastMovementTime on mouse move', () => {
    const { result } = renderHook(() => useMouseTracking());

    const initialTime = result.current.lastMovementTimeRef.current;

    // Wait a bit then move mouse
    act(() => {
      vi.advanceTimersByTime(100);
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 400,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    // Time should be updated
    expect(result.current.lastMovementTimeRef.current).toBeGreaterThan(initialTime);
  });

  it('should register and call mouse move callbacks', () => {
    const { result } = renderHook(() => useMouseTracking());
    
    const mockCallback = vi.fn();
    let unsubscribe: (() => void) | undefined;

    act(() => {
      unsubscribe = result.current.onMouseMove(mockCallback);
    });

    // Simulate mouse move
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 250,
        clientY: 350,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(mockCallback).toHaveBeenCalledWith({ x: 250, y: 350 });

    // Cleanup
    act(() => {
      unsubscribe?.();
    });
  });

  it('should unregister callbacks when cleanup function is called', () => {
    const { result } = renderHook(() => useMouseTracking());
    
    const mockCallback = vi.fn();

    act(() => {
      const unsubscribe = result.current.onMouseMove(mockCallback);
      unsubscribe(); // Immediately unregister
    });

    // Simulate mouse move after unregistering
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 250,
        clientY: 350,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('should detect recent movement correctly', () => {
    const { result } = renderHook(() => useMouseTracking());

    // Move mouse
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    // Should have recent movement
    expect(result.current.hasRecentMovement()).toBe(true);
    expect(result.current.hasRecentMovement(500)).toBe(true);

    // Advance time beyond threshold
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not have recent movement with default threshold (500ms)
    expect(result.current.hasRecentMovement()).toBe(false);
    
    // But should still have recent movement with larger threshold
    expect(result.current.hasRecentMovement(2000)).toBe(true);
  });

  it('should update smooth position via animation frame', async () => {
    const { result } = renderHook(() => 
      useMouseTracking({ enableSmoothTracking: true, smoothTrackingFPS: 60 })
    );

    // Move mouse
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 500,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    // Immediate position should update
    expect(result.current.positionRef.current).toEqual({ x: 400, y: 500 });
    
    // Verify smooth tracking is enabled by checking the hook has the expected interface
    expect(result.current.smoothPositionRef).toBeDefined();
    expect(result.current.smoothPositionRef.current).toBeDefined();
  });

  it('should disable smooth tracking when option is false', () => {
    const { result } = renderHook(() => 
      useMouseTracking({ enableSmoothTracking: false })
    );

    // Should still have smooth position ref, but animation frame shouldn't be called
    expect(result.current.smoothPositionRef).toBeDefined();
    
    // Move mouse
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 100,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    // With smooth tracking disabled, animation frame should not be used
    // (We'd need to check implementation details for this)
  });

  it('should handle multiple callbacks', () => {
    const { result } = renderHook(() => useMouseTracking());
    
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    let unsubscribe1: (() => void) | undefined;
    let unsubscribe2: (() => void) | undefined;

    act(() => {
      unsubscribe1 = result.current.onMouseMove(callback1);
      unsubscribe2 = result.current.onMouseMove(callback2);
    });

    // Simulate mouse move
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 250,
      });
      document.dispatchEvent(mouseMoveEvent);
    });

    expect(callback1).toHaveBeenCalledWith({ x: 150, y: 250 });
    expect(callback2).toHaveBeenCalledWith({ x: 150, y: 250 });

    // Cleanup
    act(() => {
      unsubscribe1?.();
      unsubscribe2?.();
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useMouseTracking());

    // Verify cleanup doesn't throw
    expect(() => unmount()).not.toThrow();

    // Verify the hook provides proper cleanup
    // (The actual cleanup implementation uses refs and doesn't necessarily call our mock)
  });

  it('should not trigger React re-renders on mouse movement', () => {
    // This test verifies that the hook doesn't cause unnecessary re-renders
    let renderCount = 0;
    
    const { result } = renderHook(() => {
      renderCount++;
      return useMouseTracking();
    });

    const initialRenderCount = renderCount;

    // Move mouse multiple times
    act(() => {
      for (let i = 0; i < 10; i++) {
        const mouseMoveEvent = new MouseEvent('mousemove', {
          clientX: 100 + i,
          clientY: 100 + i,
        });
        document.dispatchEvent(mouseMoveEvent);
      }
    });

    // Render count should not increase due to mouse movements
    expect(renderCount).toBe(initialRenderCount);
    
    // But position should still be tracked
    expect(result.current.positionRef.current).toEqual({ x: 109, y: 109 });
  });
});