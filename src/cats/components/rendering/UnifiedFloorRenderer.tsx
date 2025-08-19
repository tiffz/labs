import React from 'react';
import { floorSpaceManager, type FloorSpaceConfig } from '../../services/FloorSpaceManager';
import { useCoordinateSystem } from '../../hooks/useCoordinateSystem';
import { isOverlayEnabled } from '../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../debug/overlay.tsx';

/**
 * Unified Floor Renderer
 * 
 * This component provides consistent rendering for floor-based elements
 * like rugs, shadows, and floor decorations. Unlike furniture, these
 * elements scale with floor dimensions (worldScale only) rather than
 * perspective scaling.
 * 
 * Key differences from UnifiedFurnitureRenderer:
 * 1. Uses floor-relative scaling (worldScale only)
 * 2. Maintains consistent proportions relative to floor space
 * 3. Renders underneath furniture (negative z-index)
 * 4. No perspective scaling - elements maintain consistent size relative to floor
 */

export interface UnifiedFloorRendererProps {
  config: FloorSpaceConfig;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const UnifiedFloorRenderer: React.FC<UnifiedFloorRendererProps> = ({
  config,
  children,
  className = '',
  ariaLabel
}) => {
  // Subscribe to coordinate system changes for responsive behavior
  useCoordinateSystem();
  
  // Calculate floor-relative layout
  const layout = floorSpaceManager.calculateFloorLayout(config);
  
  // Get floor-appropriate z-index
  const zIndex = floorSpaceManager.getFloorZIndex(layout.floorDepthRatio);
  
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${layout.screenY}px`,
    transform: `translate3d(${layout.screenX}px, 0, 0)`,
    width: `${layout.screenWidth}px`,
    height: `${layout.screenHeight}px`,
    zIndex,
    willChange: 'transform',
  };

  return (
    <div 
      className={`unified-floor-element ${className}`} 
      aria-label={ariaLabel} 
      style={containerStyle}
    >
      <svg 
        viewBox={`0 0 ${config.visualWidth} ${config.visualHeight}`} 
        width="100%" 
        height="100%" 
        style={{ overflow: 'visible' }}
      >
        {/* Floor elements don't need Y-flip since they're naturally floor-oriented */}
        {children}
      </svg>

      {/* Debug overlays */}
      {isOverlayEnabled() && (
        <>
          <BaselineOverlay x={0} width={layout.screenWidth} y={0} />
          <MassBoxOverlay
            left={0}
            bottom={0}
            width={layout.screenWidth}
            height={layout.screenHeight}
          />
        </>
      )}
    </div>
  );
};




