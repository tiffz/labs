import React from 'react';
import { isOverlayEnabled } from '../../debug/overlay';
import { MassBoxOverlay, BaselineOverlay } from '../../debug/overlay.tsx';
import { FurnitureShadow } from './FurnitureShadow';
import { layerForZ } from '../../rendering/zLayer';
import { catCoordinateSystem } from '../../../services/CatCoordinateSystem';

interface ScratchingPostProps {
  x: number;
  z: number;
}

// SVG-based scratching post that matches the original CSS art style,
// while guaranteeing the string connects exactly to the platform top.
// ViewBox units allow pixel-perfect scaling with world scale.
// Keep the SVG box tight around the post; string/ball hang outside the box.
const BASE_W = 80;
const BASE_H = 130;

const ScratchingPost: React.FC<ScratchingPostProps> = ({ x, z }) => {
  const ground = catCoordinateSystem.catToScreen({ x, y: 0, z });
  const w = Math.round(BASE_W * ground.scale);
  const h = Math.round(BASE_H * ground.scale);
  const left = ground.x - w / 2; // keep subpixel to avoid cat collision jitter
  const bottom = Math.round(ground.y);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    transform: `translate3d(${left}px, 0, 0)`,
    bottom: `${bottom}px`,
    width: `${w}px`,
    height: `${h}px`,
    zIndex: layerForZ(z, 'entity'),
  };

  // Geometry in SVG coordinates
  const postW = 10;
  const postX = (BASE_W - postW) / 2; // center post dynamically
  const postH = 110; // height of rope section
  // Caps (flat rounded rectangles), defined in a flipped-y group so y=0 is floor
  const capW = 44;
  const capH = 12;
  const capX = (BASE_W - capW) / 2;

  // Slightly left of post center for readability (about ~10px screen at typical scale)
  const stringTopX = postX + postW / 2 - 13; // nudge ~5px back to the right
  const stringLen = 26; // viewBox units
  const ballR = 5;

  return (
    <div className="scratching-post" style={containerStyle} aria-label="scratching-post">
      <svg viewBox={`0 0 ${BASE_W} ${BASE_H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>

        <defs>
          <linearGradient id="postGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b06836" />
            <stop offset="100%" stopColor="#8f4d26" />
          </linearGradient>
          <linearGradient id="platformGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e8b8b8" />
            <stop offset="100%" stopColor="#d7a3a3" />
          </linearGradient>
          {/* Rope ridges: shallower (more horizontal) */}
          {/* Denser, more horizontal ropes (shallow angle) */}
          <pattern id="ropeRidges" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <rect width="3" height="3" fill="transparent" />
            <rect x="0" y="0" width="1" height="3" fill="rgba(255,255,255,0.22)" />
          </pattern>
        </defs>

        {/* Flip Y so 0 is at the floor; draw everything in upright world coords */}
        <g transform={`translate(0 ${BASE_H}) scale(1,-1)`}>
          <FurnitureShadow 
            kind="furniture" 
            viewBoxWidth={BASE_W} 
            viewBoxHeight={BASE_H}
            massWidth={capW} // Use cap width (44) as the actual mass width instead of full viewBox (80)
          />
          {/* Post */}
          <rect x={postX} y={0} width={postW} height={postH} rx={3} fill="url(#postGrad)" />
          <rect x={postX} y={0} width={postW} height={postH} rx={3} fill="url(#ropeRidges)" opacity={0.55} />

          {/* Bottom and top caps (same perspective) */}
          <rect x={capX} y={0} width={capW} height={capH} rx={4} fill="url(#platformGrad)" />
          <rect x={capX} y={postH - capH} width={capW} height={capH} rx={4} fill="url(#platformGrad)" />

          {/* String and ball attached to underside of top cap; hangs downward in flipped coords */}
          <line x1={stringTopX} y1={postH - capH} x2={stringTopX} y2={postH - capH - stringLen} stroke="#6b4a2e" strokeWidth={2} strokeLinecap="round" />
          <circle cx={stringTopX} cy={postH - capH - stringLen - ballR} r={ballR} fill="#ff69b4" />

          {/* SVG overlays removed; we render shared HTML overlays below for consistency */}
        </g>
      </svg>
      {isOverlayEnabled() && (
        <>
          <BaselineOverlay x={0} width={w} y={0} />
          {(() => {
            const massLeft = Math.min(postX, capX);
            const massRight = Math.max(postX + postW, capX + capW);
            const massTop = postH;
            const massWidth = massRight - massLeft;
            const massHeight = massTop - 0;
            const scaleX = w / BASE_W;
            const scaleY = h / BASE_H;
            return (
              <MassBoxOverlay left={massLeft * scaleX} bottom={0} width={massWidth * scaleX} height={massHeight * scaleY} />
            );
          })()}
        </>
      )}
    </div>
  );
};

export default ScratchingPost;


