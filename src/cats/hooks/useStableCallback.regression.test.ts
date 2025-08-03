/**
 * Regression tests for useStableCallback hook
 * This hook was critical for preventing infinite render loops during refactoring
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useStableCallback, useStableHandlers } from './useStableCallback';

describe('useStableCallback Regression Tests', () => {
  describe('Callback Stability', () => {
    it('should maintain stable reference across re-renders', () => {
      let value = 0;
      const callback = () => value++;

      const { result, rerender } = renderHook(() => useStableCallback(callback));
      
      const firstRef = result.current;
      
      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender();
      }
      
      const secondRef = result.current;
      
      // References should be identical (stable)
      expect(firstRef).toBe(secondRef);
    });

    it('should call the latest callback version', () => {
      let callCount = 0;
      
      const { result, rerender } = renderHook(
        ({ multiplier }) => useStableCallback(() => { callCount += multiplier; }),
        { initialProps: { multiplier: 1 } }
      );
      
      // Call with initial multiplier
      act(() => {
        result.current();
      });
      expect(callCount).toBe(1);
      
      // Change the callback and re-render
      rerender({ multiplier: 5 });
      
      // Call again - should use new multiplier
      act(() => {
        result.current();
      });
      expect(callCount).toBe(6); // 1 + 5
    });

    it('should pass arguments correctly', () => {
      let receivedArgs: unknown[] = [];
      
      const { result } = renderHook(() => 
        useStableCallback((...args: unknown[]) => {
          receivedArgs = args;
        })
      );
      
      const testArgs = [1, 'test', { key: 'value' }, [1, 2, 3]];
      
      act(() => {
        result.current(...testArgs);
      });
      
      expect(receivedArgs).toEqual(testArgs);
    });


  });

  describe('useStableHandlers', () => {
    it('should maintain stable references for multiple handlers', () => {
      const handlers = {
        onClick: () => console.log('click'),
        onHover: () => console.log('hover'),
        onSubmit: () => console.log('submit')
      };

      const { result, rerender } = renderHook(() => useStableHandlers(handlers));
      
      const firstRefs = result.current;
      
      // Re-render multiple times
      for (let i = 0; i < 5; i++) {
        rerender();
      }
      
      const secondRefs = result.current;
      
      // All handler references should be stable
      expect(firstRefs.onClick).toBe(secondRefs.onClick);
      expect(firstRefs.onHover).toBe(secondRefs.onHover);
      expect(firstRefs.onSubmit).toBe(secondRefs.onSubmit);
    });

    it('should call updated handler implementations', () => {
      let clickCount = 0;
      let hoverCount = 0;
      
      const { result, rerender } = renderHook(
        ({ multiplier }) => useStableHandlers({
          onClick: () => { clickCount += multiplier; },
          onHover: () => { hoverCount += multiplier; }
        }),
        { initialProps: { multiplier: 1 } }
      );
      
      // Call with initial multiplier
      act(() => {
        result.current.onClick();
        result.current.onHover();
      });
      expect(clickCount).toBe(1);
      expect(hoverCount).toBe(1);
      
      // Update handlers and re-render
      rerender({ multiplier: 3 });
      
      // Call again - should use new implementations
      act(() => {
        result.current.onClick();
        result.current.onHover();
      });
      expect(clickCount).toBe(4); // 1 + 3
      expect(hoverCount).toBe(4); // 1 + 3
    });

    it('should handle dynamic handler addition and removal', () => {
      const { result, rerender } = renderHook(
        ({ includeSubmit }) => useStableHandlers({
          onClick: () => 'click',
          ...(includeSubmit && { onSubmit: () => 'submit' })
        }),
        { initialProps: { includeSubmit: true } }
      );
      
      // Initially has both handlers
      expect(result.current.onClick).toBeDefined();
      expect(result.current.onSubmit).toBeDefined();
      
      // Remove submit handler
      rerender({ includeSubmit: false });
      
      expect(result.current.onClick).toBeDefined();
      expect(result.current.onSubmit).toBeUndefined();
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should not create new functions on every call', () => {
      const { result } = renderHook(() => useStableCallback(() => 'test'));
      
      const calls = Array.from({ length: 100 }, () => result.current);
      
      // All calls should return the same function reference
      expect(new Set(calls).size).toBe(1);
    });

    it('should handle high-frequency updates efficiently', () => {
      let updateCount = 0;
      
      const { result, rerender } = renderHook(
        ({ value }) => useStableCallback(() => value),
        { initialProps: { value: 0 } }
      );
      
      // Rapidly update the callback 100 times
      for (let i = 0; i < 100; i++) {
        rerender({ value: i });
        updateCount++;
      }
      
      // Should complete without performance issues
      expect(updateCount).toBe(100);
      
      // Final call should use latest value
      let finalValue: number;
      act(() => {
        finalValue = result.current();
      });
      expect(finalValue!).toBe(99);
    });
  });
});