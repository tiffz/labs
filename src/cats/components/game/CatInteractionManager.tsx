/**
 * Cat Interaction Manager Component
 * 
 * Encapsulates all cat interaction logic, handlers, and state management.
 * Extracted from App.tsx to improve component organization and separation of concerns.
 */

import React, { useState, useRef, useEffect } from 'react';
import { isOverlayEnabled } from '../debug/overlay';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { computeShadowLayout } from '../../services/ShadowLayout';
import Cat from './Cat';
import CatView from './CatView';
import { calculateFinalLoveGain } from '../../systems/lovePerInteractionSystem';
import type { EconomyCalculations } from '../../services/GameEconomyService';
import type { MouseState } from '../../hooks/useMouseTracking';

// Analytics types are declared in vite-env.d.ts
// No need to redeclare here

interface HeartType {
  id: number;
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
}

interface CatInteractionManagerProps {
  // Economy and love calculations
  economy: EconomyCalculations;
  
  // Cat system state and actions
  catEnergy: number;
  wandMode: boolean;
  isPouncing: boolean;
  isPlaying: boolean;
  isShaking: boolean;
  isEarWiggling: boolean;
  isHappyPlaying: boolean;
  pounceTarget: { x: number; y: number } | null;
  pounceConfidence: number;
  catActions: {
    addEnergy: (delta: number) => void;
    toggleWandMode: () => void;
    handleWandMovement: (position: { x: number; y: number }) => void;
    handleWandClick: () => void;
  };
  
  // Heart tracking
  trackableHeartId: number | null;
  hearts: HeartType[];
  
  // Sleep state from parent
  isSleeping: boolean;
  isDrowsy: boolean;
  
  // Callbacks to parent
  onLoveGained: (amount: number) => void;
  // initial wand position is handled in parent
  onCatPositionUpdate: (position: { x: number; y: number; z?: number }) => void;
  trackSpecialAction: (action: 'noseClicks' | 'earClicks' | 'cheekPets' | 'happyJumps') => void;
  
  // Heart spawning service
  heartSpawningService: {
    spawnHearts: (config: {
      position: { x: number; y: number };
      loveAmount: number;
      interactionType: 'petting' | 'pouncing';
    }) => void;
  };
  
  // Unified mouse tracking
  mouseState: MouseState;
  
  // Cat world positioning
  catWorldCoords: { x: number; y: number; z: number };
  // Deprecated: shadow is computed internally from cat world coords to keep a single source of truth
  shadowCoords?: { x: number; y: number; scale: number };
  // Optional: when provided, use this as the visual baseline (shadow center)
  shadowCenterOverride?: number;
  
  // Event logging functions
  eventLoggers?: {
    logPetting: () => void;
    logPouncing: () => void;
    logHappy: () => void;
    logNoseClick: () => void;
    logEarClick: () => void;
    logCheekPet: () => void;
  };
}

const CatInteractionManager: React.FC<CatInteractionManagerProps> = ({
  economy,
  catEnergy,
  wandMode,
  isPouncing,
  isPlaying,

  isEarWiggling,
  isHappyPlaying,
  pounceTarget,
  pounceConfidence,
  catActions,
  trackableHeartId,
  hearts,
  isSleeping,
  isDrowsy,
  onLoveGained,
  onCatPositionUpdate,
  trackSpecialAction,
  heartSpawningService,
  mouseState,
  catWorldCoords,
  shadowCenterOverride,
  eventLoggers,
}) => {
  // Local cat visual state
  const [isPetting, setIsPetting] = useState(false);
  const [isStartled, setIsStartled] = useState(false);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [isSubtleWiggling, setIsSubtleWiggling] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isWalkingUI, setIsWalkingUI] = useState(false);
  const walkingPrevWorldXRef = useRef<number | null>(null);
  const walkingTimerRef = useRef<number | null>(null);
  const rapidClickTimestampsRef = useRef<number[]>([]);
  const [isSmiling, setIsSmiling] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  const [isTailFlicking, setIsTailFlicking] = useState(false);
  // Debug: capture DOM rects of containers for snapshots
  const shadowContainerRef = useRef<HTMLDivElement | null>(null);
  const catContainerRef = useRef<HTMLDivElement | null>(null);
  // Fixed geometry from SVG viewBox for stable anchors (avoid animation-induced drift)
  // Pull from central constants to keep consistency across systems
  const VIEWBOX_W = 220;
  const VIEWBOX_H = 200;
  const FEET_LINE_Y = 185; // stable feet line in viewBox coords
  // const FOOT_GAP_RATIO = (VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H; // kept for reference
  // Default logical mass box for perceived body (ignored if SVG-driven box available)
  const MASS_LEFT = 48;   // viewBox units
  const MASS_RIGHT = 162; // viewBox units
  const MASS_TOP = 62;    // viewBox units
  const MASS_BOTTOM = 182; // viewBox units
  const MASS_CENTER_X = (MASS_LEFT + MASS_RIGHT) / 2;
  const lastMassBoxVBRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);


  
  // Refs and other state
  const catRef = useRef<SVGSVGElement>(null);

  // Update parent with cat position for Z spawning
  useEffect(() => {
    if (catRef.current) {
      const catRect = catRef.current.getBoundingClientRect();
      const position = {
        x: catRect.left + catRect.width / 2,
        y: catRect.top + catRect.height * 0.3, // Cat's head position
      };
      onCatPositionUpdate(position);
    }
  }, [onCatPositionUpdate]);
  const cheekClickFlag = useRef(false);
  // Removed unused clickTimestampsRef (using rapidClickTimestampsRef instead)
  

  const { baseLovePerInteraction, meritMultipliers } = economy;

  // Walking UI latch driven by world X deltas; ensures class clears even without re-render activity
  useEffect(() => {
    const prev = walkingPrevWorldXRef.current ?? catWorldCoords.x;
    const dx = Math.abs(catWorldCoords.x - prev);
    walkingPrevWorldXRef.current = catWorldCoords.x;
    if (dx > 0.5 && !isJumping) {
      setIsWalkingUI(true);
      if (walkingTimerRef.current) {
        clearTimeout(walkingTimerRef.current);
      }
      walkingTimerRef.current = window.setTimeout(() => {
        setIsWalkingUI(false);
        walkingTimerRef.current = null;
      }, 280);
    }
    return () => {
      // no-op
    };
  }, [catWorldCoords.x, isJumping]);

  // Auto-enable overlay via URL param overlay=1 or overlay=true for easy verification
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const overlayParam = params.get('overlay');
      if (overlayParam === '1' || overlayParam === 'true') {
        (window as unknown as { __CAT_OVERLAY__?: boolean }).__CAT_OVERLAY__ = true;
      }
    } catch {
      // ignore malformed URLs in overlay toggler
    }
  }, []);

  // Handle smile timeout
  useEffect(() => {
    let smileTimer: number;
    if (isSmiling) {
      smileTimer = window.setTimeout(() => setIsSmiling(false), 750);
    }
    return () => clearTimeout(smileTimer);
  }, [isSmiling]);

  const handleCatClick = (event: React.MouseEvent) => {
    // Only block clicks when actively pouncing in wand mode
    if (isPouncing && wandMode) return;

    // If cat is sleeping, just wake it up instead of processing normal interaction
    if (isSleeping) {
      // The parent App.tsx will handle waking up via the document mousedown listener
      // Don't process love/energy when sleeping - just let the wake-up happen
      return;
    }

    const energyMultiplier = 1 + catEnergy / 100;
    const loveFromClick = calculateFinalLoveGain(
      baseLovePerInteraction,
      'petting',
      energyMultiplier,
      meritMultipliers
    );
    onLoveGained(loveFromClick);
    catActions.addEnergy(-1);
    
    // Track cat interaction
    if (typeof window !== 'undefined' && window.labsAnalytics) {
      window.labsAnalytics.trackEvent('cat_pet', {
        category: 'Cat Interaction',
        label: wandMode ? 'wand_mode' : 'normal_mode',
        value: loveFromClick,
        love_gained: loveFromClick,
        energy_level: catEnergy
      });
    }
    
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);
    
    // Log petting event
    eventLoggers?.logPetting();

    // Subtle ear wiggle on pet
    if (!wigglingEar && !isSubtleWiggling && Math.random() < 0.4) {
      setIsSubtleWiggling(true);
      setTimeout(() => {
        setIsSubtleWiggling(false);
      }, 500);
    }

    const now = Date.now();
    // Happy jump trigger: N rapid clicks in a short window when not in wand mode
    if (!cheekClickFlag.current && !wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 800;
      const JUMP_CLICK_THRESHOLD = 3;

      rapidClickTimestampsRef.current.push(now);
      rapidClickTimestampsRef.current = rapidClickTimestampsRef.current.filter(
        (t) => now - t < JUMP_WINDOW_MS
      );

      if (rapidClickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD) {
        setIsJumping(true);
        
        // Temporarily nudge cat world Y for visual arc via custom event the system listens to
        document.dispatchEvent(new CustomEvent('cat-happy-jump'));
        trackSpecialAction('happyJumps');
        eventLoggers?.logHappy();
        // Visual jump handled by world Y nudge for a short burst
        setTimeout(() => setIsJumping(false), 550);
        rapidClickTimestampsRef.current = [];
      }
    }
    
    // Reset cheek flag after use
    if (cheekClickFlag.current) {
        cheekClickFlag.current = false;
    }

    // Only spawn click-based hearts when wand is NOT active
    if (!wandMode) {
      heartSpawningService.spawnHearts({
        position: { x: event.clientX, y: event.clientY },
        loveAmount: loveFromClick,
        interactionType: 'petting'
      });
    }
    
    // No dynamic facts in current version
  };

  const handleEarClick = (ear: 'left' | 'right', event: React.MouseEvent) => {
    if (wigglingEar || isSubtleWiggling) return;

    // Track ear click for awards
    trackSpecialAction('earClicks');
    
    // Log ear click event
    eventLoggers?.logEarClick();

    // Generate love and energy changes regardless of wand mode
    const energyMultiplier = 1 + catEnergy / 100;
    const loveFromClick = calculateFinalLoveGain(
      baseLovePerInteraction,
      'petting',
      energyMultiplier,
      meritMultipliers
    );
    onLoveGained(loveFromClick);
    catActions.addEnergy(-1);
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);
    
    // Skip heart spawning and visual effects when wand is active, but allow love updates
    if (wandMode) return;
    
    // Use unified heart spawning
    heartSpawningService.spawnHearts({
      position: { x: event.clientX, y: event.clientY },
      loveAmount: loveFromClick,
      interactionType: 'petting'
    });

    // Trigger the specific ear wiggle
    setWigglingEar(ear);
    setTimeout(() => {
      setWigglingEar(null);
    }, 500);
  };
  
  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsStartled(true);
    setTimeout(() => setIsStartled(false), 500);
  };

  const handleTailClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Set startled face (same as eye click)
    setIsStartled(true);
    setTimeout(() => setIsStartled(false), 500);
    
    // Trigger tail flick animation
    setIsTailFlicking(true);
    setTimeout(() => setIsTailFlicking(false), 600);
  };
  
  const handleNoseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Track nose click for Boop award
    trackSpecialAction('noseClicks');
    
    // Log nose click event
    eventLoggers?.logNoseClick();
    
    // Generate love regardless of wand mode
    setIsSmiling(true);
    const loveFromNose = calculateFinalLoveGain(
      baseLovePerInteraction,
      'petting',
      1, // No energy multiplier for nose clicks
      meritMultipliers
    );
    onLoveGained(loveFromNose);
    
    // Skip heart spawning when wand is active, but allow love updates
    if (wandMode) return;
    
    // Use unified heart spawning
    heartSpawningService.spawnHearts({
      position: { x: event.clientX, y: event.clientY },
      loveAmount: loveFromNose,
      interactionType: 'petting'
    });
  };

  const handleCheekClick = (side: 'left' | 'right', event: React.MouseEvent) => {
    event.stopPropagation();
    handleCatClick(event);
    
    // Set flag AFTER processing cat click so happy jumps can trigger
    cheekClickFlag.current = true;

    // Track cheek pet for awards
    trackSpecialAction('cheekPets');
    
    // Log cheek pet event
    eventLoggers?.logCheekPet();

    if (Math.random() < 0.25) setIsSmiling(true);
    
    if (!catRef.current) return;

    const catRect = catRef.current.getBoundingClientRect();
    const clickXInCatSvg = ((event.clientX - catRect.left) / catRect.width) * 220; // 220 is the viewBox width

    const MAX_TILT = 7; // Max tilt in degrees
    const MIN_TILT = 1;  // Min tilt in degrees
    const TILT_RANGE = MAX_TILT - MIN_TILT;

    let tiltFactor = 0; // 0 to 1

    if (side === 'left') {
        const leftCheekInnerEdge = 85;
        const leftCheekOuterEdge = 35;
        const cheekWidth = leftCheekInnerEdge - leftCheekOuterEdge;
        const clampedX = Math.max(leftCheekOuterEdge, Math.min(leftCheekInnerEdge, clickXInCatSvg));
        tiltFactor = (leftCheekInnerEdge - clampedX) / cheekWidth;
    } else { // right side
        const rightCheekInnerEdge = 115;
        const rightCheekOuterEdge = 165;
        const cheekWidth = rightCheekOuterEdge - rightCheekInnerEdge;
        const clampedX = Math.max(rightCheekInnerEdge, Math.min(rightCheekOuterEdge, clickXInCatSvg));
        tiltFactor = (clampedX - rightCheekInnerEdge) / cheekWidth;
    }

    const tiltDegrees = MIN_TILT + (tiltFactor * TILT_RANGE);
    const finalAngle = side === 'left' ? -tiltDegrees : tiltDegrees;
    
    setHeadTiltAngle(finalAngle);

    setTimeout(() => {
        setHeadTiltAngle(0);
    }, 500);
  };

  const handleWandClick = () => {
    catActions.handleWandClick();
    
    // Log pouncing event
    eventLoggers?.logPouncing();
  };

  // handleWandToggle moved to parent

        return (
        <>
      {(() => {
            // SHADOW SYSTEM CONFIG comes from shared ShadowLayout for test parity
            
            // Convert cat coordinates to screen position
            // Use world X directly (camera is applied by world transform),
            // and use projected Y/scale from the coordinate system
            const catScreenPosition = catCoordinateSystem.catToScreen(catWorldCoords);
            const scale = catScreenPosition.scale;

            // No runtime measurement; use fixed geometry to avoid drift from animations
            
            // Compute shadow from ground projection (y locked at 0) or use override from ECS
            const groundScreen = catCoordinateSystem.catToScreen({ x: catWorldCoords.x, y: 0, z: catWorldCoords.z });
            const baselineY = shadowCenterOverride ?? groundScreen.y;
            const shadowLayout = computeShadowLayout({ x: catScreenPosition.x, y: baselineY, scale: groundScreen.scale });
            

            const roundedCatLeft = Math.round(catScreenPosition.x);
            // Shadow dimensions - scale already calculated
            const SHADOW_WIDTH = Math.round(shadowLayout.width);
            const SHADOW_HEIGHT = Math.round(shadowLayout.height);
            // Remove ratio-based coupling; we will anchor feet to ground baseline
            // Compute absolute-positioned cat container without transforms
            const catWidthPx = 300 * scale;
            const catLeftPx = Math.round(roundedCatLeft - catWidthPx / 2);
            // Use SVG foot anchor so feet meet baseline irrespective of extra viewBox padding
            const catHeightPx = catWidthPx * (VIEWBOX_H / VIEWBOX_W);
            // Foot gap must scale with vertical dimension (height), not width
            const footGapPx = (VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H * catHeightPx;
            // Apply current jump delta (cat y above ground) to keep vertical movement visible
            const jumpDeltaPx = Math.max(0, catScreenPosition.y - groundScreen.y); // no rounding for invariance
            // Body center bias set to 0 to avoid perceived horizontal shift scaling with Z
            // const BODY_CENTER_BIAS_PX = 0; // no bias in simplified model
            // Minimal model: no clamps, no rims – pure math from coordinate system
            // Visibility-safe render: clamp container and translate inner so on-screen top stays at baseline
            const groundY = baselineY;
            // Maintain constant visual overlap across scales at all Z:
            // Align the bottom of the visual mass box (body/head envelope) to the shadow center
            // Strategy:
            // - Place container bottom at the baseline (shadow center)
            // - Shift inner SVG up by the offset from container-bottom → mass-bottom so mass-bottom sits on the baseline
            const FEET_OFFSET_PX = 0;
            const baseline = groundY + FEET_OFFSET_PX;
            // Snap baseline to whole pixels to eliminate subpixel gaps in screenshots
            const baselineRounded = Math.round(baseline);
            // Container anchored to baseline; clamp to viewport bottom for safety
            const unclampedContainerBottom = baselineRounded;
            const catContainerBottomPx = Math.max(0, unclampedContainerBottom);
            const clampDelta = catContainerBottomPx - unclampedContainerBottom; // >= 0 when clamped
            // Compute mass-bottom offset from container-bottom in pixels
            const vbForMass = lastMassBoxVBRef.current || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP };
            const scaleY = catHeightPx / VIEWBOX_H;
            const deltaMassFromFeetPx = (FEET_LINE_Y - (vbForMass.y + vbForMass.height)) * scaleY; // positive if mass-bottom is above feet
            const massBottomOffsetPx = footGapPx + deltaMassFromFeetPx;
            // Translate inner up by mass-bottom offset; subtract jump delta so jumps move the body upward
            const catInnerTranslateY = massBottomOffsetPx + clampDelta - jumpDeltaPx; // positive moves down, negative up
            // Visual bottom equals container bottom minus inner translate (CSS translateY positive moves down)
            const catBottomPx = catContainerBottomPx - catInnerTranslateY;
            // Derive shadow vertical position directly from cat feet line for exact lock
            const floorHeight = catCoordinateSystem.getFloorDimensions().screenHeight;
            // compute feetLinePx only if overlay is enabled (to avoid linter warning)
            const overlayEnabled = isOverlayEnabled();
            // remove unused local; compute inline where needed
            // Anchor the shadow so its CENTER equals the ground baseline (feet baseline)
            const desiredShadowCenter = Math.min(baselineRounded, floorHeight);
            const adjustedShadowBottom = desiredShadowCenter - (SHADOW_HEIGHT / 2); // allow negative; parent overflow is visible
            // visuals now handled in CatView
            const shadowTopPx = adjustedShadowBottom + SHADOW_HEIGHT; // top is center + height/2
            const shadowCenterPx = adjustedShadowBottom + (SHADOW_HEIGHT / 2);
            // Use bottom-based anchoring to match cat container and avoid top/bottom conversion drift
            // visuals now handled in CatView
            // overlayEnabled already computed above
            // Add walking class when moving horizontally at ground (simple heuristic via last position)
            // visuals now handled in CatView

            // Determine mass box from live SVG when available
            let massBoxVB = lastMassBoxVBRef.current;
            try {
              if (catRef.current) {
                const svg = catRef.current as unknown as SVGSVGElement;
                const bodyNode = svg.querySelector('#body') as unknown as SVGGElement | null;
                const headNode = svg.querySelector('#head') as unknown as SVGGElement | null;
                if (
                  bodyNode &&
                  headNode &&
                  typeof (bodyNode as unknown as { getBBox?: () => DOMRect }).getBBox === 'function' &&
                  typeof (headNode as unknown as { getBBox?: () => DOMRect }).getBBox === 'function'
                ) {
                  const b1 = (bodyNode as unknown as { getBBox: () => DOMRect }).getBBox();
                  const b2 = (headNode as unknown as { getBBox: () => DOMRect }).getBBox();
                  const x = Math.min(b1.x, b2.x);
                  const y = Math.min(b1.y, b2.y);
                  const right = Math.max(b1.x + b1.width, b2.x + b2.width);
                  const bottom = Math.max(b1.y + b1.height, b2.y + b2.height);
                  massBoxVB = { x, y, width: right - x, height: bottom - y };
                  lastMassBoxVBRef.current = massBoxVB;
                }
              }
            } catch {
              // ignore SVG measurement failures; fall back to default mass box
            }

            const effectiveMassCenterXVB = massBoxVB ? (massBoxVB.x + massBoxVB.width / 2) : MASS_CENTER_X;
            // Perceived mass center offset in px from geometric center
            const massCenterOffsetPx = ((effectiveMassCenterXVB - VIEWBOX_W / 2) / VIEWBOX_W) * catWidthPx;
            const adjustedShadowLeft = Math.round(catScreenPosition.x - SHADOW_WIDTH / 2 + massCenterOffsetPx);
            // Precompute key baselines for debug overlay
            const feetLinePxExact = catBottomPx + footGapPx;
            const massBottomLinePxExact = catBottomPx + (footGapPx + ((FEET_LINE_Y - ((lastMassBoxVBRef.current || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP }).y + (lastMassBoxVBRef.current || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP }).height)) * (catHeightPx / VIEWBOX_H)));
            const feetLinePx = Math.round(feetLinePxExact);
            const massBottomLinePx = Math.round(massBottomLinePxExact);
            // Debug logging (throttled) to analyze drift behaviors end-to-end and expose to snapshots
            if (typeof window !== 'undefined' && (window as unknown as { __CAT_DEBUG__?: boolean }).__CAT_DEBUG__ !== false) {
              const now = performance.now();
              const w = window as unknown as { __catShadowLastLogTs?: number };
              w.__catShadowLastLogTs = w.__catShadowLastLogTs || 0;
                if (now - (w.__catShadowLastLogTs ?? 0) > 200) {
                w.__catShadowLastLogTs = now;
                 const shadowCenterX = adjustedShadowLeft + SHADOW_WIDTH / 2;
                const catPerceivedCenterX = roundedCatLeft + Math.round(massCenterOffsetPx);
                const shadowRect = shadowContainerRef.current?.getBoundingClientRect?.();
                const catRect = catContainerRef.current?.getBoundingClientRect?.();
                const worldEl = document.querySelector('.world-content') as HTMLElement | null;
                const worldTransform = worldEl ? getComputedStyle(worldEl).transform : undefined;
                const frame = {
                  world: catWorldCoords,
                  catScreen: catScreenPosition,
                  groundScreen,
                  shadow: {
                    bottom: shadowLayout.bottom,
                    width: SHADOW_WIDTH,
                    height: SHADOW_HEIGHT,
                  },
                  layout: {
                    catWidthPx,
                    catHeightPx,
                    footGapPx,
                    jumpDeltaPx,
                    zBackCorrectionPx: 0,
                    catBottomPx: catBottomPx,
                    containerCenterPx: roundedCatLeft,
                    adjustedShadowLeft,
                    massCenterOffsetPx,
                    massBox: (() => {
                      const scaleY = catHeightPx / VIEWBOX_H;
                      const vb = massBoxVB || { x: MASS_LEFT, y: MASS_TOP, width: MASS_RIGHT - MASS_LEFT, height: MASS_BOTTOM - MASS_TOP };
                      const leftPx = catLeftPx + (vb.x / VIEWBOX_W) * catWidthPx;
                      const widthPx = (vb.width / VIEWBOX_W) * catWidthPx;
                       const bottomPx = massBottomLinePxExact;
                      const heightPx = vb.height * scaleY;
                      return { leftPx, bottomPx, widthPx, heightPx };
                    })(),
                  },
                   measures: {
                    feetLinePx,
                    massBottomLinePx,
                    visualShadowTopPx: shadowTopPx,
                    visualShadowCenterPx: shadowCenterPx,
                    feetDeltaPx: feetLinePx - shadowCenterPx,
                    massDeltaPx: massBottomLinePx - shadowCenterPx,
                    horizontalDeltaPx: Math.round(catPerceivedCenterX - shadowCenterX),
                    catPerceivedCenterX,
                    shadowCenterX,
                  },
                  domRects: {
                    shadow: shadowRect ? { left: shadowRect.left, top: shadowRect.top, width: shadowRect.width, height: shadowRect.height } : null,
                    cat: catRect ? { left: catRect.left, top: catRect.top, width: catRect.width, height: catRect.height } : null,
                    worldTransform,
                  },
                };
                (window as unknown as { __CAT_LAST_OVERLAY__?: unknown }).__CAT_LAST_OVERLAY__ = frame;
              }
            }
            // Track last X to toggle walking animation heuristically
            if (typeof window !== 'undefined') {
              (window as unknown as { __prevCatX?: number }).__prevCatX = catWorldCoords.x;
            }
            // visuals now handled in CatView
            
        return (
          <React.Fragment>
            {/* === DEBUG OVERLAY (toggle with window.__CAT_OVERLAY__=true) === */}
            {overlayEnabled && (
              <>
                {/* Unified overlays now handled in CatView; legacy lines removed */}
              </>
            )}

            {/* === CAT VIEW (visuals only) === */}
            <CatView
              catWorldCoords={catWorldCoords}
              shadowCenterOverride={shadowCenterOverride}
              catRef={catRef as React.RefObject<SVGSVGElement>}
              walking={isWalkingUI}
              catElement={(
                <Cat
                  onClick={handleCatClick}
                  onEyeClick={handleEyeClick}
                  onEarClick={handleEarClick}
                  onNoseClick={handleNoseClick}
                  onCheekClick={handleCheekClick}
                  onTailClick={handleTailClick}
                  isPetting={isPetting}
                  isStartled={isStartled}
                  isSleeping={isSleeping}
                  isDrowsy={isDrowsy}
                  isPouncing={isPouncing}
                  isJumping={isJumping}
                  isPlaying={isPlaying}
                  isSmiling={isSmiling}
                  isSubtleWiggling={isSubtleWiggling}
                  isHappyPlaying={isHappyPlaying}
                  isEarWiggling={isEarWiggling}
                  isTailFlicking={isTailFlicking}
                  headTiltAngle={headTiltAngle}
                  pounceTarget={pounceTarget || { x: 0, y: 0 }}
                  wigglingEar={wigglingEar}
                  lastHeart={
                    trackableHeartId !== null &&
                    hearts.find((h) => h.id === trackableHeartId)
                      ? document.querySelector<HTMLDivElement>(
                          `[data-heart-id="${trackableHeartId}"]`
                        )
                      : null
                  }
                  wandMode={wandMode}
                  mouseState={mouseState}
                  pounceConfidence={pounceConfidence}
                />
              )}
            />
            
          </React.Fragment>
        );
      })()}

      {wandMode && (
        <div 
          className="wand-click-area" 
          onClick={handleWandClick}
          onMouseMove={(e) => {
            catActions.handleWandMovement({ x: e.clientX, y: e.clientY });
          }}
        />
      )}
    </>
  );
};

export default CatInteractionManager;