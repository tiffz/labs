import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { layerForZ } from '../../rendering/zLayer';
import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';
import { FurnitureShadow } from './FurnitureShadow';

interface LampProps {
  x: number;
  z: number;
}

// Table lamp with base and shade
// Converted from CSS to SVG for better control and future customization
const VB_W = 32;
const VB_H = 40;

const Lamp: React.FC<LampProps> = ({ x, z }) => {
  const ground = catCoordinateSystem.catToScreen({ x, y: 0, z });
  const w = Math.round(VB_W * ground.scale);
  const h = Math.round(VB_H * ground.scale);
  const left = ground.x - w / 2;
  const bottom = Math.round(ground.y);

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

  // Mass box for overlays - covers the full lamp
  const MASS = { left: 0, right: VB_W, top: 0, bottom: VB_H };

  return (
    <div className="lamp" aria-label="lamp" style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          <FurnitureShadow kind="lamp" viewBoxWidth={VB_W} viewBoxHeight={VB_H} />

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

export default Lamp;
