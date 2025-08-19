/**
 * Hook for subscribing to coordinate system changes
 * 
 * This hook ensures components re-render when the coordinate system updates,
 * which is essential for consistent positioning across viewport changes.
 */

import { useEffect, useState } from 'react';
import { catCoordinateSystem } from '../services/CatCoordinateSystem';

/**
 * Hook that triggers re-renders when the coordinate system changes
 * Returns a version number that increments on each coordinate system update
 */
export function useCoordinateSystem(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Subscribe to coordinate system changes
    const unsubscribe = catCoordinateSystem.subscribe(() => {
      setVersion(prev => prev + 1);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return version;
}
