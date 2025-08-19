import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface LampProps {
  x: number;
  z: number;
}

/**
 * Lamp - Unified Rendering System
 * 
 * Migrated from legacy positioning to unified system.
 * Key improvements:
 * - Consistent scaling and positioning
 * - Standardized coordinate system usage
 * - Proper responsive behavior
 */

// Table lamp with base and shade
const VB_W = 32;
const VB_H = 40;

const Lamp: React.FC<LampProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'lamp',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="lamp">
      {/* SVG content with consistent styling */}
      <defs>
        <linearGradient id="lampBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8d6e63" />
          <stop offset="100%" stopColor="#6d4c41" />
        </linearGradient>
        <linearGradient id="lampShade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </linearGradient>
        <radialGradient id="lampGlow" cx="0.5" cy="0.8" r="0.6">
          <stop offset="0%" stopColor="rgba(255, 248, 220, 0.8)" />
          <stop offset="100%" stopColor="rgba(255, 248, 220, 0)" />
        </radialGradient>
      </defs>

      {/* Lamp base */}
      <ellipse cx={VB_W / 2} cy={4} rx={8} ry={4} fill="url(#lampBase)" />

      {/* Lamp stem */}
      <rect x={VB_W / 2 - 1} y={4} width={2} height={16} fill="url(#lampBase)" />

      {/* Lamp shade */}
      <path 
        d={`M ${VB_W / 2 - 16} ${VB_H} L ${VB_W / 2 + 16} ${VB_H} L ${VB_W / 2 + 12} ${20} L ${VB_W / 2 - 12} ${20} Z`}
        fill="url(#lampShade)"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="1"
      />

      {/* Lamp glow effect */}
      <ellipse cx={VB_W / 2} cy={VB_H - 5} rx={20} ry={8} fill="url(#lampGlow)" />

      {/* Lamp shade rim */}
      <line x1={VB_W / 2 - 16} y1={VB_H} x2={VB_W / 2 + 16} y2={VB_H} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
    </UnifiedFurnitureRenderer>
  );
};

export default Lamp;
