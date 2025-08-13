import { useState, useEffect, useRef, useMemo } from 'react';
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
import { spawnCat, spawnFurniture } from './engine/spawn';
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
  
  // Cat positioning for world-aware movement (new coordinate system)
  const { renderData, pounceToPosition, moveCatTo, nudgeX, nudgeZ, jumpOnce, } = useCatPositionNew();
  // Use world coordinates for camera follow to avoid feedback jitter
  const catWorldPosition = renderData.worldCoordinates;
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
    pounceToPosition,
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

  // Use ref for cat position to avoid triggering re-renders
  const catPositionRef = useRef<{x: number, y: number, z?: number} | null>(null);

  const handleCatPositionUpdate = useStableCallback<(position: {x: number, y: number, z?: number}) => void>((position: {x: number, y: number, z?: number}) => {
    catPositionRef.current = position;
  });

  useEffect(() => {
    const initialDelay = 2500;
    const minDelay = 1000;
    const decayFactor = 0.98;

    const scheduleNextZzz = (delay: number) => {
      if (zzzTimeoutRef.current) clearTimeout(zzzTimeoutRef.current);
      zzzTimeoutRef.current = window.setTimeout(() => {
        // Use cat position if available, fallback to screen center
        // Adjust for camera panning: Zzz should be positioned within the world content's coordinates
        // Use computed style to read current camera translateX
        const contentEl = document.querySelector('.world-content') as HTMLElement | null;
        const transform = contentEl ? getComputedStyle(contentEl).transform : '';
        let cameraOffset = 0;
        if (transform && transform !== 'none') {
          const m = transform.match(/matrix\([^,]+, [^,]+, [^,]+, [^,]+, ([^,]+), ([^)]+)\)/);
          if (m) {
            cameraOffset = parseFloat(m[1]) * -1; // matrix translates are positive left; our transform is negative
          }
        }
        const spawnX = (catPositionRef.current?.x || window.innerWidth / 2) - cameraOffset;
        const spawnY = (catPositionRef.current?.y || window.innerHeight / 2) - 40; // Above cat's head

        setZzzs((currentZzzs) => [...currentZzzs, {
            id: Date.now(),
            x: spawnX + (Math.random() * 40 - 20),
            y: spawnY + (Math.random() * 20 - 10),
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
    const held = { left: false, right: false, up: false, down: false };
    const onDown = (e: KeyboardEvent) => {
      const prev = { ...held };
      if (e.key === 'ArrowLeft') held.left = true;
      if (e.key === 'ArrowRight') held.right = true;
      if (e.key === 'ArrowUp') held.up = true;
      if (e.key === 'ArrowDown') held.down = true;
      if (e.code === 'Space') jumpOnce();
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
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      // Disable lateral motion while jumping
      const jumping = (document as unknown as { isCatJumping?: boolean }).isCatJumping === true;
      if (!jumping) {
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        const dz = (held.down ? 1 : 0) - (held.up ? 1 : 0);
        if (dx !== 0) nudgeX(dx * 260 * dt);
        if (dz !== 0) nudgeZ(dz * 220 * dt);
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
  }, [playerControlMode, nudgeX, nudgeZ, jumpOnce, resetInactivityTimer]);

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

  return (
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
          catWorldPosition={catWorldPosition} 
          enableCameraFollow={true}
          wandMode={wandMode}
          onWandToggle={catActions.toggleWandMode}
          playerControlMode={playerControlMode}
          onToggleRunMode={() => setPlayerControlMode(v => !v)}
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

      {/* World entities (ECS bridge) */}
      {(() => {
        // Ensure a cat entity exists that mirrors current catPosition
        const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
        let catId = existing?.[0];
        if (!catId) {
          catId = spawnCat(world, { x: catPosition.x, y: catPosition.y, z: catPosition.z });
          // Seed a demo furniture piece behind the cat once
          const existingFurniture = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'furniture');
          if (!existingFurniture) {
            spawnFurniture(world, { x: catPosition.x + 240, y: 0, z: Math.max(0, (catPosition.z || 0) + 200) });
          }
        } else {
          // Keep ECS transform in sync with current service position (bridge during migration)
          world.transforms.set(catId, { x: catPosition.x, y: catPosition.y, z: catPosition.z });
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
              onCatPositionUpdate: handleCatPositionUpdate,
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
            onMoveCat={(x, y, z) => {
              // Use direct move for dev controls to avoid arc/teleport
              moveCatTo({ x, y, z }, 200);
            }}
            onNudgeY={(delta) => {
              const base = catPosition.y;
              // Positive delta means visually up → increase world Y
              moveCatTo({ y: base + Math.sign(delta) * Math.abs(delta) }, 120);
            }}
            onJump={() => {
              document.dispatchEvent(new CustomEvent('cat-happy-jump'));
            }}
            onSendSnapshot={async () => {
              if (!import.meta.env.DEV) return;
              try {
                const root = document.body as HTMLElement;
                const canvas = await html2canvas(root, { useCORS: true, logging: false, backgroundColor: null, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
                const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const form = new FormData();
                const overlay = (window as unknown as { __CAT_LAST_OVERLAY__?: unknown }).__CAT_LAST_OVERLAY__;
                form.append('meta', new Blob([JSON.stringify({
                  timestamp: new Date().toISOString(),
                  gameState,
                  catWorldCoords: catPosition,
                  catScreenCoords: catWorldPosition,
                  economy,
                  overlay,
                })], { type: 'application/json' }), 'meta.json');
                if (blob) form.append('screenshot', blob, 'screenshot.png');
                await fetch('/__debug_snapshot', { method: 'POST', body: form });
                console.debug('[CAT-DEBUG] Snapshot sent');
              } catch (e) {
                console.error('Snapshot failed', e);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App; 