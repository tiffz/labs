import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { layerForZ } from '../../rendering/zLayer';
import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';
import { FurnitureShadow } from './FurnitureShadow';

interface DoorProps {
  x: number;
  z: number;
}

// Door with frame and handle - realistic proportions with light gradient
// Converted from CSS to SVG for better control and future customization
const VB_W = 240; // Made wider for more realistic proportions
const VB_H = 570; // Keep height for realism

const Door: React.FC<DoorProps> = ({ x, z }) => {
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

  // Mass box for overlays - covers the full door
  const MASS = { left: 0, right: VB_W, top: 0, bottom: VB_H };

  return (
    <div className="door" aria-label="door" style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          <FurnitureShadow kind="door" viewBoxWidth={VB_W} viewBoxHeight={VB_H} />

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

export default Door;
