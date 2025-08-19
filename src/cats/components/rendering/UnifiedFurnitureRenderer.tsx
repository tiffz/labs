import React from 'react';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { useCoordinateSystem } from '../../hooks/useCoordinateSystem';
import { layerForZ } from './zLayer';
import { isOverlayEnabled } from '../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../debug/overlay.tsx';
import { FurnitureShadow } from '../game/furniture/FurnitureShadow';


/**
 * Unified Furniture Renderer
 * 
 * This component provides a consistent, standardized approach to rendering
 * all furniture items with unified scaling, positioning, and responsive behavior.
 * 
 * Key principles:
 * 1. Single coordinate system (catToScreen for floor, wallToScreen for wall)
 * 2. Consistent scaling approach (no arbitrary multipliers)
 * 3. Standardized positioning (centered, bottom-aligned)
 * 4. Unified shadow system
 * 5. Consistent responsive behavior
 */

export interface FurnitureConfig {
  // Basic properties
  kind: string;
  x: number;
  z: number;
  y?: number; // For wall-mounted items
  
  // Rendering properties
  viewBoxWidth: number;
  viewBoxHeight: number;
  placement: 'floor' | 'wall';
  
  // Optional overrides
  massWidth?: number; // For shadow calculations
  scaleMultiplier?: number; // Default: 1.0, use sparingly
  zIndexOffset?: number; // Default: 0
}

export interface UnifiedFurnitureRendererProps extends FurnitureConfig {
  children: React.ReactNode; // SVG content
  className?: string;
  ariaLabel?: string;
}

/**
 * Unified furniture renderer that ensures consistent positioning and scaling
 */
export const UnifiedFurnitureRenderer: React.FC<UnifiedFurnitureRendererProps> = ({
  kind,
  x,
  z,
  y,
  viewBoxWidth,
  viewBoxHeight,
  placement,
  massWidth,
  scaleMultiplier = 1.0,
  zIndexOffset = 0,
  children,
  className = '',
  ariaLabel
}) => {
  // Subscribe to coordinate system changes for responsive behavior
  useCoordinateSystem();
  
  // Calculate screen position using appropriate coordinate system
  const screenPos = placement === 'wall' 
    ? catCoordinateSystem.wallToScreen({ x, y: y ?? 0, z })
    : catCoordinateSystem.catToScreen({ x, y: 0, z });
  
  // Apply consistent scaling
  const scale = screenPos.scale * scaleMultiplier;
  const w = Math.round(viewBoxWidth * scale);
  const h = Math.round(viewBoxHeight * scale);
  
  // Consistent positioning: centered horizontally, bottom-aligned
  const left = screenPos.x - w / 2;
  const bottom = Math.round(screenPos.y);
  
  // Consistent z-index calculation
  const zIndex = layerForZ(z, 'entity') + zIndexOffset;
  
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${bottom}px`,
    transform: `translate3d(${left}px, 0, 0)`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex,
    willChange: 'transform',
  };

  // Mass box for overlays - use massWidth if provided, otherwise full width
  const massBoxWidth = massWidth ?? viewBoxWidth;
  const MASS = { 
    left: (viewBoxWidth - massBoxWidth) / 2, 
    right: (viewBoxWidth + massBoxWidth) / 2, 
    top: 0, 
    bottom: viewBoxHeight 
  };

  return (
    <div 
      className={`unified-furniture ${kind} ${className}`} 
      aria-label={ariaLabel ?? kind} 
      style={containerStyle}
    >
      <svg 
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
        width="100%" 
        height="100%" 
        style={{ overflow: 'visible' }}
      >
        {/* Flip Y coordinate system to make y=0 the baseline */}
        <g transform={`translate(0 ${viewBoxHeight}) scale(1,-1)`}>
          {/* Unified shadow system */}
          <FurnitureShadow 
            kind={kind} 
            viewBoxWidth={viewBoxWidth} 
            viewBoxHeight={viewBoxHeight}
            massWidth={massWidth}
          />
          
          {/* Furniture content */}
          {children}
        </g>
      </svg>

      {/* Debug overlays */}
      {isOverlayEnabled() && (
        <>
          <BaselineOverlay x={0} width={w} y={0} />
          {(() => {
            const scaleX = w / viewBoxWidth;
            const scaleY = h / viewBoxHeight;
            return (
              <MassBoxOverlay
                left={MASS.left * scaleX}
                bottom={0}
                width={(MASS.right - MASS.left) * scaleX}
                height={(MASS.bottom - 0) * scaleY}
              />
            );
          })()}
        </>
      )}
    </div>
  );
};


