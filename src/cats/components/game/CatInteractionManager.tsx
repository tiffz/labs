/**
 * Cat Interaction Manager Component
 * 
 * Encapsulates all cat interaction logic, handlers, and state management.
 * Extracted from App.tsx to improve component organization and separation of concerns.
 */

import React, { useState, useRef, useEffect } from 'react';
import Cat from './Cat';
import CatFact from '../ui/CatFact';
import { calculateFinalLoveGain } from '../../systems/lovePerInteractionSystem';
import { catFacts } from '../../data/catFacts';
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
  love: number;
  
  // Cat system state and actions
  catEnergy: number;
  wandMode: boolean;
  isPouncing: boolean;
  isPlaying: boolean;
  isShaking: boolean;
  isEarWiggling: boolean;
  isHappyPlaying: boolean;
  pounceTarget: { x: number; y: number } | null;
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
  onWandInitialPositionSet: (position: { x: number; y: number }) => void;
  onCatPositionUpdate: (position: { x: number; y: number }) => void;
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
}

const CatInteractionManager: React.FC<CatInteractionManagerProps> = ({
  economy,
  love,
  catEnergy,
  wandMode,
  isPouncing,
  isPlaying,

  isEarWiggling,
  isHappyPlaying,
  pounceTarget,
  catActions,
  trackableHeartId,
  hearts,
  isSleeping,
  isDrowsy,
  onLoveGained,
  onWandInitialPositionSet,
  onCatPositionUpdate,
  trackSpecialAction,
  heartSpawningService,
  mouseState,
}) => {
  // Local cat visual state
  const [isPetting, setIsPetting] = useState(false);
  const [isStartled, setIsStartled] = useState(false);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [isSubtleWiggling, setIsSubtleWiggling] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  const [isTailFlicking, setIsTailFlicking] = useState(false);

  
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
  const clickTimestampsRef = useRef<number[]>([]);
  
  // Random cat fact that changes occasionally
  const [currentFactIndex, setCurrentFactIndex] = useState(() => {
    return Math.floor(Math.random() * catFacts.length);
  });
  const currentFact = catFacts[currentFactIndex];
  
  // Change fact occasionally when cat is clicked
  const changeFactRef = useRef(0);
  
  const changeFact = () => {
    changeFactRef.current++;
    // Change fact every 2 clicks to show dynamic behavior (good for testing)
    if (changeFactRef.current % 2 === 0) {
      // Cycle to next fact for deterministic testing
      setCurrentFactIndex((prevIndex) => (prevIndex + 1) % catFacts.length);
    }
  };

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

    // Subtle ear wiggle on pet
    if (!wigglingEar && !isSubtleWiggling && Math.random() < 0.4) {
      setIsSubtleWiggling(true);
      setTimeout(() => {
        setIsSubtleWiggling(false);
      }, 500);
    }

    const now = Date.now();

    if (!cheekClickFlag.current && !wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 500;
      const JUMP_CLICK_THRESHOLD = 4;
      const JUMP_CHANCE = 0.1 + (catEnergy / 100) * 0.5;

      clickTimestampsRef.current.push(now);
              clickTimestampsRef.current = clickTimestampsRef.current.filter(
        (timestamp) => now - timestamp < JUMP_WINDOW_MS
      );
      
      if (clickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD && Math.random() < JUMP_CHANCE) {
        onLoveGained(loveFromClick);
        setIsJumping(true);
        
        // Track happy jump for awards
        trackSpecialAction('happyJumps');
        
        clickTimestampsRef.current = [];
        setTimeout(() => setIsJumping(false), 500);
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
    
    // Change cat fact occasionally for dynamic content
    changeFact();
  };

  const handleEarClick = (ear: 'left' | 'right', event: React.MouseEvent) => {
    if (wigglingEar || isSubtleWiggling) return;

    // Track ear click for awards
    trackSpecialAction('earClicks');

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
    cheekClickFlag.current = true;
    handleCatClick(event);

    // Track cheek pet for awards
    trackSpecialAction('cheekPets');

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
  };

  const handleWandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track wand mode toggle
    if (typeof window !== 'undefined' && window.labsAnalytics) {
      window.labsAnalytics.trackEvent('wand_mode_toggle', {
        category: 'Cat Interaction',
        label: wandMode ? 'disabled' : 'enabled',
        new_mode: wandMode ? 'normal' : 'wand',
        love_level: love,
        energy_level: catEnergy
      });
    }
    
    // Set initial wand position to current mouse position if enabling
    if (!wandMode) {
      onWandInitialPositionSet({ x: e.clientX, y: e.clientY });
    }
    
    catActions.toggleWandMode();
  };

  return (
    <>
      <CatFact fact={currentFact} />
      <div className="cat-container">
        {wandMode && (
          <div 
            className="wand-click-area" 
            onClick={handleWandClick}
            onMouseMove={(e) => {
              catActions.handleWandMovement({ x: e.clientX, y: e.clientY });
            }}
          />
        )}
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
        />
      </div>
      <div className="upgrades-container">
        <button onClick={handleWandToggle}>
          {wandMode ? 'Put away wand' : 'Play with wand'}
        </button>
      </div>
    </>
  );
};

export default CatInteractionManager;