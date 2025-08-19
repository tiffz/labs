import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface WindowProps {
  x: number;
  z: number;
}

/**
 * Window - Unified Rendering System
 * 
 * Migrated from legacy wall positioning to unified system.
 * Key improvements:
 * - Consistent wall coordinate system usage
 * - Standardized scaling and positioning
 * - Proper responsive behavior
 */

// Window with frame, panes, and sill
const VB_W = 630; // Increased from 420 (1.5x bigger)
const VB_H = 480; // Increased from 320 (1.5x bigger)

const Window: React.FC<WindowProps> = ({ x, z }) => {
  // Windows are spawned at Y=180, use that coordinate
  const wallY = 180; // Use the actual spawn Y coordinate
  
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'window',
    ...FurniturePositioning.wall(x, wallY, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
  });

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="window">
        <defs>
          <linearGradient id="windowFrame" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#a0522d" />
            <stop offset="100%" stopColor="#8d6e63" />
          </linearGradient>
          <linearGradient id="windowGlass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(135, 206, 235, 0.3)" />
            <stop offset="100%" stopColor="rgba(135, 206, 235, 0.1)" />
          </linearGradient>
          <linearGradient id="skyGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e8f5e8" />
            <stop offset="50%" stopColor="#d4f0d4" />
            <stop offset="100%" stopColor="#b8e6f5" />
          </linearGradient>
          <linearGradient id="windowSill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffeee6" />
            <stop offset="100%" stopColor="#e6b87d" />
          </linearGradient>
      </defs>

      {/* Window is wall-mounted - no shadow needed */}

      {/* Window sill at bottom (top in SVG coordinates due to Y-flip) */}
      <rect x={-8} y={0} width={VB_W + 16} height={16} rx={4} fill="url(#windowSill)" />

      {/* Window frame */}
      <rect x={0} y={16} width={VB_W} height={VB_H - 16} rx={8} fill="url(#windowFrame)" />

      {/* Sky background - one continuous gradient behind all panes */}
      <rect x={8} y={24} width={VB_W - 16} height={VB_H - 32} rx={4} fill="url(#skyGradient)" />
      
      {/* Window panes (transparent glass overlay only - no backgrounds to break up sky) */}
      <rect x={8} y={24} width={(VB_W - 16) / 2 - 2} height={(VB_H - 32) / 2 - 2} rx={4} fill="rgba(255,255,255,0.1)" />
      <rect x={VB_W / 2 + 2} y={24} width={(VB_W - 16) / 2 - 2} height={(VB_H - 32) / 2 - 2} rx={4} fill="rgba(255,255,255,0.1)" />
      <rect x={8} y={VB_H / 2 + 8} width={(VB_W - 16) / 2 - 2} height={(VB_H - 32) / 2 - 2} rx={4} fill="rgba(255,255,255,0.1)" />
      <rect x={VB_W / 2 + 2} y={VB_H / 2 + 8} width={(VB_W - 16) / 2 - 2} height={(VB_H - 32) / 2 - 2} rx={4} fill="rgba(255,255,255,0.1)" />
      
      {/* Classic cumulus clouds - positioned in sky (higher Y values) */}
      <g fill="rgba(255,255,255,0.85)">
        {/* Left cloud - classic cumulus shape */}
        <ellipse cx={VB_W * 0.22} cy={VB_H * 0.78} rx={20} ry={12} />
        <ellipse cx={VB_W * 0.26} cy={VB_H * 0.74} rx={16} ry={11} />
        <ellipse cx={VB_W * 0.30} cy={VB_H * 0.76} rx={14} ry={9} />
        <ellipse cx={VB_W * 0.34} cy={VB_H * 0.79} rx={12} ry={8} />
        <ellipse cx={VB_W * 0.28} cy={VB_H * 0.81} rx={18} ry={6} />
      </g>
      <g fill="rgba(255,255,255,0.75)">
        {/* Right cloud - smaller, more distant */}
        <ellipse cx={VB_W * 0.70} cy={VB_H * 0.83} rx={15} ry={9} />
        <ellipse cx={VB_W * 0.74} cy={VB_H * 0.80} rx={12} ry={8} />
        <ellipse cx={VB_W * 0.77} cy={VB_H * 0.82} rx={10} ry={6} />
        <ellipse cx={VB_W * 0.72} cy={VB_H * 0.85} rx={13} ry={5} />
      </g>

      {/* Window cross (dividers) - made thicker for better art style match */}
      <rect x={VB_W / 2 - 2.5} y={24} width={5} height={VB_H - 32} fill="url(#windowFrame)" />
      <rect x={8} y={VB_H / 2 + 2.5 + 8} width={VB_W - 16} height={5} fill="url(#windowFrame)" />

      {/* Window frame inner border - made thicker */}
      <rect x={4} y={20} width={VB_W - 8} height={VB_H - 24} rx={6} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
    </UnifiedFurnitureRenderer>
  );
};

export default Window;
