/**
 * Cat Interaction Manager Component
 * 
 * Encapsulates all cat interaction logic, handlers, and state management.
 * Extracted from App.tsx to improve component organization and separation of concerns.
 */

import React, { useState, useRef, useEffect } from 'react';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { computeShadowLayout, SHADOW_OFFSET_X } from '../../services/ShadowLayout';
import Cat from './Cat';
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
  eventLoggers,
}) => {
  // Local cat visual state
  const [isPetting, setIsPetting] = useState(false);
  const [isStartled, setIsStartled] = useState(false);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [isSubtleWiggling, setIsSubtleWiggling] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const rapidClickTimestampsRef = useRef<number[]>([]);
  const [isSmiling, setIsSmiling] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  const [isTailFlicking, setIsTailFlicking] = useState(false);
  // Fixed geometry from SVG viewBox for stable anchors (avoid animation-induced drift)
  const VIEWBOX_W = 220;
  const VIEWBOX_H = 200;
  const FEET_LINE_Y = 185; // stable feet line in viewBox coords
  const FOOT_GAP_RATIO = (VIEWBOX_H - FEET_LINE_Y) / VIEWBOX_H; // ~0.075


  
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
            
            // Compute shadow from ground projection (y locked at 0) to avoid moving with cat Y
            const groundScreen = catCoordinateSystem.catToScreen({ x: catWorldCoords.x, y: 0, z: catWorldCoords.z });
            const shadowLayout = computeShadowLayout({ x: catScreenPosition.x, y: groundScreen.y, scale: groundScreen.scale });
            

            const roundedCatLeft = Math.round(catScreenPosition.x);
            // Shadow dimensions - scale already calculated
            const SHADOW_WIDTH = shadowLayout.width;
            const SHADOW_HEIGHT = shadowLayout.height;
            // Single aesthetic parameter: how much of the shadow should be overlapped (0..1)
            const OVERLAP_RATIO = 0.56; // fraction of shadow height to cover
            // Compute absolute-positioned cat container without transforms
            const catWidthPx = Math.round(300 * scale);
            const catLeftPx = Math.round(roundedCatLeft - catWidthPx / 2);
            // Use SVG foot anchor so feet meet baseline irrespective of extra viewBox padding
            const catHeightPx = Math.round(catWidthPx * (VIEWBOX_H / VIEWBOX_W));
            const footGapPx = Math.round(FOOT_GAP_RATIO * catHeightPx);
            // Apply current jump delta (cat y above ground) to keep vertical movement visible
            const jumpDeltaPx = Math.max(0, Math.round(catScreenPosition.y - groundScreen.y));
            // Ratio-based overlap (scale invariant) with back correction (eased)
            const k = SHADOW_HEIGHT > 0 ? footGapPx / SHADOW_HEIGHT : 0;
            const floorH = Math.max(1, catCoordinateSystem.getFloorDimensions().screenHeight);
            const t = groundScreen.y / floorH; // 1 at back → 0 at front
            const zBackCorrectionPx = Math.round(60 * Math.pow(t, 2)); // ease so mid-arc is flatter
            let catBottomPx = shadowLayout.bottom + (OVERLAP_RATIO - k) * SHADOW_HEIGHT + jumpDeltaPx - zBackCorrectionPx;
            // Ensure a minimum visible rim of the shadow at all times (avoid full coverage)
            const MIN_SHADOW_RIM_PX = 12;
            const shadowTopPx = shadowLayout.bottom + SHADOW_HEIGHT;
            if (catBottomPx > shadowTopPx - MIN_SHADOW_RIM_PX) {
              catBottomPx = shadowTopPx - MIN_SHADOW_RIM_PX;
            }
            catBottomPx = Math.round(catBottomPx);
            const catContainerStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${catLeftPx}px`,
              bottom: `${catBottomPx}px`,
              width: `${catWidthPx}px`,
              height: 'auto',
              zIndex: 6,
            };

            // Keep shadow within floor bounds to ensure visibility at back
            const floorH2 = Math.max(1, catCoordinateSystem.getFloorDimensions().screenHeight);
            const adjustedShadowBottom = Math.max(0, Math.min(shadowLayout.bottom, floorH2 - SHADOW_HEIGHT));
            // Center shadow under container center (constant pixel bias only)
            const containerCenterPx = catLeftPx + catWidthPx / 2;
            const adjustedShadowLeft = Math.round(containerCenterPx - SHADOW_WIDTH / 2 + SHADOW_OFFSET_X);
            // Debug logging (throttled) to analyze drift behaviors end-to-end
            if (typeof window !== 'undefined' && (window as unknown as { __CAT_DEBUG__?: boolean }).__CAT_DEBUG__ !== false) {
              const now = performance.now();
              const w = window as unknown as { __catShadowLastLogTs?: number };
              w.__catShadowLastLogTs = w.__catShadowLastLogTs || 0;
              if (now - (w.__catShadowLastLogTs ?? 0) > 200) {
                w.__catShadowLastLogTs = now;
                console.log('[CAT-SHADOW] frame', {
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
                    zBackCorrectionPx,
                    catBottomPx,
                    containerCenterPx,
                    adjustedShadowLeft,
                  },
                });
              }
            }
            const shadowContainerStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${adjustedShadowLeft}px`,
              bottom: `${adjustedShadowBottom}px`,
              width: `${SHADOW_WIDTH}px`,
              height: 'auto',
              zIndex: 4,
            };
            
        return (
          <React.Fragment>
            {/* === SHADOW CONTAINER: Always at ground level === */}
              <div 
              className="cat-shadow-container" 
              style={shadowContainerStyle}
            >
              <div
                className="cat-shadow-simple"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: `${SHADOW_HEIGHT}px`,
                  borderRadius: '50%',
                  background: `rgba(0, 0, 0, 0.25)`,
                  transform: `translateX(${SHADOW_OFFSET_X}px)`,
                  zIndex: 1, // Behind cat
                }}
              />
            </div>
            
            {/* === CAT CONTAINER: At calculated screen position === */}
            <div className="cat-container cat-tight" style={catContainerStyle}>
              <Cat
                ref={catRef}
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
            </div>
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