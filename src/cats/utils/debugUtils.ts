import { useRef } from 'react';

/**
 * Development utility to track component re-renders and detect potential infinite loops
 * Uses time-based render frequency detection instead of cumulative counting
 */
export function useRenderTracker(componentName: string, props?: Record<string, unknown>) {
  const renderTimestamps = useRef<number[]>([]);
  const lastRenderTime = useRef(Date.now());
  const propsRef = useRef(props);
  
  const currentTime = Date.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  lastRenderTime.current = currentTime;
  
  // Track render timestamps for frequency analysis
  renderTimestamps.current.push(currentTime);
  
  // Clean up timestamps older than 2 seconds (sliding window)
  const twoSecondsAgo = currentTime - 2000;
  renderTimestamps.current = renderTimestamps.current.filter(timestamp => timestamp > twoSecondsAgo);
  
  // In development, detect actual infinite loops based on render frequency
  if (process.env.NODE_ENV === 'development') {
    const rendersInLastSecond = renderTimestamps.current.filter(timestamp => timestamp > currentTime - 1000).length;
    const rendersInLast100ms = renderTimestamps.current.filter(timestamp => timestamp > currentTime - 100).length;
    
    // Warn if we have excessive renders in a short time period
    if (rendersInLastSecond > 60) {
      console.warn(`🔄 ${componentName} rendered ${rendersInLastSecond} times in the last second - possible infinite loop!`);
    } else if (rendersInLast100ms > 10) {
      console.warn(`🔄 ${componentName} rendered ${rendersInLast100ms} times in 100ms - rapid re-rendering detected!`);
    }
  }
  
  propsRef.current = props;
  
  return {
    renderCount: renderTimestamps.current.length,
    timeSinceLastRender,
    rendersPerSecond: renderTimestamps.current.filter(timestamp => timestamp > currentTime - 1000).length
  };
}

