import React from 'react';
import { floorSpaceManager } from '../../services/FloorSpaceManager';
import type { FloorSpaceConfig } from '../../services/FloorSpaceManager';

/**
 * Hook for creating rug configurations
 */
export function useRugConfig(x: number, z: number, width: number, depth: number): FloorSpaceConfig {
  return React.useMemo(() => 
    floorSpaceManager.createRugConfig(x, z, width, depth),
    [x, z, width, depth]
  );
}
