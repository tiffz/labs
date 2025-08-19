import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface CounterProps {
  x: number;
  z: number;
}

/**
 * Counter - Unified Rendering System
 * 
 * Migrated from legacy positioning to unified system.
 * Key improvements:
 * - Consistent scaling and positioning
 * - Standardized coordinate system usage
 * - Proper responsive behavior
 */

// Kitchen counter with cabinet doors and counter top
const VB_W = 400; // Doubled from 200
const VB_H = 240; // Doubled from 120

const Counter: React.FC<CounterProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'counter',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="kitchen counter">
      {/* SVG content with consistent styling */}
      <defs>
        <linearGradient id="counterTop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </linearGradient>
        <linearGradient id="counterBase" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d7a3a3" />
          <stop offset="100%" stopColor="#c2827b" />
        </linearGradient>
        <linearGradient id="cabinetDoor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8b8b8" />
          <stop offset="100%" stopColor="#d7a3a3" />
        </linearGradient>
      </defs>

      {/* Counter base/cabinet body */}
      <rect x={0} y={0} width={VB_W} height={200} rx={8} fill="url(#counterBase)" />

      {/* Counter top */}
      <rect x={0} y={200} width={VB_W} height={40} rx={4} fill="url(#counterTop)" />

      {/* Cabinet doors */}
      <rect x={16} y={24} width={176} height={152} rx={6} fill="url(#cabinetDoor)" stroke="#c2827b" strokeWidth="2" />
      <rect x={208} y={24} width={176} height={152} rx={6} fill="url(#cabinetDoor)" stroke="#c2827b" strokeWidth="2" />

      {/* Door handles */}
      <circle cx={168} cy={100} r={6} fill="#b8860b" />
      <circle cx={232} cy={100} r={6} fill="#b8860b" />

      {/* Counter edge detail */}
      <rect x={0} y={200} width={VB_W} height={8} fill="rgba(0,0,0,0.1)" />
    </UnifiedFurnitureRenderer>
  );
};

export default Counter;
