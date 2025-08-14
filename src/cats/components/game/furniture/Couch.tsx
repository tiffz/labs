import React from 'react';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';
import { layerForZ } from '../../rendering/zLayer';
import { isOverlayEnabled } from '../../debug/overlay';
import { BaselineOverlay, MassBoxOverlay } from '../../debug/overlay.tsx';

interface CouchProps {
  x: number;
  z: number;
}

// Simple SVG couch with tight viewBox and baseline-aligned shadow
// Tightened height so the bounding box hugs the art more closely
const VB_W = 270;
const VB_H = 120;

const Couch: React.FC<CouchProps> = ({ x, z }) => {
  const ground = catCoordinateSystem.catToScreen({ x, y: 0, z });
  const w = Math.round(VB_W * 1.15 * ground.scale);
  const h = Math.round(VB_H * 1.15 * ground.scale);
  const left = ground.x - w / 2; // keep subpixel to avoid transform snapping
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

  // Mass box for overlays (seat + arms + back) - hug to arm edges horizontally
  const MASS = { left: 0, right: VB_W, top: 8, bottom: 110 };

  return (
    <div className="couch" aria-label="couch" style={style}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
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
          <linearGradient id="cushionShade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="couchShadow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
          </linearGradient>
        </defs>

        {/* Flip Y to make y=0 baseline */}
        <g transform={`translate(0 ${VB_H}) scale(1,-1)`}>
          {/* Baseline shadow */}
          <ellipse cx={VB_W / 2} cy={0} rx={VB_W * 0.36} ry={VB_H * 0.12} fill="rgba(0,0,0,0.16)" />

          {/* Back extended down to avoid background gaps */}
          <rect x={15} y={24} width={VB_W - 30} height={74} rx={10} fill="url(#couchBody)" />

          {/* Seat block removed per design – cushions will sit directly above base */}

          {/* Four evenly spaced plush cushions; no gaps; subtle top-to-bottom gradient */}
          {(() => {
            const paddingX = 18;
            const gap = 0;
            const count = 4;
            const avail = VB_W - paddingX * 2 - gap * (count - 1);
            const cw = avail / count;
            const cx = (i: number) => paddingX + i * (cw + gap);
            const cy = 28; // connect to base visually
            const ch = 24;
            const nodes = [] as JSX.Element[];
            for (let i = 0; i < count; i++) {
              const x0 = cx(i);
              const y0 = cy;
              const x1 = x0 + cw;
              const y1 = y0 + ch;
              const rTop = 11;
              const rBot = 6; // slightly less round on bottom corners
              const d = `M ${x0} ${y0} H ${x1} V ${y1 - rTop} Q ${x1} ${y1} ${x1 - rTop} ${y1} H ${x0 + rTop} Q ${x0} ${y1} ${x0} ${y1 - rTop} V ${y0 + rBot} Q ${x0} ${y0} ${x0 + rBot} ${y0} H ${x1 - rBot} Q ${x1} ${y0} ${x1} ${y0 + rBot} Z`;
              nodes.push(<path key={i} d={d} fill="url(#cushionGrad)" />);
            }
            return nodes;
          })()}

          {/* Base drawn after cushions so it covers cushion bottoms; extended downward */}
          <rect x={15} y={4} width={VB_W - 30} height={28} rx={6} fill="url(#baseGrad)" />

          {/* Arms drawn last to layer above base and cushions */}
          {(() => {
            const armW = 22;
            const armH = 60;
            const rTop = 10;
            const rBottom = 3;
            const L = `M 0 ${rBottom} Q 0 0 ${rBottom} 0 H ${armW - rBottom} Q ${armW} 0 ${armW} ${rBottom} V ${armH - rTop} Q ${armW} ${armH} ${armW - rTop} ${armH} H ${rTop} Q 0 ${armH} 0 ${armH - rTop} Z`;
            const rx = VB_W - armW;
            const R = `M ${rx} ${rBottom} Q ${rx} 0 ${rx + rBottom} 0 H ${rx + armW - rBottom} Q ${rx + armW} 0 ${rx + armW} ${rBottom} V ${armH - rTop} Q ${rx + armW} ${armH} ${rx + armW - rTop} ${armH} H ${rx + rTop} Q ${rx} ${armH} ${rx} ${armH - rTop} Z`;
            return (
              <>
                <path d={L} fill="url(#armGrad)" />
                <path d={R} fill="url(#armGrad)" />
              </>
            );
          })()}
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

export default Couch;


