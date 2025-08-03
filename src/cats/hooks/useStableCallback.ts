import { useRef, useCallback } from 'react';

/**
 * Creates a stable callback that doesn't change between renders.
 * This prevents infinite loops in useEffect dependencies.
 * 
 * @param callback The callback function
 * @returns A stable callback reference
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  // Always keep the ref up to date
  callbackRef.current = callback;
  
  // Return a stable callback that calls the current function
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * Creates stable event handlers that won't cause re-renders
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useStableHandlers<T extends Record<string, (...args: any[]) => any>>(
  handlers: T
): T {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Track the keys to detect when handlers are added/removed
  const keysRef = useRef<string[]>([]);
  const stableHandlersRef = useRef({} as T);
  
  const currentKeys = Object.keys(handlers);
  const keysChanged = 
    keysRef.current.length !== currentKeys.length ||
    !keysRef.current.every(key => currentKeys.includes(key));

  if (keysChanged) {
    keysRef.current = currentKeys;
    stableHandlersRef.current = currentKeys.reduce((stableHandlers, key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (stableHandlers as any)[key] = (...args: unknown[]) => {
        return handlersRef.current[key](...args);
      };
      return stableHandlers;
    }, {} as T);
  }

  return stableHandlersRef.current;
}