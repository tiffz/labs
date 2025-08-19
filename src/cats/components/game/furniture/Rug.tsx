import React from 'react';
import { UnifiedFloorRenderer } from '../../rendering/UnifiedFloorRenderer';
import { useRugConfig } from '../../rendering/floorUtils';

interface RugProps {
  x: number;
  z: number;
}

/**
 * Rug - Floor Space Management System
 * 
 * Migrated from furniture rendering to proper floor space system.
 * Key improvements:
 * - Uses floor-relative scaling (worldScale only, no perspective scaling)
 * - Maintains consistent proportions relative to floor space
 * - Proper floor space allocation and logical footprint
 * - Renders underneath all furniture as a true floor element
 */

// Floor space dimensions (in world units) - cozy and spacious
const LOGICAL_WIDTH = 420;  // Logical floor space occupied (more cozy)
const LOGICAL_DEPTH = 100;  // Logical floor depth occupied (more spacious)

const Rug: React.FC<RugProps> = ({ x, z }) => {
  // Create floor space configuration
  const config = useRugConfig(x, z, LOGICAL_WIDTH, LOGICAL_DEPTH);

  return (
    <UnifiedFloorRenderer config={config} ariaLabel="rug" className="rug">
      {/* SVG content - floor-oriented, no Y-flip needed */}
      <defs>
        <radialGradient id="rugPink" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#f4a6cd" />
          <stop offset="70%" stopColor="#e8739f" />
          <stop offset="100%" stopColor="#d64570" />
        </radialGradient>
        <radialGradient id="rugPinkInner" cx="0.5" cy="0.5" r="0.4">
          <stop offset="0%" stopColor="#f8c2d4" />
          <stop offset="100%" stopColor="#f4a6cd" />
        </radialGradient>
      </defs>

      {/* Main pink oval rug - uses visual dimensions from config */}
      <ellipse 
        cx={config.visualWidth / 2} 
        cy={config.visualHeight / 2} 
        rx={config.visualWidth / 2 - 8} 
        ry={config.visualHeight / 2 - 4} 
        fill="url(#rugPink)" 
      />
      
      {/* Inner lighter oval for depth */}
      <ellipse 
        cx={config.visualWidth / 2} 
        cy={config.visualHeight / 2} 
        rx={config.visualWidth / 2 - 20} 
        ry={config.visualHeight / 2 - 12} 
        fill="url(#rugPinkInner)" 
      />
      
      {/* Cute little pattern dots - positioned relative to visual dimensions */}
      <circle cx={config.visualWidth / 2 - 30} cy={config.visualHeight / 2 - 8} r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx={config.visualWidth / 2 + 30} cy={config.visualHeight / 2 - 8} r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx={config.visualWidth / 2} cy={config.visualHeight / 2 + 12} r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx={config.visualWidth / 2 - 15} cy={config.visualHeight / 2 + 3} r="2" fill="rgba(255,255,255,0.3)" />
      <circle cx={config.visualWidth / 2 + 15} cy={config.visualHeight / 2 + 3} r="2" fill="rgba(255,255,255,0.3)" />
    </UnifiedFloorRenderer>
  );
};

export default Rug;
