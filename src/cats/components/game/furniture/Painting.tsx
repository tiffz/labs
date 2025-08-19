import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface PaintingProps {
  x: number;
  y: number; // Wall Y coordinate
  z: number;
  variant?: 'cat' | 'abstract';
  size?: 'small' | 'large';
}

/**
 * Painting - Unified Rendering System
 * 
 * Migrated from legacy inconsistent rendering to unified system.
 * Key improvements:
 * - Consistent wall coordinate system usage
 * - Standardized scaling (no arbitrary multipliers)
 * - Proper responsive behavior
 * - Unified shadow system for wall items
 */

const Painting: React.FC<PaintingProps> = ({ 
  x, 
  y, 
  z, 
  variant = 'cat', 
  size = 'large' 
}) => {
  // Consistent sizing without arbitrary multipliers
  const VB_W = size === 'large' ? 140 : 100;
  const VB_H = size === 'large' ? 100 : 140;

  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: `painting-${variant}-${size}`,
    ...FurniturePositioning.wall(x, y, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel={`${variant} painting`}>
      {/* SVG content with consistent styling */}
      <defs>
        <linearGradient id="paintingFrame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8c8a8" />
          <stop offset="100%" stopColor="#d7a3a3" />
        </linearGradient>
        <linearGradient id="catPainting" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffb6c1" />
          <stop offset="50%" stopColor="#ffc0cb" />
          <stop offset="100%" stopColor="#ffb6c1" />
        </linearGradient>
        <linearGradient id="abstractPainting" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#9370db" />
          <stop offset="33%" stopColor="#8a2be2" />
          <stop offset="66%" stopColor="#4b0082" />
          <stop offset="100%" stopColor="#9370db" />
        </linearGradient>
      </defs>

      {/* Frame */}
      <rect x={0} y={0} width={VB_W} height={VB_H} rx={4} fill="url(#paintingFrame)" />

      {/* Inner border */}
      <rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} rx={2} fill="rgba(0,0,0,0.1)" />

      {/* Picture content */}
      <rect 
        x={10} 
        y={10} 
        width={VB_W - 20} 
        height={VB_H - 20} 
        rx={1} 
        fill={variant === 'cat' ? 'url(#catPainting)' : 'url(#abstractPainting)'} 
      />

      {/* Picture details */}
      {variant === 'cat' ? (
        <g>
          {/* Simple cat silhouette */}
          <ellipse cx={VB_W / 2} cy={VB_H / 2} rx={VB_W * 0.15} ry={VB_H * 0.2} fill="rgba(255,255,255,0.3)" />
          <circle cx={VB_W / 2 - 4} cy={VB_H / 2 + 4} r={2} fill="rgba(0,0,0,0.4)" />
          <circle cx={VB_W / 2 + 4} cy={VB_H / 2 + 4} r={2} fill="rgba(0,0,0,0.4)" />
        </g>
      ) : (
        <g>
          {/* Abstract geometric shapes */}
          <circle cx={VB_W * 0.3} cy={VB_H * 0.3} r={VB_W * 0.1} fill="rgba(255,255,255,0.3)" />
          <rect x={VB_W * 0.5} y={VB_H * 0.2} width={VB_W * 0.3} height={VB_H * 0.4} fill="rgba(0,0,0,0.2)" />
          <polygon 
            points={`${VB_W * 0.2},${VB_H * 0.7} ${VB_W * 0.4},${VB_H * 0.7} ${VB_W * 0.3},${VB_H * 0.9}`} 
            fill="rgba(255,255,255,0.4)" 
          />
        </g>
      )}

      {/* Frame highlight */}
      <rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} rx={3} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
    </UnifiedFurnitureRenderer>
  );
};

export default Painting;
