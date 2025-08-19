import React from 'react';
import { UnifiedFurnitureRenderer } from '../../rendering/UnifiedFurnitureRenderer';
import { createFurnitureConfig, FurniturePositioning } from '../../rendering/furnitureUtils';

interface ScratchingPostProps {
  x: number;
  z: number;
}

/**
 * Scratching Post - Unified Rendering System
 * 
 * Migrated from legacy inconsistent rendering to unified system.
 * Key improvements:
 * - Consistent scaling (no arbitrary multipliers)
 * - Standardized positioning and shadow system
 * - Proper responsive behavior through coordinate system subscription
 */

// Consistent base dimensions - no arbitrary scaling
const BASE_W = 80;
const BASE_H = 130;

const ScratchingPost: React.FC<ScratchingPostProps> = ({ x, z }) => {
  // Create furniture configuration using unified system
  const config = createFurnitureConfig({
    kind: 'furniture',
    ...FurniturePositioning.floor(x, z),
    viewBoxWidth: BASE_W,
    viewBoxHeight: BASE_H,
    massWidth: 44, // Use cap width as actual mass width
  });

  // SVG geometry - same as before but now in unified container
  const postW = 10;
  const postX = (BASE_W - postW) / 2;
  const postH = 110;
  const capW = 44;
  const capH = 12;
  const capX = (BASE_W - capW) / 2;
  const stringTopX = postX + postW / 2 - 13;
  const stringLen = 26;
  const ballR = 5;

  return (
    <UnifiedFurnitureRenderer {...config} ariaLabel="scratching-post">
      {/* SVG content - same as before but without positioning logic */}
      <defs>
        <linearGradient id="postGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b06836" />
          <stop offset="100%" stopColor="#8f4d26" />
        </linearGradient>
        <linearGradient id="platformGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8b8b8" />
          <stop offset="100%" stopColor="#d7a3a3" />
        </linearGradient>
        <pattern id="ropeRidges" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
          <rect width="3" height="3" fill="transparent" />
          <rect x="0" y="0" width="1" height="3" fill="rgba(255,255,255,0.22)" />
        </pattern>
      </defs>

      {/* Post */}
      <rect x={postX} y={0} width={postW} height={postH} rx={3} fill="url(#postGrad)" />
      <rect x={postX} y={0} width={postW} height={postH} rx={3} fill="url(#ropeRidges)" opacity={0.55} />

      {/* Bottom and top caps */}
      <rect x={capX} y={0} width={capW} height={capH} rx={4} fill="url(#platformGrad)" />
      <rect x={capX} y={postH - capH} width={capW} height={capH} rx={4} fill="url(#platformGrad)" />

      {/* String and ball */}
      <line 
        x1={stringTopX} 
        y1={postH - capH} 
        x2={stringTopX} 
        y2={postH - capH - stringLen} 
        stroke="#6b4a2e" 
        strokeWidth={2} 
        strokeLinecap="round" 
      />
      <circle 
        cx={stringTopX} 
        cy={postH - capH - stringLen - ballR} 
        r={ballR} 
        fill="#ff69b4" 
      />
    </UnifiedFurnitureRenderer>
  );
};

export default ScratchingPost;


