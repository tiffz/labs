import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface CouchProps {
  x: number;
  z: number;
}

/**
 * Couch - Unified Rendering System
 * 
 * Migrated from legacy inconsistent rendering to unified system.
 * Key improvements:
 * - Removed arbitrary 1.15x scaling multiplier
 * - Consistent coordinate system subscription
 * - Standardized positioning and shadow system
 * - Proper responsive scaling
 */

// Scaled up art asset dimensions - 1.5x larger than before to make couch appropriately sized
// This replaces the arbitrary scaling factor with properly sized artwork
const VB_W = 480; // 320 * 1.5 - properly sized couch artwork
const VB_H = 270; // 180 * 1.5 - maintains aspect ratio

const Couch: React.FC<CouchProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'couch',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: VB_W,
    viewBoxHeight: VB_H,
    // No arbitrary scale multiplier - let the unified system handle scaling
  });

  // SVG geometry - scaled up 1.5x for proper couch size
  const armW = 39; // 26 * 1.5
  const armH = 108; // 72 * 1.5
  const cushionCount = 4;
  const paddingX = 33; // 22 * 1.5
  const gap = 0;
  const avail = VB_W - paddingX * 2 - gap * (cushionCount - 1);
  const cushionW = avail / cushionCount;
  const cushionH = 44; // 29 * 1.5 (rounded)
  const cushionY = 51; // 34 * 1.5

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="couch">
      {/* SVG content with consistent gradients */}
      <defs>
        <linearGradient id="couchBody" x1="0" x2="0" y1="0" y2="1" gradientTransform="scale(1,-1) translate(0,-1)">
          <stop offset="0%" stopColor="#e7b2bd" />
          <stop offset="55%" stopColor="#d59aa7" />
          <stop offset="100%" stopColor="#b97a87" />
        </linearGradient>
        <linearGradient id="cushionGrad" x1="0" x2="0" y1="0" y2="1" gradientTransform="scale(1,-1) translate(0,-1)">
          <stop offset="0%" stopColor="#f1d0d7" />
          <stop offset="100%" stopColor="#cf9faa" />
        </linearGradient>
        <linearGradient id="baseGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#E6B2BE" />
          <stop offset="100%" stopColor="#CB9CA8" />
        </linearGradient>
        <linearGradient id="armGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#edbcc7" />
          <stop offset="100%" stopColor="#d1a6b1" />
        </linearGradient>
      </defs>

      {/* Back */}
      <rect x={27} y={44} width={VB_W - 54} height={134} rx={18} fill="url(#couchBody)" />

      {/* Cushions */}
      {Array.from({ length: cushionCount }, (_, i) => {
        const x0 = paddingX + i * (cushionW + gap);
        const y0 = cushionY;
        const x1 = x0 + cushionW;
        const y1 = y0 + cushionH;
        const rTop = 20; // 13 * 1.5 (rounded)
        const rBot = 11; // 7 * 1.5 (rounded)
        const d = `M ${x0} ${y0} H ${x1} V ${y1 - rTop} Q ${x1} ${y1} ${x1 - rTop} ${y1} H ${x0 + rTop} Q ${x0} ${y1} ${x0} ${y1 - rTop} V ${y0 + rBot} Q ${x0} ${y0} ${x0 + rBot} ${y0} H ${x1 - rBot} Q ${x1} ${y0} ${x1} ${y0 + rBot} Z`;
        return <path key={i} d={d} fill="url(#cushionGrad)" />;
      })}

      {/* Base */}
      <rect x={27} y={8} width={VB_W - 54} height={51} rx={11} fill="url(#baseGrad)" />

      {/* Arms */}
      {(() => {
        const rTop = 18; // 12 * 1.5
        const rBottom = 6; // 4 * 1.5
        const leftArm = `M 0 ${rBottom} Q 0 0 ${rBottom} 0 H ${armW - rBottom} Q ${armW} 0 ${armW} ${rBottom} V ${armH - rTop} Q ${armW} ${armH} ${armW - rTop} ${armH} H ${rTop} Q 0 ${armH} 0 ${armH - rTop} Z`;
        const rightX = VB_W - armW;
        const rightArm = `M ${rightX} ${rBottom} Q ${rightX} 0 ${rightX + rBottom} 0 H ${rightX + armW - rBottom} Q ${rightX + armW} 0 ${rightX + armW} ${rBottom} V ${armH - rTop} Q ${rightX + armW} ${armH} ${rightX + armW - rTop} ${armH} H ${rightX + rTop} Q ${rightX} ${armH} ${rightX} ${armH - rTop} Z`;
        return (
          <>
            <path d={leftArm} fill="url(#armGrad)" />
            <path d={rightArm} fill="url(#armGrad)" />
          </>
        );
      })()}
    </UnifiedFurnitureRenderer>
  );
};

export default Couch;


