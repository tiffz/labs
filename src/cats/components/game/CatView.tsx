import React, { useMemo, useRef, useEffect } from 'react';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { computeShadowLayout, SHADOW_OFFSET_X } from '../../services/ShadowLayout';
import { layerForZ } from '../rendering/zLayer';
import { isOverlayEnabled } from '../debug/overlay';
import { MassBoxOverlay } from '../debug/overlay.tsx';
import { useWorld } from '../../context/useWorld';

type WorldCoords = { x: number; y: number; z: number };

interface CatViewProps {
  catWorldCoords: WorldCoords;
  shadowCenterOverride?: number;
  catRef: React.RefObject<SVGSVGElement>;
  catElement: React.ReactElement;
  walking?: boolean;
}

// Visual constants (kept here to isolate math)
const VIEWBOX_W = 220;
const VIEWBOX_H = 200;
const FEET_LINE_Y = 185;
const MASS_LEFT = 48;
const MASS_RIGHT = 162;
const MASS_TOP = 62;
const MASS_BOTTOM = 182;

const CatView: React.FC<CatViewProps> = ({ catWorldCoords, shadowCenterOverride, catRef, catElement, walking }) => {
  const lastMassBoxVBRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bobberRef = useRef<HTMLDivElement | null>(null);
  const world = useWorld();
  const overlayEnabled = isOverlayEnabled();
  // Speed debug refs (screen-space)
  const prevScreenCenterXRef = useRef<number | null>(null);
  const lastTickTsRef = useRef<number>(performance.now());
  const smoothedScreenSpeedRef = useRef<number>(0);

  const {
    catLeftPx,
    catBottomPx,
    catWidthPx,
    catHeightPx,
    catInnerTranslateY,
    shadowLeft,
    shadowBottom,
    shadowWidth,
    shadowHeight,
    feetLinePx,
    containerBottom,
  } = useMemo(() => {
    const catScreen = catCoordinateSystem.catToScreen(catWorldCoords);
    const ground = catCoordinateSystem.catToScreen({ x: catWorldCoords.x, y: 0, z: catWorldCoords.z });
    const baselineY = shadowCenterOverride ?? ground.y;
    const shadowLayout = computeShadowLayout({ x: catScreen.x, y: baselineY, scale: ground.scale });

    const widthPx = 300 * catScreen.scale;
    // Avoid rounding X so horizontal motion stays smooth without 1px jitter
    const leftPx = catScreen.x - widthPx / 2;
    const heightPx = widthPx * (VIEWBOX_H / VIEWBOX_W);
    const footGapPx = ((VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H) * heightPx;
    const jumpDeltaPx = Math.max(0, catScreen.y - ground.y);
    const baselineRounded = Math.round(baselineY);
    const containerBottom = Math.max(0, baselineRounded);
    const clampDelta = containerBottom - baselineRounded;

    // Optional live mass box measurement
    let massVB = lastMassBoxVBRef.current || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP };
    // Measure once to avoid animation-induced jitter in mass box
    if (!lastMassBoxVBRef.current) {
      try {
        if (catRef.current) {
          const svg = catRef.current as unknown as SVGSVGElement;
          const bodyNode = svg.querySelector('#body') as SVGGElement | null;
          const headNode = svg.querySelector('#head') as SVGGElement | null;
          if (bodyNode && headNode && typeof (bodyNode as unknown as { getBBox?: () => DOMRect }).getBBox === 'function' && typeof (headNode as unknown as { getBBox?: () => DOMRect }).getBBox === 'function') {
            const b1 = (bodyNode as unknown as { getBBox: () => DOMRect }).getBBox();
            const b2 = (headNode as unknown as { getBBox: () => DOMRect }).getBBox();
            const x = Math.min(b1.x, b2.x);
            const y = Math.min(b1.y, b2.y);
            const right = Math.max(b1.x + b1.width, b2.x + b2.width);
            const bottom = Math.max(b1.y + b1.height, b2.y + b2.height);
            massVB = { x, y, width: right - x, height: bottom - y };
            lastMassBoxVBRef.current = massVB;
          }
        }
      } catch {
        // ignore
      }
    }

    const scaleY = heightPx / VIEWBOX_H;
    const deltaMassFromFeetPx = (FEET_LINE_Y - (massVB.y + massVB.height)) * scaleY;
    const massBottomOffsetPx = footGapPx + deltaMassFromFeetPx;
    const innerTranslateY = massBottomOffsetPx + clampDelta - jumpDeltaPx;
    const visualBottomPx = containerBottom - innerTranslateY;

    const massCenterOffsetPx = (((massVB.x + massVB.width / 2) - VIEWBOX_W / 2) / VIEWBOX_W) * widthPx;
    const sLeftRaw = catScreen.x - Math.round(shadowLayout.width) / 2 + massCenterOffsetPx;
    const sLeft = Math.round(sLeftRaw); // lock to 1px to further reduce shimmer
    const sBottom = Math.round((baselineRounded) - Math.round(shadowLayout.height) / 2);

    const feetPx = Math.round(visualBottomPx + footGapPx);
    const massBottomPx = Math.round(visualBottomPx + (footGapPx + ((FEET_LINE_Y - (massVB.y + massVB.height)) * scaleY)));

    return {
      catLeftPx: leftPx,
      catBottomPx: visualBottomPx,
      catWidthPx: widthPx,
      catHeightPx: heightPx,
      catInnerTranslateY: innerTranslateY,
      shadowLeft: sLeft,
      shadowBottom: sBottom,
      shadowWidth: Math.round(shadowLayout.width),
      shadowHeight: Math.round(shadowLayout.height),
      feetLinePx: feetPx,
      massBottomLinePx: massBottomPx,
      containerBottom,
    };
  }, [catWorldCoords, shadowCenterOverride, catRef]);

  const shadowStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${shadowBottom}px`,
    transform: `translate3d(${shadowLeft}px, 0, 0)`,
    width: `${shadowWidth}px`,
    height: 'auto',
    zIndex: layerForZ(catWorldCoords.z ?? 0, 'shadow'),
    willChange: 'transform',
  };

  const catContainerStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0px',
    bottom: `${Math.round(containerBottom)}px`,
    transform: `translate3d(${Math.round(catLeftPx)}px, 0, 0)`,
    width: `${catWidthPx}px`,
    height: 'auto',
    zIndex: layerForZ(catWorldCoords.z ?? 0, 'entity'),
    willChange: 'transform',
  };

  // Publish screen-space speed for HUD (does not control visuals)
  useEffect(() => {
    const onTick = () => {
      const now = performance.now();
      const rect = containerRef.current?.getBoundingClientRect?.();
      const centerX = rect ? Math.round(rect.left + rect.width / 2) : 0;
      const prevX = prevScreenCenterXRef.current ?? centerX;
      const dtMs = Math.max(1, now - (lastTickTsRef.current || now));
      let dx = Math.abs(centerX - prevX);
      // Tighten idle clamp: ignore tiny motion up to 0.99px per tick to avoid camera/layout noise
      if (dx < 0.99) dx = 0;
      const inst = (dx / dtMs) * 1000;
      const alpha = 0.25;
      smoothedScreenSpeedRef.current = smoothedScreenSpeedRef.current * (1 - alpha) + inst * alpha;
      prevScreenCenterXRef.current = centerX;
      lastTickTsRef.current = now;
      try {
        const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
        (dbg as { walkSpeedInst?: number }).walkSpeedInst = inst;
        (dbg as { walkSpeedScreen?: number }).walkSpeedScreen = smoothedScreenSpeedRef.current;
        (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
      } catch {
        // no-op
      }
    };
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, [world]);

  // Debug: mirror DOM animation/class state into ECS debug for snapshot parity
  useEffect(() => {
    let raf: number | null = null;
    const step = () => {
      try {
        const dbg = (world as unknown as { __debug?: Record<string, unknown> }).__debug || {};
        const innerEl = innerRef.current;
        const bobEl = bobberRef.current;
        const cs = bobEl ? getComputedStyle(bobEl) : null;
        const domWalking = Boolean(innerEl?.classList.contains('walking'));
        (dbg as { walkingProp?: boolean }).walkingProp = Boolean(walking);
        (dbg as { domWalkingClass?: boolean }).domWalkingClass = domWalking;
        (dbg as { domBobAnimating?: boolean }).domBobAnimating = Boolean(cs && cs.animationName && cs.animationName !== 'none');
        (dbg as { domBobAnimationName?: string | null }).domBobAnimationName = cs?.animationName || null;
        (dbg as { domBobPlayState?: string | null }).domBobPlayState = cs?.animationPlayState || null;
        const ampl = bobEl ? getComputedStyle(bobEl).getPropertyValue('--bob-ampl') : '';
        (dbg as { domBobAmpl?: string }).domBobAmpl = ampl?.trim?.() || '';
        // Prefer DOM walking as the single source of truth for HUD display
        (dbg as { walking?: boolean }).walking = domWalking;
        (world as unknown as { __debug?: Record<string, unknown> }).__debug = dbg;
      } catch {
        // no-op
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [world, walking]);

  return (
    <>
      <div className="cat-shadow-container" style={shadowStyle}>
        <div
          className="cat-shadow-simple"
          style={{
            position: 'relative',
            width: '100%',
            height: `${shadowHeight}px`,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.25)',
            transform: `translate(${SHADOW_OFFSET_X}px, 0px)`,
            zIndex: 1,
          }}
        />
      </div>
      <div ref={containerRef} className={`cat-container cat-tight`} style={catContainerStyle}>
        <div ref={innerRef} className={`cat-inner${walking ? ' walking' : ''}`} style={{ transform: `translate3d(0, ${catInnerTranslateY.toFixed(2)}px, 0)`, ['--bob-ampl' as unknown as string]: walking ? '3px' : '0px' }}>
          <div ref={bobberRef} className="cat-walk-bobber">
            {React.cloneElement(catElement as unknown as React.ReactElement<SVGSVGElement>, { ref: catRef })}
          </div>
        </div>
      </div>

      {overlayEnabled && (
        <>
          {/* Baseline (shadow center) */}
          <div
            style={{
              position: 'absolute',
              left: `${Math.round(catLeftPx + catWidthPx / 2) - 120}px`,
              bottom: `${Math.round(containerBottom)}px`,
              width: '240px',
              height: '2px',
              background: '#0096ff',
              zIndex: layerForZ(catWorldCoords.z ?? 0) + 10,
              pointerEvents: 'none',
            }}
          />
          {(() => {
            const vb = lastMassBoxVBRef.current || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP };
            const leftPx = Math.round(catLeftPx + (vb.x / VIEWBOX_W) * catWidthPx);
            const widthPx = Math.round((vb.width / VIEWBOX_W) * catWidthPx);
            const scaleY = catHeightPx / VIEWBOX_H;
            const bottomPx = Math.round(catBottomPx + ((FEET_LINE_Y - (vb.y + vb.height)) * scaleY) + ((VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H) * catHeightPx);
            const heightPx = Math.round(vb.height * scaleY);
            return <MassBoxOverlay left={leftPx} bottom={bottomPx} width={widthPx} height={heightPx} />;
          })()}
          {/* Feet line for reference */}
          <div
            style={{
              position: 'absolute',
              left: `${Math.round(catLeftPx + catWidthPx / 2) - 120}px`,
              bottom: `${Math.round(feetLinePx)}px`,
              width: '240px',
              height: '2px',
              background: '#ff5050',
              zIndex: layerForZ(catWorldCoords.z ?? 0) + 10,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
    </>
  );
};

export default CatView;


