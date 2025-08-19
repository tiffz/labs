import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { layerForZ } from '../../rendering/zLayer';
import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';
import { FurnitureShadow } from './FurnitureShadow';

interface PaintingProps {
  x: number;
  y?: number; // Y position from placement system
  z: number;
  variant?: 'cat' | 'abstract';
  size?: 'small' | 'large';
}

// Wall painting with frame
// Converted from CSS to SVG for better control and future customization
const Painting: React.FC<PaintingProps> = ({ x, y, z, variant = 'cat', size = 'large' }) => {
  // Different sizes for variety - scaled up 1.5x more to be very prominent
  const VB_W = size === 'large' ? 210 : 150; // Increased from 140/100 (1.5x bigger)
  const VB_H = size === 'large' ? 150 : 210; // Increased from 100/140 (1.5x bigger)

  // Use the actual Y coordinate from spawn data - no fallback overrides
  const actualY = y;
  const wallScreen = catCoordinateSystem.wallToScreen({ x, y: actualY, z });
  const w = Math.round(VB_W * wallScreen.scale);
  const h = Math.round(VB_H * wallScreen.scale);
  const left = wallScreen.x - w / 2;
  const bottom = Math.round(wallScreen.y);



  const style: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${bottom}px`,
    transform: `translate3d(${left}px, 0, 0)`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: layerForZ(z, 'entity'),
    willChange: 'transform',
  };



  // Mass box for overlays - covers the full painting
  const MASS = { left: 0, right: VB_W, top: 0, bottom: VB_H };

  return (
    <div className="painting" aria-label={`${variant} painting`} style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          <FurnitureShadow kind={`painting-${variant}-${size}`} viewBoxWidth={VB_W} viewBoxHeight={VB_H} />

          {/* Simple thick frame - matches game's simplified art style */}
          <rect x={0} y={0} width={VB_W} height={VB_H} rx={4} fill="url(#paintingFrame)" />

          {/* Simple inner border for depth */}
          <rect x={6} y={6} width={VB_W - 12} height={VB_H - 12} rx={2} fill="rgba(0,0,0,0.1)" />

          {/* Picture content - adjusted for simplified frame */}
          <rect 
            x={10} 
            y={10} 
            width={VB_W - 20} 
            height={VB_H - 20} 
            rx={1} 
            fill={variant === 'cat' ? 'url(#catPainting)' : 'url(#abstractPainting)'} 
          />

          {/* Picture content details */}
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
              <polygon points={`${VB_W * 0.2},${VB_H * 0.7} ${VB_W * 0.4},${VB_H * 0.7} ${VB_W * 0.3},${VB_H * 0.9}`} fill="rgba(255,255,255,0.4)" />
            </g>
          )}

          {/* Frame highlight */}
          <rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} rx={3} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
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

export default Painting;
