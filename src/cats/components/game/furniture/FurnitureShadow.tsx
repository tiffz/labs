import React from 'react';
import { getFurnitureConfig } from '../../../data/furnitureData';

interface FurnitureShadowProps {
  kind: string;
  viewBoxWidth: number;
  viewBoxHeight?: number; // Optional since not always used
}

/**
 * Renders appropriate shadow for furniture based on its floor occupation
 */
export const FurnitureShadow: React.FC<FurnitureShadowProps> = ({ kind, viewBoxWidth }) => {
  const config = getFurnitureConfig(kind);
  
  // Wall-mounted items that don't occupy floor space have no shadow
  if (!config?.constraints.occupiesFloor) {
    return null;
  }

  // Calculate shadow dimensions based on actual furniture bounds
  const shadowWidth = Math.min(viewBoxWidth * 0.8, config.bounds.width * 0.6);
  const shadowDepth = Math.max(8, config.bounds.depth * 0.15); // Minimum visible shadow

  return (
    <ellipse 
      cx={viewBoxWidth / 2} 
      cy={0} 
      rx={shadowWidth / 2} 
      ry={shadowDepth} 
      fill="rgba(0,0,0,0.16)" 
    />
  );
};
