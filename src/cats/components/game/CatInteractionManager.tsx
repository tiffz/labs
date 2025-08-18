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
import { useWorld } from '../../context/useWorld';
// serverLogger temporarily disabled for noise reduction

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
  entityId?: string;
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
  onCatPositionUpdate?: (position: { x: number; y: number; z?: number }) => void;
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
  entityId,
  catWorldCoords,
  shadowCenterOverride,
  eventLoggers,
}) => {
  // Local cat visual state
  const [isPetting, setIsPetting] = useState(false);
  // Startled and subtle wiggle now driven by ECS (catAnims)
  const [isJumping, setIsJumping] = useState(false);
  const [isWalkingUI, setIsWalkingUI] = useState(false);
  const walkingPrevWorldXRef = useRef<number | null>(null);
  const walkingPrevWorldZRef = useRef<number | null>(null);
  const walkingLastActiveRef = useRef<number>(0);
  const walkingLastTsRef = useRef<number | null>(null);
  const filteredSpeedRef = useRef<number>(0);
  const walkingWarmupStartRef = useRef<number>(performance.now());
  const lastNearZeroRef = useRef<number>(performance.now());
  const debugRafRef = useRef<number | null>(null);
  const rapidClickTimestampsRef = useRef<number[]>([]);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  // Smile now driven by ECS (catAnims.smiling)
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  // Tail flick now driven by ECS (catAnims.tailFlicking)
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
      // Use requestAnimationFrame to ensure DOM is fully settled
      const updatePosition = () => {
        if (catRef.current) {
          const catRect = catRef.current.getBoundingClientRect();
          
          // Check if the rect is valid (DOM element is actually rendered)
          if (catRect.width === 0 || catRect.height === 0) {
            // DOM not ready yet, try again after a short delay
            // Use setTimeout instead of requestAnimationFrame for test compatibility
            const timeoutId = setTimeout(() => {
              if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(updatePosition);
              } else {
                // Fallback for test environment
                setTimeout(updatePosition, 16);
              }
            }, 10);
            // Store timeout for cleanup
            if (!timeoutRefs.current) timeoutRefs.current = [];
            timeoutRefs.current.push(timeoutId);
            return;
          }
          
          // Simple approach: getBoundingClientRect already accounts for camera position
          // No camera compensation needed - the DOM position is already correct
          const headCenterX = catRect.left + catRect.width / 2;
          const headCenterY = catRect.top + catRect.height * 0.3; // 30% from top for head
          
          // Debug logging for simple approach (disabled for production)
          // if (typeof window !== 'undefined' && (window as any).__CAT_DEBUG__ !== false) {
          //   console.log('[Z-SIMPLE-FINAL] Position update:', {
          //     catWorldCoords,
          //     catRect: { left: catRect.left, top: catRect.top, width: catRect.width, height: catRect.height },
          //     headCenterX,
          //     headCenterY,
          //     approach: 'simple getBoundingClientRect (no camera compensation)',
          //     xCalculation: `${catRect.left} + ${catRect.width}/2 = ${headCenterX}`,
          //     yCalculation: `${catRect.top} + ${catRect.height} * 0.3 = ${headCenterY}`,
          //     isInitialPosition: catWorldCoords.x === 560 && catWorldCoords.z === 720
          //   });
          // }
          
          const position = {
            x: headCenterX,
            y: headCenterY,
          };
          onCatPositionUpdate?.(position);
        }
      };
      
      // Use requestAnimationFrame to ensure the DOM is fully rendered
      requestAnimationFrame(updatePosition);
    }
  }, [onCatPositionUpdate, catWorldCoords.x, catWorldCoords.y, catWorldCoords.z]);
  const cheekClickFlag = useRef(false);
  // Removed unused clickTimestampsRef (using rapidClickTimestampsRef instead)
  
  const { baseLovePerInteraction, meritMultipliers } = economy;

  // Note: smile is now primarily driven by ECS `catAnims.smiling`. Local fallback kept for existing flows.

  const world = useWorld();

  // ECS anim flags snapshot to drive re-render on changes
  const [animFlags, setAnimFlags] = useState<{ smiling: boolean; earWiggle: 'left' | 'right' | null; tailFlicking: boolean; startled: boolean; subtleWiggle: boolean }>(() => {
    const a = entityId ? world.catAnims.get(entityId) : undefined;
    return {
      smiling: Boolean(a?.smiling),
      earWiggle: (a?.earWiggle as 'left' | 'right' | null) || null,
      tailFlicking: Boolean(a?.tailFlicking),
      startled: Boolean(a?.startled),
      subtleWiggle: Boolean(a?.subtleWiggle),
    };
  });
  const effectiveWigglingEar = animFlags.earWiggle;

  useEffect(() => {
    if (!entityId) return;
    const onTick = () => {
      const a = world.catAnims.get(entityId) || {};
      const next = {
        smiling: Boolean(a.smiling),
        earWiggle: (a.earWiggle as 'left' | 'right' | null) || null,
        tailFlicking: Boolean(a.tailFlicking),
        startled: Boolean(a.startled),
        subtleWiggle: Boolean(a.subtleWiggle),
      };
      const prev = animFlags;
      if (
        prev.smiling !== next.smiling ||
        prev.earWiggle !== next.earWiggle ||
        prev.tailFlicking !== next.tailFlicking ||
        prev.startled !== next.startled ||
        prev.subtleWiggle !== next.subtleWiggle
      ) {
        setAnimFlags(next);
      }
    };
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, [entityId, world, animFlags]);

  // Drive a lightweight re-render each world tick so position updates are reflected even when anim flags are unchanged
  const [, forceRender] = useState(0);
  useEffect(() => {
    const onTick = () => forceRender((v) => (v + 1) & 0x3fffffff);
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, []);

  // Walking UI latch based on smoothed horizontal speed to avoid hotspot jitter
  useEffect(() => {
    // If cat is airborne or pouncing, ensure walking anim is off
    if (catWorldCoords.y > 1 || isPouncing) {
      if (isWalkingUI) setIsWalkingUI(false);
      walkingPrevWorldXRef.current = catWorldCoords.x;
      walkingPrevWorldZRef.current = catWorldCoords.z;
      walkingLastTsRef.current = performance.now();
      return;
    }
    const now = performance.now();
    const currentX = Math.round(catWorldCoords.x);
    const currentZ = Math.round(catWorldCoords.z);
    const prevX = walkingPrevWorldXRef.current ?? currentX;
    const prevZ = walkingPrevWorldZRef.current ?? currentZ;
    const prevTs = walkingLastTsRef.current ?? now;
    const dt = Math.max(1, now - prevTs); // ms
    const dx = Math.abs(currentX - prevX);
    const dz = Math.abs(currentZ - prevZ);
    // Calculate combined movement speed (both X and Z axes)
    const totalDistance = Math.sqrt(dx * dx + dz * dz);
    const instSpeed = (totalDistance / dt) * 1000; // px/sec
    // Exponential smoothing
    const alpha = 0.25;
    filteredSpeedRef.current = filteredSpeedRef.current * (1 - alpha) + instSpeed * alpha;

    // Thresholds with hysteresis
    const START_SPEED = 18; // px/sec (raise to reduce false positives)
    const STOP_SPEED = 6;   // px/sec
    const INACTIVITY_MS = 260;
    const WARMUP_MS = 400;
    const NEAR_ZERO_SPEED = 0.8; // px/sec
    const NEAR_ZERO_TIMEOUT_MS = 300;

    // Warmup window: do not enable walking immediately after mount
    const allowWalking = now - (walkingWarmupStartRef.current || now) > WARMUP_MS;

    if (allowWalking && !isJumping && filteredSpeedRef.current >= START_SPEED) {
      walkingLastActiveRef.current = now;
      if (!isWalkingUI) setIsWalkingUI(true);
    } else if (
      isWalkingUI &&
      filteredSpeedRef.current <= STOP_SPEED &&
      now - walkingLastActiveRef.current > INACTIVITY_MS
    ) {
      setIsWalkingUI(false);
      filteredSpeedRef.current = 0;
    }

    // Hard idle clamp: if instantaneous speed is near zero for a short window, force walking off
    if (instSpeed <= NEAR_ZERO_SPEED) {
      if (!lastNearZeroRef.current) lastNearZeroRef.current = now;
      if (now - (lastNearZeroRef.current || now) > NEAR_ZERO_TIMEOUT_MS) {
        if (isWalkingUI) setIsWalkingUI(false);
        filteredSpeedRef.current = 0;
      }
    } else {
      lastNearZeroRef.current = now;
    }

    // Quantize input X and Z before diff to avoid half-px flickers tripping the latch
    walkingPrevWorldXRef.current = currentX;
    walkingPrevWorldZRef.current = currentZ;
    walkingLastTsRef.current = now;
    // Debug is written from CatView to keep parity with DOM
  }, [catWorldCoords.x, catWorldCoords.z, catWorldCoords.y, isPouncing, isJumping, isWalkingUI]);

  // Ensure walking state decays even when X stops changing by ticking on world updates
  useEffect(() => {
    const onWorldTick = () => {
      // If cat is airborne or pouncing, ensure walking anim is off
      if (catWorldCoords.y > 1 || isPouncing) {
        if (isWalkingUI) setIsWalkingUI(false);
        walkingPrevWorldXRef.current = catWorldCoords.x;
        walkingPrevWorldZRef.current = catWorldCoords.z;
        walkingLastTsRef.current = performance.now();
        return;
      }
      const now = performance.now();
      const currentX = Math.round(catWorldCoords.x);
      const currentZ = Math.round(catWorldCoords.z);
      const prevX = walkingPrevWorldXRef.current ?? currentX;
      const prevZ = walkingPrevWorldZRef.current ?? currentZ;
      const prevTs = walkingLastTsRef.current ?? now;
      const dt = Math.max(1, now - prevTs); // ms
      const dx = Math.abs(currentX - prevX);
      const dz = Math.abs(currentZ - prevZ);
      // Calculate combined movement speed (both X and Z axes)
      const totalDistance = Math.sqrt(dx * dx + dz * dz);
      const instSpeed = (totalDistance / dt) * 1000; // px/sec
      const alpha = 0.25;
      filteredSpeedRef.current = filteredSpeedRef.current * (1 - alpha) + instSpeed * alpha;

      const START_SPEED = 18;
      const STOP_SPEED = 6;
      const INACTIVITY_MS = 260;
      const WARMUP_MS = 400;
      const NEAR_ZERO_SPEED = 0.8;
      const NEAR_ZERO_TIMEOUT_MS = 300;
      const allowWalking = now - (walkingWarmupStartRef.current || now) > WARMUP_MS;

      let nextWalking = isWalkingUI;
      if (allowWalking && !isJumping && filteredSpeedRef.current >= START_SPEED) {
        walkingLastActiveRef.current = now;
        nextWalking = true;
      } else if (
        nextWalking &&
        filteredSpeedRef.current <= STOP_SPEED &&
        now - walkingLastActiveRef.current > INACTIVITY_MS
      ) {
        nextWalking = false;
      }

      if (instSpeed <= NEAR_ZERO_SPEED) {
        if (!lastNearZeroRef.current) lastNearZeroRef.current = now;
        if (now - (lastNearZeroRef.current || now) > NEAR_ZERO_TIMEOUT_MS) {
          nextWalking = false;
        }
      } else {
        lastNearZeroRef.current = now;
      }

      if (nextWalking !== isWalkingUI) {
        setIsWalkingUI(nextWalking);
        if (!nextWalking) filteredSpeedRef.current = 0;
      }

      walkingPrevWorldXRef.current = currentX;
      walkingPrevWorldZRef.current = currentZ;
      walkingLastTsRef.current = now;
      // Debug is written from CatView to keep parity with DOM
    };
    window.addEventListener('world-tick', onWorldTick);
    return () => {
      window.removeEventListener('world-tick', onWorldTick);
      if (debugRafRef.current) cancelAnimationFrame(debugRafRef.current);
      debugRafRef.current = null;
      // Clear any pending timeouts
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [catWorldCoords.x, catWorldCoords.y, catWorldCoords.z, isPouncing, isJumping, isWalkingUI, world]);

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
    // Mirror into ECS intent to drive state machine during transition
    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.alert = true;
      intent.pouncePrep = true;
      world.catIntents.set(entityId, intent);
      // reset flags shortly after to avoid latching
      window.setTimeout(() => {
        const i2 = world.catIntents.get(entityId) || {};
        i2.alert = false;
        i2.pouncePrep = false;
        world.catIntents.set(entityId, i2);
      }, 50);
    }
    
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

    // Subtle ear wiggle on pet (ECS-driven)
    if (!effectiveWigglingEar && Math.random() < 0.4 && entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.subtleWiggle = true;
      world.catIntents.set(entityId, intent);
    }

    const now = Date.now();
    // Happy jump trigger: N rapid clicks in a short window when not in wand mode
    if (!cheekClickFlag.current && !wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 1200; // Increased from 800ms to make it less frequent
      const JUMP_CLICK_THRESHOLD = 5; // Increased from 3 to require more clicks

      rapidClickTimestampsRef.current.push(now);
      rapidClickTimestampsRef.current = rapidClickTimestampsRef.current.filter(
        (t) => now - t < JUMP_WINDOW_MS
      );

      if (rapidClickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD) {
        setIsJumping(true);
        
        // Trigger ECS-driven happy jump (impulse handled in JumpImpulseSystem)
        if (entityId) {
          const intent = world.catIntents.get(entityId) || {};
          intent.happyJump = true;
          intent.jumpType = 'happy'; // Happy jumps are light bounces
          world.catIntents.set(entityId, intent);
        }
        // Back-compat for tests/instrumentation expecting this signal
        try { document.dispatchEvent(new CustomEvent('cat-happy-jump')); } catch { /* no-op */ }
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
    if (effectiveWigglingEar) return;

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
    
    // Mark ECS intent for ear wiggle (and smile via boop if desired)
    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      if (ear === 'left') intent.earLeft = true; else intent.earRight = true;
      world.catIntents.set(entityId, intent);
    }
    // Skip heart spawning and visual effects when wand is active, but allow love updates
    if (wandMode) return;
    
    // Use unified heart spawning
    heartSpawningService.spawnHearts({
      position: { x: event.clientX, y: event.clientY },
      loveAmount: loveFromClick,
      interactionType: 'petting'
    });

    // Mirror to ECS intent for future ear-driven behaviors
    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      if (ear === 'left') intent.earLeft = true; else intent.earRight = true;
      intent.alert = true;
      world.catIntents.set(entityId, intent);
      window.setTimeout(() => {
        const i2 = world.catIntents.get(entityId) || {};
        i2.alert = false; i2.earLeft = false; i2.earRight = false;
        world.catIntents.set(entityId, i2);
      }, 50);
    }
  };
  
  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.startled = true;
      world.catIntents.set(entityId, intent);
      // Clear after one rendered frame so systems observe a single-tick pulse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const i2 = world.catIntents.get(entityId) || {};
          i2.startled = false;
          world.catIntents.set(entityId, i2);
        });
      });
    }
  };

  const handleTailClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.startled = true;
      intent.alert = true;
      intent.tailFlick = true;
      world.catIntents.set(entityId, intent);
      // Clear after one rendered frame so systems observe a single-tick pulse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const i2 = world.catIntents.get(entityId) || {};
          i2.tailFlick = false;
          i2.alert = false;
          i2.startled = false;
          world.catIntents.set(entityId, i2);
        });
      });
    }
  };
  
  const handleNoseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Track nose click for Boop award
    trackSpecialAction('noseClicks');
    
    // Log nose click event
    eventLoggers?.logNoseClick();
    
    // Generate love regardless of wand mode; ECS smiling handled via intents
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

    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.alert = true;
      intent.noseBoop = true;
      world.catIntents.set(entityId, intent);
    }
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

    // Optional smile handled by ECS intents only
    
    if (!catRef.current) return;

    if (entityId) {
      const intent = world.catIntents.get(entityId) || {};
      intent.alert = true;
      intent.pouncePrep = true;
      intent.cheekPet = true; // trigger smiling via ECS
      world.catIntents.set(entityId, intent);
      window.setTimeout(() => {
        const i2 = world.catIntents.get(entityId) || {};
        i2.alert = false;
        i2.pouncePrep = false;
        // cheekPet is edge-triggered; CatStateSystem consumes and times the smile
        world.catIntents.set(entityId, i2);
      }, 50);
    }

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

            {/* === CAT VIEW (visuals only) with ECS-derived flags === */}
            {(() => {
              const ecsState = entityId ? world.cats.get(entityId)?.state : undefined;
              const ecsIsSleeping = ecsState === 'sleeping';
              const ecsIsPouncing = ecsState === 'pouncePrep' || ecsState === 'pouncing';
              const effectiveIsSleeping = isSleeping || ecsIsSleeping;
              const effectiveIsPouncing = isPouncing || ecsIsPouncing;
              const effectiveIsSmiling = animFlags.smiling;
              const effectiveWigglingEar = animFlags.earWiggle;
              const effectiveTailFlicking = animFlags.tailFlicking;
              const effectiveIsStartled = animFlags.startled;
              const effectiveIsSubtleWiggling = animFlags.subtleWiggle;

              return (
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
                       isStartled={effectiveIsStartled}
                       isSleeping={effectiveIsSleeping}
                      isDrowsy={isDrowsy}
                      isPouncing={effectiveIsPouncing}
                      isJumping={isJumping}
                      isPlaying={isPlaying}
                       isSmiling={effectiveIsSmiling}
                       isSubtleWiggling={effectiveIsSubtleWiggling}
                      isHappyPlaying={isHappyPlaying}
                      isEarWiggling={isEarWiggling}
                       isTailFlicking={effectiveTailFlicking}
                      headTiltAngle={headTiltAngle}
                      pounceTarget={pounceTarget || { x: 0, y: 0 }}
                      wigglingEar={effectiveWigglingEar}
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
              );
            })()}
            
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