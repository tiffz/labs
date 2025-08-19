import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useStableCallback } from './hooks/useStableCallback';

import { useMouseTracking } from './hooks/useMouseTracking';

// Analytics types
declare global {
  interface Window {
    labsAnalytics?: {
      trackEvent(eventName: string, parameters?: Record<string, unknown>): void;
    };
  }
}
// CatInteractionManager is used via Actor
import WorldRenderer from './components/game/WorldRenderer';
import { useWorld } from './context/useWorld';
import { spawnCat, spawnFurniture, spawnCouch, spawnCounter, spawnDoor, spawnWindow, spawnRug, spawnLamp, spawnBookshelf, spawnPainting } from './engine/spawn';

import Heart from './components/game/Heart';
import Zzz from './components/game/Zzz';
import WandToy from './components/game/WandToy';
import World2D from './components/game/World2D';
import DevPanel from './components/ui/DevPanel';
import html2canvas from 'html2canvas';
import CurrencyDisplay from './components/ui/CurrencyDisplay';
import TabbedPanel from './components/panels/TabbedPanel';

import { useCatSystem } from './hooks/useCatSystem';
import { useCatPositionNew } from './hooks/useCatPositionNew';

import { useEventsSystem } from './hooks/useEventsSystem';
import { HeartSpawningService, type HeartVisuals } from './services/HeartSpawningService';
import { useAchievementSystem } from './hooks/useAchievementSystem';
import { useGameStateManager } from './hooks/useGameStateManager';
import { GameEconomyService } from './services/GameEconomyService';
import type { GameState } from './game/types';
import { ErrorReporter } from './components/ui/ErrorReporter';
import { catCoordinateSystem } from './services/CatCoordinateSystem';
import { ViewportProvider } from './context/ViewportContext';

import './styles/cats.css';

interface HeartType {
  id: number;
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
}

interface ZzzType {
  id: number;
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
}

const initialGameState: GameState = {
  love: 0,
  treats: 0,
  unlockedJobs: ['box_factory'],
  jobLevels: {},
  jobExperience: {},
  jobInterviews: {},
  thingQuantities: {},
  earnedMerits: [],
  spentMerits: {},
  // New achievement system fields
  earnedAwards: [],
  awardProgress: {},
  specialActions: {
    noseClicks: 0,
    earClicks: 0,
    cheekPets: 0,
    happyJumps: 0,
  },
};

function App() {

  
  const world = useWorld();
  // Unified mouse tracking system
  const mouseState = useMouseTracking();
  
  const gameStateManager = useGameStateManager({ initialState: initialGameState });
  const { gameState } = gameStateManager;
  
  // Viewport state management - centralized for both cat and furniture
  const [floorRatio, setFloorRatio] = useState(0.4);
  const [isResizing, setIsResizing] = useState(false);
  
  // Cat positioning for world-aware movement (new coordinate system)
  const { renderData, jumpOnce, } = useCatPositionNew();
  // Use ECS world coordinates for camera follow to avoid feedback jitter
  const [ecsCatWorldPosition, setEcsCatWorldPosition] = useState<{ x: number; y: number; z: number }>(() => renderData.worldCoordinates);
  useEffect(() => {
    const onTick = () => {
      try {
        const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
        const catId = existing?.[0];
        if (!catId) return;
        const t = world.transforms.get(catId);
        if (!t) return;
        setEcsCatWorldPosition(prev => (prev.x !== t.x || prev.y !== t.y || prev.z !== t.z) ? { x: t.x, y: t.y, z: t.z } : prev);
      } catch {/* ignore in tests */}
    };
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, [world]);
  const catScreenPosition = renderData.screenPosition;
  const catPosition = renderData.worldCoordinates; // For backwards compatibility
  
  // Events system for game interaction logging
  const {
    events,
    addAchievementEvent,
    logPetting,
    logPouncing,
    logHappy,
    logNoseClick,
    logEarClick,
    logCheekPet,
    clearEvents
  } = useEventsSystem();
  
  // Initialize cat's rest and world position on mount
  // Position initialization is now handled automatically by the new coordinate system
  

  const { love, treats, jobLevels, jobExperience, jobInterviews, thingQuantities, spentMerits } = gameState;


  const [hearts, setHearts] = useState<HeartType[]>([]);
  const [zzzs, setZzzs] = useState<ZzzType[]>([]);
  const zzzTimeoutRef = useRef<number | null>(null);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  // Energy is now managed by useCatSystem only
  const [isDevMode, setIsDevMode] = useState(false);
  const [playerControlMode, setPlayerControlMode] = useState(false);
  // Removed: wandInitialPosition was unused
  
  // Restore sleep/drowsy state for proper Z spawning and cat behavior
  const [isSleeping, setIsSleeping] = useState(false);
  const [isDrowsy, setIsDrowsy] = useState(false);

  // Systems
  // Notification system removed - replaced with Events system
  const { 
    earnedMerits, 
    availableMerits, 
    earnedAwards,
    availableAwards,
    trackSpecialAction 
  } = useAchievementSystem(gameState, gameStateManager.updateState, (notification: { title: string; message: string; type?: 'merit' | 'general' }) => {
    addAchievementEvent(notification.title, notification.message);
  });
  
  // Heart spawning service
  const heartSpawningService = useMemo(() => {
    return new HeartSpawningService({
      onHeartSpawned: (heart: HeartVisuals) => {
        const newHeart: HeartType = {
          id: heart.id,
          x: heart.x,
          y: heart.y,
          translateX: heart.translateX,
          rotation: heart.rotation,
          scale: heart.scale,
          animationDuration: heart.animationDuration,
        };
        setHearts((currentHearts) => [...currentHearts, newHeart]);
      },
      onTrackableHeartSet: (heartId: number | null) => {
        setTrackableHeartId(heartId);
      }
    });
  }, []);


  // === Stable callbacks to prevent infinite loops ===
  const onLoveGained = useStableCallback<(amount: number) => void>((amount: number) => {
    gameStateManager.currency.addLove(amount);
  });

  // Energy is now managed entirely by useCatSystem

  const onHeartSpawned = useStableCallback<(position: { x: number; y: number }) => void>((position: { x: number; y: number }) => {

    const newHeart: HeartType = {
      id: Date.now(),
      x: position.x,
      y: position.y,
      translateX: Math.random() * 40 - 20,
      rotation: Math.random() * 60 - 30,
      scale: 1.0,
      animationDuration: 1,
    };
    setHearts(currentHearts => [...currentHearts, newHeart]);
    // Remove heart after animation
    setTimeout(() => {
      setHearts(currentHearts => 
        currentHearts.filter(heart => heart.id !== newHeart.id)
      );
    }, 1000);
  });

  const onTrackableHeartSet = useStableCallback<(heartId: number | null) => void>((heartId: number | null) => {

    setTrackableHeartId(heartId);
  });

  const onTreatsGained = useStableCallback<(amount: number) => void>((amount: number) => {

    gameStateManager.currency.addTreats(amount);
  });

  // Create stable string keys for economy calculation dependencies to prevent unnecessary recalculations
  // Calculate all economic values using the centralized service
  // Only recalculate when structural game state changes, not when love/treats change from passive income
  const economy = useMemo(() => {
    return GameEconomyService.calculateEconomy(gameState);
  }, [gameState]);
  
  // Extract individual values for backwards compatibility
  const { baseLovePerInteraction } = economy;

  // === CAT SYSTEM (Clean Architecture) ===
  const {
    // Cat-specific state
    energy: catEnergy,
    isWandMode: wandMode,
    isPouncing,
    isPlaying,
    isShaking,
    isEarWiggling,
    isHappyPlaying,
    pounceTarget,
     
     // Actions
     actions: catActions,
    
    // Debug values
    pounceConfidence,
    cursorVelocity: lastVelocity,
    proximityMultiplier,
    movementNovelty,
    clickExcitement,
  } = useCatSystem({
    currentLove: love,     // Pass global state
    currentTreats: treats, // Pass global state
    economyData: economy,  // Pass economy data for love calculations
    
    // Cat state flags
    isSleeping,
    isDrowsy,
    
    // Stable callback functions
    onLoveGained,
    onHeartSpawned,
    onTrackableHeartSet,
    onTreatsGained,
    
    // Cat movement function
    // pounceToPosition intentionally omitted; ECS controls pounce visuals
  });
  


  // Use cat energy from the cat system directly
  const energyRef = useRef(catEnergy);
  energyRef.current = catEnergy; // No useEffect needed for simple ref updates
  
  // Store latest catActions in ref to avoid stale closures
  const catActionsRef = useRef(catActions);
  catActionsRef.current = catActions;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('dev');
    if (devParam === 'true' || devParam === '1') {
      setIsDevMode(true);
    }
    // Also allow overlay to be toggled globally here for non-cat overlays
    const overlayParam = params.get('overlay');
    if (overlayParam === 'true' || overlayParam === '1') {
      (window as unknown as { __CAT_OVERLAY__?: boolean }).__CAT_OVERLAY__ = true;
    }
  }, []);

  // Dev hotkey: press 's' to send snapshot when dev mode is enabled
  useEffect(() => {
    if (!isDevMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's') {
        (async () => {
          try {
            const root = document.body as HTMLElement;
            const canvas = await html2canvas(root, { useCORS: true, logging: false, backgroundColor: null, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const form = new FormData();
            const overlay = (window as unknown as { __CAT_LAST_OVERLAY__?: unknown }).__CAT_LAST_OVERLAY__;
            const ecs = (window as unknown as { __ECS_DEBUG__?: unknown }).__ECS_DEBUG__;
            form.append('meta', new Blob([JSON.stringify({
              timestamp: new Date().toISOString(),
              gameState,
              catWorldCoords: catPosition,
              catScreenCoords: ecsCatWorldPosition,
              economy,
              overlay,
              ecs,
            })], { type: 'application/json' }), 'meta.json');
            if (blob) form.append('screenshot', blob, 'screenshot.png');
            await fetch('/__debug_snapshot', { method: 'POST', body: form });
            console.debug('[CAT-DEBUG] Snapshot sent (hotkey)');
          } catch (e) {
            console.error('Snapshot failed (hotkey)', e);
          }
        })();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDevMode, gameState, catPosition, catScreenPosition, economy, ecsCatWorldPosition]);

  // Energy regeneration is now handled by useCatSystem


  
  const removeHeart = (id: number) => {
    setHearts((currentHearts) =>
      currentHearts.filter((heart) => heart.id !== id)
    );
  };



  // Note: wakeUp function removed - now handled directly in inactivity detection

  const removeZzz = (id: number) => {
    setZzzs((currentZzzs) => currentZzzs.filter((zzz) => zzz.id !== id));
  };
  
  // Store timer functions in refs to avoid recreating them
  const timersRef = useRef<{
    drowsinessTimer: number;
    sleepTimer: number;
    lastResetTime: number;
  }>({ drowsinessTimer: 0, sleepTimer: 0, lastResetTime: 0 });

  const startInactivityTimers = useStableCallback(() => {
    clearTimeout(timersRef.current.drowsinessTimer);
    clearTimeout(timersRef.current.sleepTimer);
    timersRef.current.drowsinessTimer = window.setTimeout(() => setIsDrowsy(true), 20000);
    timersRef.current.sleepTimer = window.setTimeout(() => {
      setIsDrowsy(false);
      setIsSleeping(true);
    }, 30000);
  });

  const resetInactivityTimer = useStableCallback(() => {
    const now = Date.now();
    // Throttle to once every 100ms to prevent excessive calls
    if (now - timersRef.current.lastResetTime < 100) return;
    timersRef.current.lastResetTime = now;
    
    // Use functional updates to avoid reading current state
    setIsSleeping(prev => prev ? false : prev);
    setIsDrowsy(prev => prev ? false : prev);
    setZzzs(prev => prev.length > 0 ? [] : prev);
    startInactivityTimers();
  });

  // Initialize sleep state and timers on mount
  useEffect(() => {
    setIsSleeping(false);
    setIsDrowsy(false);
    setZzzs([]);
    startInactivityTimers();

    // Capture current timers for cleanup
    const timers = timersRef.current;
    return () => {
      clearTimeout(timers.drowsinessTimer);
      clearTimeout(timers.sleepTimer);
    };
  }, [startInactivityTimers]);

  // Register mouse event listeners
  useEffect(() => {
    const unsubscribe = mouseState.onMouseMove(resetInactivityTimer);
    document.addEventListener('mousedown', resetInactivityTimer);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', resetInactivityTimer);
    };
  }, [mouseState, resetInactivityTimer]);

  // Cat position tracking removed - Z's now use direct DOM queries like hearts

  useEffect(() => {
    const initialDelay = 2500;
    const minDelay = 1000;
    const decayFactor = 0.98;

    const scheduleNextZzz = (delay: number) => {
      if (zzzTimeoutRef.current) clearTimeout(zzzTimeoutRef.current);
      zzzTimeoutRef.current = window.setTimeout(() => {
        // Get cat's current screen position directly from DOM - same approach as hearts
        const catElement = document.querySelector('[data-testid="cat"]') as HTMLElement;
        let spawnX = window.innerWidth / 2;
        let spawnY = window.innerHeight / 2;
        
        if (catElement) {
          const catRect = catElement.getBoundingClientRect();
          // Use cat's head position - same calculation as hearts would use
          spawnX = catRect.left + catRect.width / 2;
          spawnY = catRect.top + catRect.height * 0.3; // 30% from top for head
        }

        setZzzs((currentZzzs) => [...currentZzzs, {
            id: Date.now(),
            x: spawnX + (Math.random() * 40 - 20),
            y: spawnY - 40 + (Math.random() * 20 - 10), // Above cat's head
            translateX: Math.random() * 40 - 20,
            rotation: Math.random() * 60 - 30,
            scale: Math.random() * 0.4 + 0.8,
        }]);
        scheduleNextZzz(Math.max(minDelay, delay * decayFactor));
      }, delay);
    };

    if (isSleeping) scheduleNextZzz(initialDelay);
    else if (zzzTimeoutRef.current) clearTimeout(zzzTimeoutRef.current);

    return () => {
      if (zzzTimeoutRef.current) clearTimeout(zzzTimeoutRef.current);
    };
  }, [isSleeping]);

  // Escape key handler for wand/player modes
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (playerControlMode) {
          setPlayerControlMode(false);
        } else if (wandMode) {
          catActionsRef.current.toggleWandMode();
        }
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [playerControlMode, wandMode]);

  // Player control keyboard handler
  useEffect(() => {
    if (!playerControlMode) return;
    const worldRef = { current: world };
    const held = { left: false, right: false, up: false, down: false };
    const onDown = (e: KeyboardEvent) => {
      const prev = { ...held };
      if (e.key === 'ArrowLeft') held.left = true;
      if (e.key === 'ArrowRight') held.right = true;
      if (e.key === 'ArrowUp') held.up = true;
      if (e.key === 'ArrowDown') held.down = true;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        // In run mode, trigger ECS jump intent directly on the cat entity
        const existing = Array.from(worldRef.current.renderables.entries()).find(([, r]) => r.kind === 'cat');
        const catId = existing?.[0];
        if (catId) {
          const intent = worldRef.current.catIntents.get(catId) || {};
          intent.happyJump = true;
          intent.jumpType = 'powerful'; // Run mode uses powerful jumps
          worldRef.current.catIntents.set(catId, intent);
        }
      }
      if (prev.left !== held.left || prev.right !== held.right || prev.up !== held.up || prev.down !== held.down) {
        // Mark activity to prevent sleep while running
        resetInactivityTimer();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') held.left = false;
      if (e.key === 'ArrowRight') held.right = false;
      if (e.key === 'ArrowUp') held.up = false;
      if (e.key === 'ArrowDown') held.down = false;
    };
    // Continuous RAF-based movement
    let raf: number | null = null;
    // Keep a RAF loop to continuously feed input to ECS; no time integration here
    const step = () => {
        // Always allow lateral motion; ECS handles vertical independently
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        const dz = (held.down ? 1 : 0) - (held.up ? 1 : 0);
        const existing = Array.from(worldRef.current.renderables.entries()).find(([, r]) => r.kind === 'cat');
        const catId = existing?.[0];
        if (catId) {
          worldRef.current.runControls.set(catId, { moveX: dx, moveZ: dz });
        }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [playerControlMode, jumpOnce, resetInactivityTimer, world]);

  // Global key handler for wand mode toggle
  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      if (event.key === 'w' || event.key === 'W') {
        catActionsRef.current.toggleWandMode();
      }
    };

    document.addEventListener('keydown', handleGlobalKeys);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeys);
    };
  }, []); // No dependencies - always active

  // Handle time skip for debugging - now using centralized logic
  const handleTimeSkip = useStableCallback(() => {

    const oneDayInSeconds = 24 * 60 * 60;
    const currentState = gameStateManager.gameState;
    const currentEconomy = GameEconomyService.calculateEconomy(currentState);
    const result = GameEconomyService.calculatePassiveIncome(currentState.treats, oneDayInSeconds, currentEconomy);
    
    gameStateManager.debug.skipTime(result.finalTreats, result.loveGained);
  });

  // Debug functions to give resources
  const giveDebugTreats = useStableCallback(() => {

    gameStateManager.debug.giveDebugTreats();
  });

  const giveDebugLove = useStableCallback(() => {

    gameStateManager.debug.giveDebugLove();
  });

  // Store gameStateManager in a ref to avoid restarting interval on every change
  const gameStateManagerRef = useRef(gameStateManager);
  gameStateManagerRef.current = gameStateManager;

  useEffect(() => {
    const treatInterval = setInterval(() => {
      // Get current state from ref to avoid dependency issues
      const currentState = gameStateManagerRef.current.gameState;
      const currentEconomy = GameEconomyService.calculateEconomy(currentState);
      const result = GameEconomyService.calculatePassiveIncome(currentState.treats, 1, currentEconomy);
      
      // Only apply if there's actually income to apply (avoid unnecessary state updates)
      if (result.treatsGained > 0 || result.loveGained > 0) {
        gameStateManagerRef.current.currency.applyPassiveIncome(result.finalTreats, result.loveGained);
      }
    }, 1000);
    return () => clearInterval(treatInterval);
  }, []); // Empty deps - interval runs once and uses ref for current values

  const handlePromotion = (jobId: string) => {
    gameStateManager.jobs.promoteJob(jobId);
  };

  const handleTraining = (jobId: string) => {
    gameStateManager.jobs.trainForJob(jobId);
  };

  const handleInterview = (jobId: string) => {
    gameStateManager.jobs.interviewForJob(jobId);
  };

  // Handle merit upgrade purchases
  const handlePurchaseUpgrade = useStableCallback<(upgradeId: string) => void>((upgradeId: string) => {

    gameStateManager.purchases.buyUpgrade(upgradeId);
  });

  // Handle thing purchases
  const handlePurchaseThing = useStableCallback<(thingId: string) => void>((thingId: string) => {

    gameStateManager.purchases.buyThing(thingId);
  });

  useEffect(() => {
    if (wandMode) document.body.classList.add('wand-mode-active');
    else document.body.classList.remove('wand-mode-active');
    return () => document.body.classList.remove('wand-mode-active');
  }, [wandMode]);





  // Notification system completely removed - replaced with Events system

  const viewportProviderProps = useMemo(() => ({
    floorRatio,
    isResizing
  }), [floorRatio, isResizing]);

  return (
    <ViewportProvider {...viewportProviderProps}>
      <div className="game-layout">
      {/* Currency Display - Fixed outside world */}
      <div className="currency-overlay">
        <CurrencyDisplay 
          love={love} 
          treats={treats} 
          economy={economy} 
        />
      </div>

      {/* World Viewport */}
      <div className="world-viewport-container">
        <World2D 
          catWorldPosition={renderData.worldCoordinates} 
          enableCameraFollow={true}
          wandMode={wandMode}
          onWandToggle={catActions.toggleWandMode}
          playerControlMode={playerControlMode}
          onToggleRunMode={() => setPlayerControlMode(v => !v)}
          onViewportChange={useCallback((newFloorRatio: number, newIsResizing: boolean) => {
            setFloorRatio(prev => prev === newFloorRatio ? prev : newFloorRatio);
            setIsResizing(prev => prev === newIsResizing ? prev : newIsResizing);
          }, [])}
        >
          <ErrorReporter />

          {/* UI Overlays */}
          <div className="ui-overlay-container" />

      {/* Animated Elements Portal */}
      {ReactDOM.createPortal(
        <>
          {hearts.map((heart) => (
            <Heart
              key={heart.id}
              {...heart}
              onAnimationEnd={() => removeHeart(heart.id)}
            />
          ))}
          {zzzs.map((zzz) => (
            <Zzz key={zzz.id} {...zzz} onAnimationEnd={() => removeZzz(zzz.id)} />
          ))}
          {wandMode && (
              <WandToy
                onWandClick={() => catActions.handleWandClick()}
                initialPosition={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
                mouseState={mouseState}
              />
          )}
        </>,
        document.getElementById('heart-container')!
      )}

      {/* World entities (ECS-driven) */}
      {(() => {
        // Ensure a cat entity exists (spawn once)
        const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
        let catId = existing?.[0];
        if (!catId) {
          catId = spawnCat(world, { x: catPosition.x, y: catPosition.y, z: catPosition.z });
          // Seed demo furniture pieces once with proper placement
          const existingFurniture = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'furniture');
          if (!existingFurniture) {

            
            // Wall-mounted furniture (no floor space) - wall is at z=0, using 0-1400 coordinate system
            // Y coordinates: 0-400 logical wall height, where 0=floor level, 400=ceiling
            spawnWindow(world, { x: 600, y: 180, z: 0 }); // On back wall, mid-height (45% up wall) - spans 285 to 915
            spawnDoor(world, { x: 850, y: 0, z: 0 }); // On back wall, at floor level - spans 730 to 970
            spawnPainting(world, { x: 200, y: 180, z: 0 }, 'cat', 'large'); // Mid-height on wall (45% up) - spans 95 to 305
            spawnPainting(world, { x: 1000, y: 160, z: 0 }, 'abstract', 'small'); // Slightly lower (40% up wall) - spans 925 to 1075
            
            // Wall-mounted floor furniture (against wall, with shadows) - using 0-1400 coordinate system
            spawnCounter(world, { x: 1200, y: 0, z: 0 }); // Mounted to wall at z=0 - spans 1000 to 1400
            spawnBookshelf(world, { x: 160, y: 0, z: 0 }); // Mounted to wall at z=0 - spans 0 to 320
            
            // Free-standing floor furniture - distributed across 0-1400 coordinate system
            spawnFurniture(world, { x: 900, y: 0, z: 300 }); // Scratching post - mid room
            spawnCouch(world, { x: 400, y: 0, z: 200 }); // Couch - closer to front
            // Use fixed rug position for consistent scaling with other furniture
            // Position rug very close to front to prevent wall collision at extreme scaling
            // Rug visual depth (VB_H=100) extends backward in perspective view
            // Position rug at fixed location that aligns with cat's default position
            // This ensures consistent relative positioning during viewport scaling
            // while allowing the cat to move freely around the world
            spawnRug(world, { x: 700, y: 0, z: 720 }); // Fixed position matching cat's default
            spawnLamp(world, { x: 750, y: 0, z: 250 }); // Lamp - mid room
          }
        }
        return (
          <WorldRenderer
            economy={economy}
            mouseState={mouseState}
            ui={{
              catEnergy,
              wandMode,
              isPouncing,
              isPlaying,
              isShaking,
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
              // onCatPositionUpdate removed - Z's use direct DOM queries
              trackSpecialAction,
              heartSpawningService,
              eventLoggers: { logPetting, logPouncing, logHappy, logNoseClick, logEarClick, logCheekPet },
            }}
          />
        );
      })()}
        </World2D>
      </div>

      {/* Side Panel - Fixed outside world viewport */}
      <div className="side-panel-fixed">
        <TabbedPanel
          jobLevels={jobLevels}
          jobExperience={jobExperience}
          jobInterviews={jobInterviews}
          onPromote={handlePromotion}
          onTrain={handleTraining}
          onInterview={handleInterview}
          unlockedJobs={gameState.unlockedJobs}
          thingQuantities={thingQuantities}
          onPurchaseThing={handlePurchaseThing}
          spentMerits={spentMerits}
          onPurchaseUpgrade={handlePurchaseUpgrade}
          earnedMerits={earnedMerits}
          availableMerits={availableMerits}
          earnedAwards={earnedAwards}
          availableAwards={availableAwards}
          specialActions={gameState.specialActions}
          currentLove={love}
          currentTreats={treats}
          gameEvents={events}
          onClearEvents={clearEvents}
        />
      </div>

      {/* Dev Panel - Fixed to viewport, outside world */}
      {isDevMode && (
        <div className="dev-panel-overlay">
          <DevPanel
            energy={catEnergy}
            pounceConfidence={pounceConfidence}
            lastVelocity={lastVelocity}
            proximityMultiplier={proximityMultiplier}
            lovePerClick={baseLovePerInteraction}
            movementNovelty={movementNovelty}
            clickExcitement={clickExcitement}
            onTimeSkip={handleTimeSkip}
            onGiveTreats={giveDebugTreats}
            onGiveLove={giveDebugLove}
            catWorldCoords={catPosition}
            catScreenCoords={catScreenPosition}
            shadowCoords={(() => {
              const shadowBase = catCoordinateSystem.catToScreen({ x: catPosition.x, y: 0, z: catPosition.z });
              return { x: catPosition.x, y: shadowBase.y, scale: shadowBase.scale * 0.8 };
            })()}
            onSendSnapshot={async () => {
              if (!import.meta.env.DEV) return;
              try {
                const root = document.body as HTMLElement;
                const canvas = await html2canvas(root, { useCORS: true, logging: false, backgroundColor: null, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
                const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const form = new FormData();
                const overlay = (window as unknown as { __CAT_LAST_OVERLAY__?: unknown }).__CAT_LAST_OVERLAY__;
                const ecs = (window as unknown as { __ECS_DEBUG__?: unknown }).__ECS_DEBUG__;
                form.append('meta', new Blob([JSON.stringify({
                  timestamp: new Date().toISOString(),
                  gameState,
                  catWorldCoords: catPosition,
                  catScreenCoords: ecsCatWorldPosition,
                  economy,
                  overlay,
                  ecs,
                })], { type: 'application/json' }), 'meta.json');
                if (blob) form.append('screenshot', blob, 'screenshot.png');
                await fetch('/__debug_snapshot', { method: 'POST', body: form });
                console.debug('[CAT-DEBUG] Snapshot sent');
              } catch (e) {
                console.error('Snapshot failed', e);
              }
            }}
            // Sleep state management
            isSleeping={isSleeping}
            isDrowsy={isDrowsy}
            onToggleSleep={() => setIsSleeping(prev => !prev)}
            onToggleDrowsy={() => setIsDrowsy(prev => !prev)}
            onResetInactivity={resetInactivityTimer}
          />
        </div>
      )}
    </div>
    </ViewportProvider>
  );
}

export default App; 