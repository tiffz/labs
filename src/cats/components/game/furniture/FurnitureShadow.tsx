import React from 'react';
import { getFurnitureConfig } from '../../../data/furnitureData';
import { ABSOLUTE_SHADOW_HEIGHT } from '../../../services/ShadowLayout';
// import { catCoordinateSystem } from '../../../services/CatCoordinateSystem'; // Removed unused import

interface FurnitureShadowProps {
  kind: string;
  viewBoxWidth: number;
  viewBoxHeight?: number; // Optional since not always used
  massWidth?: number; // Optional override for actual mass width (defaults to viewBoxWidth)
}

/**
 * Renders appropriate shadow for furniture based on its floor occupation
 */
export const FurnitureShadow: React.FC<FurnitureShadowProps> = ({ kind, viewBoxWidth, massWidth }) => {
  const config = getFurnitureConfig(kind);
  
  // Wall-mounted items that don't occupy floor space have no shadow
  if (!config?.constraints.occupiesFloor) {
    return null;
  }

  // Calculate shadow dimensions - use mass width (or full width) and adjust height for proper proportions
  const shadowWidth = massWidth ?? viewBoxWidth; // Use mass width if provided, otherwise full viewBox width
  
  // With uniform world scaling, shadows scale naturally with the coordinate system
  // For narrow objects, reduce shadow height to maintain proper proportions
  // This prevents oversized shadows on small furniture like lamps and scratching posts
  const aspectRatio = shadowWidth / ABSOLUTE_SHADOW_HEIGHT;
  
  // If the object is very narrow, scale down the shadow height proportionally
  // This keeps shadows proportional to the object size while maintaining a reasonable minimum
  const minAspectRatio = 2.5; // Minimum width-to-height ratio for shadows (increased for shorter shadows)
  const shadowDepth = aspectRatio < minAspectRatio 
    ? shadowWidth / minAspectRatio  // Scale height down to maintain minimum aspect ratio
    : ABSOLUTE_SHADOW_HEIGHT;       // Use full height for wider objects

  return (
    <ellipse 
      cx={viewBoxWidth / 2} 
      cy={0} 
      rx={shadowWidth / 2} 
      ry={shadowDepth / 2} // ry is radius, so divide by 2 to match cat shadow height
      fill="rgba(0,0,0,0.16)" 
    />
  );
};
