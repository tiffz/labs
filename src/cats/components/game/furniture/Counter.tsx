import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { layerForZ } from '../../rendering/zLayer';
import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';
import { FurnitureShadow } from './FurnitureShadow';

interface CounterProps {
  x: number;
  z: number;
}

// Kitchen counter with cabinet doors and counter top - scaled up 2x
// Converted from CSS to SVG for better control and future customization
const VB_W = 400; // Doubled from 200
const VB_H = 240; // Doubled from 120

const Counter: React.FC<CounterProps> = ({ x, z }) => {
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

  // Mass box for overlays - covers the full counter structure
  const MASS = { left: 0, right: VB_W, top: 0, bottom: VB_H };

  return (
    <div className="counter" aria-label="kitchen counter" style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          <FurnitureShadow kind="counter" viewBoxWidth={VB_W} viewBoxHeight={VB_H} />

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

export default Counter;
