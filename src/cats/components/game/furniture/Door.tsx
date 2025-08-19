import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface DoorProps {
  x: number;
  z: number;
}

/**
 * Door - Unified Rendering System
 * 
 * Migrated from legacy positioning to unified system.
 * Key improvements:
 * - Consistent scaling and positioning
 * - Standardized coordinate system usage
 * - Proper responsive behavior
 */

// Door with frame and handle - realistic proportions
const VB_W = 240; // Made wider for more realistic proportions
const VB_H = 570; // Keep height for realism

const Door: React.FC<DoorProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'door',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="door">
      {/* SVG content with consistent styling */}
      <defs>
        <linearGradient id="doorFrame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#a0522d" />
          <stop offset="100%" stopColor="#8d6e63" />
        </linearGradient>
        <linearGradient id="doorPanel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b4513" />
          <stop offset="30%" stopColor="#a0522d" />
          <stop offset="70%" stopColor="#cd853f" />
          <stop offset="100%" stopColor="#d2b48c" />
        </linearGradient>
      </defs>

      {/* Door frame */}
      <rect x={0} y={0} width={VB_W} height={VB_H} rx={6} fill="url(#doorFrame)" />

      {/* Door panel (inset) - even edges on both sides */}
      <rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} rx={4} fill="url(#doorPanel)" />

      {/* Door panel embossed rim - even margins, positioned to not overlap door knob */}
      <rect x={12} y={20} width={VB_W - 24} height={VB_H - 40} rx={2} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1.5" />
      <rect x={13} y={21} width={VB_W - 26} height={VB_H - 42} rx={1} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

      {/* Door handle - positioned outside the embossed rim */}
      <circle cx={VB_W - 18} cy={VB_H / 2} r={10} fill="#f4d03f" />
      <circle cx={VB_W - 18} cy={VB_H / 2} r={7} fill="#e6c547" />
      <circle cx={VB_W - 18} cy={VB_H / 2} r={3} fill="#f0d84a" />
    </UnifiedFurnitureRenderer>
  );
};

export default Door;
