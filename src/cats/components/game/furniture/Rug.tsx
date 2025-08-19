import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { useCoordinateSystem } from '../../../hooks/useCoordinateSystem';

import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';


interface RugProps {
  x: number;
  z: number;
}

// Cute pink oval rug - floor element that goes under other furniture
// Wider design with warmer pink palette, minimal height to prevent wall collision
const VB_W = 280; // Made wider to look more floor-like
const VB_H = 60;  // Further reduced height to minimize Z-axis projection and prevent wall collision

const Rug: React.FC<RugProps> = ({ x, z }) => {
  // Subscribe to coordinate system changes to ensure consistent positioning
  useCoordinateSystem(); // Triggers re-render when coordinate system updates
  
  // Use fixed coordinates like other furniture - no dynamic positioning based on cat
  const ground = catCoordinateSystem.catToScreen({ x, y: 0, z });
  const floor = catCoordinateSystem.getFloorDimensions();
  
  // FIXED: Rug should scale with floor dimensions, not with perspective scale
  // The rug is a floor element and should scale consistently with the floor itself
  // Only apply world scaling (like the floor), not perspective scaling
  const w = Math.round(VB_W * floor.worldScale);
  const h = Math.round(VB_H * floor.worldScale);
  const left = ground.x - w / 2;
  const bottom = Math.round(ground.y);
  
  // Rug positioning debug logs removed - positioning is working correctly

  // Use simple positioning with uniform world scaling (no additional floor scaling needed)
  const style: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${bottom}px`,
    transform: `translate3d(${left}px, 0, 0)`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: -100, // Floor element - render underneath furniture but above background
    willChange: 'transform',
  };

  // Mass box for overlays - covers the full rug
  const MASS = { left: 0, right: VB_W, top: 0, bottom: VB_H };

  return (
    <div className="rug" aria-label="rug" style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          {/* No shadow for floor rugs - they go under other furniture */}

          {/* Main pink oval rug */}
          <ellipse cx={VB_W / 2} cy={VB_H / 2} rx={VB_W / 2 - 8} ry={VB_H / 2 - 4} fill="url(#rugPink)" />
          
          {/* Inner lighter oval for depth */}
          <ellipse cx={VB_W / 2} cy={VB_H / 2} rx={VB_W / 2 - 20} ry={VB_H / 2 - 12} fill="url(#rugPinkInner)" />
          
          {/* Cute little pattern dots */}
          <circle cx={VB_W / 2 - 30} cy={VB_H / 2 - 8} r="3" fill="rgba(255,255,255,0.4)" />
          <circle cx={VB_W / 2 + 30} cy={VB_H / 2 - 8} r="3" fill="rgba(255,255,255,0.4)" />
          <circle cx={VB_W / 2} cy={VB_H / 2 + 12} r="3" fill="rgba(255,255,255,0.4)" />
          <circle cx={VB_W / 2 - 15} cy={VB_H / 2 + 3} r="2" fill="rgba(255,255,255,0.3)" />
          <circle cx={VB_W / 2 + 15} cy={VB_H / 2 + 3} r="2" fill="rgba(255,255,255,0.3)" />
        </g>
      </svg>

      {isOverlayEnabled() && (
        <>
          <BaselineOverlay x={0} width={w} y={0} />
          {(() => {
            const scaleX = w / VB_W;
            const scaleY = h / VB_H;
            return (
              <MassBoxOverlay
                left={MASS.left * scaleX}
                bottom={0}
                width={(MASS.right - MASS.left) * scaleX}
                height={(MASS.bottom - 0) * scaleY}
              />
            );
          })()}
        </>
      )}
    </div>
  );
};

export default Rug;
