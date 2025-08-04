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
import CatInteractionManager from './components/game/CatInteractionManager';
import Heart from './components/game/Heart';
import Zzz from './components/game/Zzz';
import WandToy from './components/game/WandToy';
import DevPanel from './components/ui/DevPanel';
import CurrencyDisplay from './components/ui/CurrencyDisplay';
import TabbedPanel from './components/panels/TabbedPanel';

import { useCatSystem } from './hooks/useCatSystem';
import { HeartSpawningService, type HeartVisuals } from './services/HeartSpawningService';
import { useAchievementSystem } from './hooks/useAchievementSystem';
import { useNotificationSystem } from './hooks/useNotificationSystem';
import { useGameStateManager } from './hooks/useGameStateManager';
import { GameEconomyService } from './services/GameEconomyService';
import type { GameState } from './game/types';


import NotificationQueue from './components/ui/NotificationQueue';
import { ErrorReporter } from './components/ui/ErrorReporter';


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

  
  // Unified mouse tracking system
  const mouseState = useMouseTracking();
  
  const gameStateManager = useGameStateManager({ initialState: initialGameState });
  const { gameState } = gameStateManager;
  

  const { love, treats, jobLevels, jobExperience, jobInterviews, thingQuantities, spentMerits } = gameState;


  const [hearts, setHearts] = useState<HeartType[]>([]);
  const [zzzs, setZzzs] = useState<ZzzType[]>([]);
  const zzzTimeoutRef = useRef<number | null>(null);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  // Energy is now managed by useCatSystem only
  const [isDevMode, setIsDevMode] = useState(false);
  const [wandInitialPosition, setWandInitialPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  // Restore sleep/drowsy state for proper Z spawning and cat behavior
  const [isSleeping, setIsSleeping] = useState(false);
  const [isDrowsy, setIsDrowsy] = useState(false);

  // Systems
  const { notificationQueue, setNotificationQueue, addNotificationToQueue } = useNotificationSystem(gameState);
  const { 
    earnedMerits, 
    availableMerits, 
    earnedAwards,
    availableAwards,
    trackSpecialAction 
  } = useAchievementSystem(gameState, gameStateManager.updateState, addNotificationToQueue);
  
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
    
    // Stable callback functions
    onLoveGained,
    onHeartSpawned,
    onTrackableHeartSet,
    onTreatsGained,
  });
  


  // Use cat energy from the cat system directly
  const energyRef = useRef(catEnergy);
  energyRef.current = catEnergy; // No useEffect needed for simple ref updates
  
  // Store latest catActions in ref to avoid stale closures
  const catActionsRef = useRef(catActions);
  catActionsRef.current = catActions;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setIsDevMode(true);
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
  const catPositionRef = useRef<{x: number, y: number} | null>(null);

  const handleCatPositionUpdate = useStableCallback<(position: {x: number, y: number}) => void>((position: {x: number, y: number}) => {

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
        const spawnX = catPositionRef.current?.x || window.innerWidth / 2;
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

  // Escape key handler to exit wand mode
  useEffect(() => {
    if (!wandMode) return; // Only add listener when in wand mode
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        catActionsRef.current.toggleWandMode();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [wandMode]); // Remove catActions dependency

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





  // Track stable timestamps for notifications
  const timestampMapRef = useRef<Map<string, number>>(new Map());

  const handleNotificationDismiss = (notificationId: string) => {
    setNotificationQueue(prev => prev.filter(n => n.id !== notificationId));
    // Clean up timestamp map
    timestampMapRef.current.delete(notificationId);
  };
  
  // Memoize notifications to prevent infinite re-renders
  const memoizedNotifications = useMemo(() => 
    notificationQueue.map((n) => {
      // Get or create a stable timestamp for this notification ID
      if (!timestampMapRef.current.has(n.id)) {
        timestampMapRef.current.set(n.id, Date.now() + Math.random());
      }
      return {
        id: n.id,
        notification: n,
        timestamp: timestampMapRef.current.get(n.id)!,
      };
    }), [notificationQueue]
  );

  return (
    <div className="game-container">

      <NotificationQueue 
        notifications={memoizedNotifications}
        onDismiss={handleNotificationDismiss} 
      />

              <ErrorReporter />

      {isDevMode && (
        <DevPanel
          energy={catEnergy}
          pounceConfidence={pounceConfidence}
          rapidClickCount={0}
          lastVelocity={lastVelocity}
          proximityMultiplier={proximityMultiplier}
          lovePerClick={baseLovePerInteraction}
          movementNovelty={movementNovelty}
          clickExcitement={clickExcitement}
          onTimeSkip={handleTimeSkip}
          onGiveTreats={giveDebugTreats}
          onGiveLove={giveDebugLove}
        />
      )}
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
              isShaking={isShaking}
              initialPosition={wandInitialPosition}
              mouseState={mouseState}
            />
          )}
        </>,
        document.getElementById('heart-container')!
      )}
      <div className="main-panel">
        <div className="stats-container">
          <CurrencyDisplay 
            love={love} 
            treats={treats} 
            economy={economy} 
          />
        </div>
        <CatInteractionManager
          economy={economy}
          love={love}
          catEnergy={catEnergy}
          wandMode={wandMode}
          isPouncing={isPouncing}
          isPlaying={isPlaying}
          isShaking={isShaking}
          isEarWiggling={isEarWiggling}
          isHappyPlaying={isHappyPlaying}
          pounceTarget={pounceTarget}
          catActions={catActions}
          trackableHeartId={trackableHeartId}
          hearts={hearts}
          onLoveGained={onLoveGained}
          onWandInitialPositionSet={setWandInitialPosition}
          onCatPositionUpdate={handleCatPositionUpdate}
          trackSpecialAction={trackSpecialAction}
          heartSpawningService={heartSpawningService}
          isSleeping={isSleeping}
          isDrowsy={isDrowsy}
          mouseState={mouseState}
        />
      </div>
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
      />
    </div>
  );
}

export default App; 