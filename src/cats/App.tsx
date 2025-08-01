import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Analytics types
declare global {
  interface Window {
    labsAnalytics?: {
      trackEvent(eventName: string, parameters?: Record<string, unknown>): void;
    };
  }
}
import Cat from './components/cat/Cat';
import Heart from './components/cat/Heart';
import Zzz from './components/cat/Zzz';
import WandToy from './components/cat/WandToy';
import DevPanel from './components/ui/DevPanel';
import HeartIcon from './icons/HeartIcon';
import FishIcon from './icons/FishIcon';
import CurrencyTooltip from './components/ui/CurrencyTooltip';
import CatFact from './components/ui/CatFact';
import TabbedPanel from './components/panels/TabbedPanel';
import { catFacts } from './data/catFacts';
import { jobData } from './data/jobData';
import { performTraining, canPromoteToNextLevel } from './data/jobTrainingSystem';
import { upgradeData, getInfiniteUpgradeEffect } from './data/upgradeData';
import { playingUpgradeData, getInfinitePlayingUpgradeCost, getInfinitePlayingUpgradeEffect } from './data/playingUpgradeData';
import { thingsData, getThingPrice, getThingTotalEffect } from './data/thingsData';
import { useCatSystem } from './hooks/useCatSystem';
import { HeartSpawningService, type HeartVisuals } from './services/HeartSpawningService';
import { useGoalSystem } from './hooks/useGoalSystem';
import { useNotificationSystem } from './hooks/useNotificationSystem';
import type { GameState } from './game/types';


import NotificationQueue from './components/ui/NotificationQueue';


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
  upgradeLevels: {},
  playingUpgradeLevels: {},
  thingQuantities: {},
  completedGoals: [],
  activeGoals: [],
};

function App() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { love, treats, jobLevels, jobExperience, upgradeLevels, playingUpgradeLevels, thingQuantities } = gameState;

  const [lovePerClick, setLovePerClick] = useState(1);
  const [isPetting, setIsPetting] = useState(false);
  const [hearts, setHearts] = useState<HeartType[]>([]);
  const [isStartled, setIsStartled] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [zzzs, setZzzs] = useState<ZzzType[]>([]);
  const zzzTimeoutRef = useRef<number | null>(null);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [isSubtleWiggling, setIsSubtleWiggling] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const clickTimestampsRef = useRef<number[]>([]);
  const [lovePerPounce, setLovePerPounce] = useState(3);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  const [isSmiling, setIsSmiling] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  
  const catRef = useRef<SVGSVGElement>(null);
  const [energy, setEnergy] = useState(100); // Cat's energy, 0-100
  const [isDevMode, setIsDevMode] = useState(false);

  // Systems
  const { activeGoals, completedGoals, addGoal } = useGoalSystem(gameState, setGameState);
  const { notificationQueue, setNotificationQueue } = useNotificationSystem(gameState, addGoal);
  
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
  
  const cheekClickFlag = useRef(false);
  const [rapidClickCount, setRapidClickCount] = useState(0);
  const [currentFact] = useState(catFacts[Math.floor(Math.random() * catFacts.length)]);

  // === Stable callbacks to prevent infinite loops ===
  const onLoveGained = useCallback((amount: number) => {
    setGameState(current => ({ ...current, love: current.love + amount }));
  }, []);

  const onEnergyChanged = useCallback((newEnergy: number) => {
    setEnergy(newEnergy);
  }, []);

  const onHeartSpawned = useCallback((position: { x: number; y: number }) => {
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
  }, []);

  const onTrackableHeartSet = useCallback((heartId: number | null) => {
    setTrackableHeartId(heartId);
  }, []);

  const onTreatsGained = useCallback((amount: number) => {
    setGameState(current => ({ ...current, treats: current.treats + amount }));
  }, []);

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
    initialEnergy: energy, // Pass current energy as initial value
    currentLove: love,     // Pass global state
    currentTreats: treats, // Pass global state
    
    // Stable callback functions
    onLoveGained,
    onEnergyChanged,
    onHeartSpawned,
    onTrackableHeartSet,
    onTreatsGained,
  });

  // Keep reference to current energy for compatibility
  const [wandInitialPosition, setWandInitialPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const treatsPerSecond = useMemo(() => {
    return jobData.reduce((total, job) => {
      const currentLevel = jobLevels[job.id] || 0;
      if (currentLevel > 0) {
        return total + job.levels[currentLevel - 1].treatsPerSecond;
      }
      return total;
    }, 0);
  }, [jobLevels]);

  // Calculate treat-to-love conversion rate including Things effects
  const conversionRate = useMemo(() => {
    // Calculate effects from traditional upgrades
    const upgradeBonus = upgradeData
      .filter(upgrade => upgrade.type === 'conversion_rate')
      .reduce((total, upgrade) => {
        const currentLevel = upgradeLevels[upgrade.id] || 0;
        let upgradeEffect = upgrade.baseEffect;
        
        // Add effects from predefined levels
        for (let i = 0; i < Math.min(currentLevel, upgrade.levels.length); i++) {
          upgradeEffect += upgrade.levels[i].effect;
        }
        
        // Add effects from infinite levels
        for (let i = upgrade.levels.length; i < currentLevel; i++) {
          const infiniteEffect = getInfiniteUpgradeEffect(upgrade, i);
          if (infiniteEffect) {
            upgradeEffect += infiniteEffect;
          }
        }
        
        return total + (upgradeEffect - upgrade.baseEffect); // Don't double-count base effect
      }, 0);
    
    // Calculate effects from treat consumption rate Things (like ceramic bowl)
    const treatConsumptionBonus = thingsData
      .filter(thing => thing.category === 'feeding' && thing.effectType === 'treat_consumption_rate')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0);
    
    return upgradeBonus + treatConsumptionBonus; // Base conversion rate is 0 - must buy food bowl or ceramic bowl to start conversion
  }, [upgradeLevels, thingQuantities]);

  const loveMultiplier = useMemo(() => {
    // Calculate effects from traditional upgrades
    const upgradeBonus = upgradeData
      .filter(upgrade => upgrade.type === 'love_multiplier')
      .reduce((total, upgrade) => {
        const currentLevel = upgradeLevels[upgrade.id] || 0;
        let upgradeEffect = upgrade.baseEffect;
        
        // Add effects from predefined levels
        for (let i = 0; i < Math.min(currentLevel, upgrade.levels.length); i++) {
          upgradeEffect += upgrade.levels[i].effect;
        }
        
        // Add effects from infinite levels
        for (let i = upgrade.levels.length; i < currentLevel; i++) {
          const infiniteEffect = getInfiniteUpgradeEffect(upgrade, i);
          if (infiniteEffect) {
            upgradeEffect += infiniteEffect;
          }
        }
        
        return total + (upgradeEffect - upgrade.baseEffect); // Don't double-count base effect
      }, 0);
    
    // Calculate effects from love per treat Things
    const lovePerTreatBonus = thingsData
      .filter(thing => thing.category === 'feeding' && thing.effectType === 'love_per_treat')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0);
    
    return 1 + upgradeBonus + lovePerTreatBonus; // Base love multiplier is 1 love per treat
  }, [upgradeLevels, thingQuantities]);

  // Use cat energy from the cat system
  const energyRef = useRef(catEnergy);
  useEffect(() => {
    energyRef.current = catEnergy;
    setEnergy(catEnergy); // Keep App's energy state in sync for other components
  }, [catEnergy]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setIsDevMode(true);
    }
  }, []);

  // Energy regeneration
  useEffect(() => {
    const energyInterval = setInterval(() => {
      setEnergy(currentEnergy => Math.min(100, currentEnergy + 100 / 600));
    }, 1000);

    return () => clearInterval(energyInterval);
  }, []);

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

    const energyMultiplier = 1 + catEnergy / 100;
    const loveFromClick = Math.round(lovePerClick * energyMultiplier);
    onLoveGained(loveFromClick);
    catActions.addEnergy(-1); // Use cat system's energy management
    
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
      setRapidClickCount(clickTimestampsRef.current.length);
      
      if (clickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD && Math.random() < JUMP_CHANCE) {
        onLoveGained(loveFromClick);
        setIsJumping(true);
        clickTimestampsRef.current = [];
        setRapidClickCount(0);
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
  };

  const removeHeart = (id: number) => {
    setHearts((currentHearts) =>
      currentHearts.filter((heart) => heart.id !== id)
    );
  };
  
  const handleWandClick = () => {
    catActions.handleWandClick();
  };

  // Energy is now managed by the cat system automatically

  const handleEarClick = (ear: 'left' | 'right', event: React.MouseEvent) => {
    if (wigglingEar || isSubtleWiggling) return;

    // Generate love and energy changes regardless of wand mode
    const energyMultiplier = 1 + catEnergy / 100;
    const loveFromClick = Math.round(lovePerClick * energyMultiplier);
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
  
  const handleNoseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Generate love regardless of wand mode
    setIsSmiling(true);
    onLoveGained(5);
    
    // Skip heart spawning when wand is active, but allow love updates
    if (wandMode) return;
    
    // Use unified heart spawning
    heartSpawningService.spawnHearts({
      position: { x: event.clientX, y: event.clientY },
      loveAmount: 5,
      interactionType: 'petting'
    });
  };

  const handleCheekClick = (side: 'left' | 'right', event: React.MouseEvent) => {
    event.stopPropagation();
    cheekClickFlag.current = true;
    handleCatClick(event);

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



  const wakeUp = useCallback(() => {
    setIsSleeping(false);
    setIsDrowsy(false);
    setZzzs([]);
  }, []);

  const removeZzz = (id: number) => {
    setZzzs((currentZzzs) => currentZzzs.filter((zzz) => zzz.id !== id));
  };
  
  useEffect(() => {
    let drowsinessTimer: number;
    let sleepTimer: number;

    const resetInactivityTimer = () => {
      wakeUp();
      clearTimeout(drowsinessTimer);
      clearTimeout(sleepTimer);
      drowsinessTimer = window.setTimeout(() => setIsDrowsy(true), 20000);
      sleepTimer = window.setTimeout(() => {
        setIsDrowsy(false);
        setIsSleeping(true);
      }, 30000);
    };

    resetInactivityTimer();
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('mousedown', resetInactivityTimer);

    return () => {
      clearTimeout(drowsinessTimer);
      clearTimeout(sleepTimer);
      document.removeEventListener('mousemove', resetInactivityTimer);
      document.removeEventListener('mousedown', resetInactivityTimer);
    };
  }, [wakeUp]);

  useEffect(() => {
    const initialDelay = 2500;
    const minDelay = 1000;
    const decayFactor = 0.98;

    const scheduleNextZzz = (delay: number) => {
      if (zzzTimeoutRef.current) clearTimeout(zzzTimeoutRef.current);
      zzzTimeoutRef.current = window.setTimeout(() => {
        let spawnX = window.innerWidth / 2, spawnY = window.innerHeight / 2 - 20;
        if (catRef.current) {
          const catRect = catRef.current.getBoundingClientRect();
          spawnX = catRect.left + catRect.width * 0.5;
          spawnY = catRect.top + catRect.height * 0.2;
        }

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
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && wandMode) {
        catActions.toggleWandMode();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [wandMode, catActions]);

  // Calculate auto love per second from environment Things
  const autoLovePerSecond = useMemo(() => {
    return thingsData
      .filter(thing => thing.category === 'environment' && thing.effectType === 'auto_love_rate')
      .reduce((total, thing) => {
        const quantity = thingQuantities[thing.id] || 0;
        return total + getThingTotalEffect(thing, quantity);
      }, 0);
  }, [thingQuantities]);

  // Centralized passive income calculation
  const calculatePassiveIncome = useCallback((currentTreats: number, deltaTimeSeconds: number) => {
    // Calculate treats gained from jobs
    const treatsGained = treatsPerSecond * deltaTimeSeconds;
    
    // Calculate total treats after gaining from jobs
    const totalTreats = currentTreats + treatsGained;
    
    // Calculate how many treats can be converted to love
    const maxConvertibleTreats = conversionRate * deltaTimeSeconds;
    const treatsToConvert = Math.min(totalTreats, maxConvertibleTreats);
    
    // Calculate love gained from treats and auto-generation
    const loveFromTreats = treatsToConvert * loveMultiplier;
    const autoLoveGained = autoLovePerSecond * deltaTimeSeconds;
    const totalLoveGained = loveFromTreats + autoLoveGained;
    const finalTreats = totalTreats - treatsToConvert;
    
    return {
      treatsGained,
      treatsToConvert,
      loveGained: totalLoveGained,
      autoLoveGained,
      finalTreats
    };
  }, [treatsPerSecond, conversionRate, loveMultiplier, autoLovePerSecond]);

  // Handle time skip for debugging - now using centralized logic
  const handleTimeSkip = useCallback(() => {
    const oneDayInSeconds = 24 * 60 * 60;
    const result = calculatePassiveIncome(treats, oneDayInSeconds);
    
    setGameState(prev => ({ ...prev, treats: result.finalTreats, love: prev.love + result.loveGained }));
    
    console.log(`Time skipped 1 day:`, {
      treatsGained: result.treatsGained.toFixed(1),
      treatsConverted: result.treatsToConvert.toFixed(1),
      loveGained: result.loveGained.toFixed(1),
      finalTreats: result.finalTreats.toFixed(1)
    });
  }, [treats, calculatePassiveIncome]);

  // Debug functions to give resources
  const giveDebugTreats = useCallback(() => {
    setGameState(prev => ({ ...prev, treats: prev.treats + 1000 }));
    console.log('Gave 1000 treats');
  }, []);

  const giveDebugLove = useCallback(() => {
    setGameState(prev => ({ ...prev, love: prev.love + 1000 }));
    console.log('Gave 1000 love');
  }, []);

  useEffect(() => {
    const treatInterval = setInterval(() => {
      setGameState(current => {
        const result = calculatePassiveIncome(current.treats, 1); // 1 second
        return { ...current, treats: result.finalTreats, love: current.love + result.loveGained };
      });
    }, 1000);
    return () => clearInterval(treatInterval);
  }, [calculatePassiveIncome]);

  const handlePromotion = (jobId: string) => {
    const currentLevel = jobLevels[jobId] || 0;
    const currentExperience = jobExperience[jobId] || 0;
    const job = jobData.find(j => j.id === jobId);
    
    if (!job || currentLevel >= job.levels.length) return;
    
    // Check if player has required experience for promotion
    if (!canPromoteToNextLevel(jobData, jobId, currentLevel, currentExperience)) return;
    
    const promotionCost = job.levels[currentLevel].cost;
    if (love >= promotionCost) {
      setGameState(prev => ({
        ...prev,
        love: prev.love - promotionCost,
        jobLevels: { ...prev.jobLevels, [jobId]: currentLevel + 1 },
      }));
    }
  };

  const handleTraining = (jobId: string) => {
    const currentExperience = jobExperience[jobId] || 0;
    const trainingResult = performTraining(jobId, currentExperience);
    
    if (love >= trainingResult.loveCost) {
      setGameState(prev => ({
        ...prev,
        love: prev.love - trainingResult.loveCost,
        jobExperience: { 
          ...prev.jobExperience, 
          [jobId]: (prev.jobExperience[jobId] || 0) + trainingResult.experienceGained 
        },
      }));
      
      // TODO: Add juicy feedback animation for training result
      if (trainingResult.wasLucky) {
        console.log(`Lucky training! Gained ${trainingResult.experienceGained} experience (bonus: ${trainingResult.bonusAmount})`);
      }
    }
  };



  // Handle playing upgrades
  const handlePlayingUpgrade = useCallback((upgradeId: string) => {
    const { love, playingUpgradeLevels } = gameState;
    const currentLevel = playingUpgradeLevels[upgradeId] || 0;
    const upgrade = playingUpgradeData.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    // Determine if using predefined or infinite level
    const usePredefinedLevel = currentLevel < upgrade.levels.length;
    
    let loveCost: number;
    let effectValue: number;
    
    if (usePredefinedLevel) {
      const upgradeLevel = upgrade.levels[currentLevel];
      loveCost = upgradeLevel.loveCost;
      effectValue = upgradeLevel.effect;
    } else {
      const infiniteCost = getInfinitePlayingUpgradeCost(upgrade, currentLevel);
      const infiniteEffect = getInfinitePlayingUpgradeEffect(upgrade, currentLevel);
      if (!infiniteCost || !infiniteEffect) return;
      loveCost = infiniteCost.loveCost;
      effectValue = infiniteEffect;
    }
    
    if (love >= loveCost) {
      setGameState(prev => ({ 
        ...prev,
        love: prev.love - loveCost,
        playingUpgradeLevels: { ...prev.playingUpgradeLevels, [upgradeId]: currentLevel + 1 },
      }));
      
      // Update the actual game values
      if (upgradeId === 'love_per_pet') {
        setLovePerClick(current => current + effectValue);
      } else if (upgradeId === 'love_per_pounce') {
        setLovePerPounce(current => current + effectValue);
      }
    }
  }, [gameState, setGameState, setLovePerClick, setLovePerPounce]);

  // Handle thing purchases
  const handlePurchaseThing = useCallback((thingId: string) => {
    const { treats, thingQuantities } = gameState;
    const currentQuantity = thingQuantities[thingId] || 0;
    const thing = thingsData.find(t => t.id === thingId);
    if (!thing) return;
    
    const price = getThingPrice(thing, currentQuantity);
    
    if (treats >= price) {
      setGameState(prev => ({
        ...prev,
        treats: prev.treats - price,
        thingQuantities: { ...prev.thingQuantities, [thingId]: currentQuantity + 1 },
      }));
    }
  }, [gameState]);

  useEffect(() => {
    if (wandMode) document.body.classList.add('wand-mode-active');
    else document.body.classList.remove('wand-mode-active');
    return () => document.body.classList.remove('wand-mode-active');
  }, [wandMode]);

  // Ear twitching when pouncing starts
  useEffect(() => {
    if (isPouncing && !wigglingEar && !isSubtleWiggling) {
      // 70% chance for ear twitching when pouncing - higher than petting (40%)
      if (Math.random() < 0.7) {
        setIsSubtleWiggling(true);
        setTimeout(() => {
          setIsSubtleWiggling(false);
        }, 600); // Slightly longer than petting (500ms) for hunting focus
      }
    }
  }, [isPouncing, wigglingEar, isSubtleWiggling]);



  const handleNotificationDismiss = (notificationId: string) => {
    setNotificationQueue(prev => prev.filter(n => n.id !== notificationId));
  };



  return (
    <div className="game-container">

      <NotificationQueue 
        notifications={notificationQueue.map(n => ({
          id: n.id,
          notification: n,
          timestamp: Date.now(),
        }))}
        onDismiss={handleNotificationDismiss} 
      />

      {isDevMode && (
        <DevPanel
          energy={catEnergy}
          pounceConfidence={pounceConfidence}
          rapidClickCount={rapidClickCount}
          lastVelocity={lastVelocity}
          proximityMultiplier={proximityMultiplier}
          lovePerClick={lovePerClick}
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
            />
          )}
        </>,
        document.getElementById('heart-container')!
      )}
      <div className="main-panel">
        <div className="stats-container">
          <div className="currency-display">
            <CurrencyTooltip
              type="love"
              treatsPerSecond={treatsPerSecond}
              conversionRate={conversionRate}
              loveMultiplier={loveMultiplier}
              currentTreats={treats}
            >
              <div className="currency-chip">
                <HeartIcon className="currency-icon" />
                <span className="currency-value">{love.toFixed(0)}</span>
              </div>
            </CurrencyTooltip>
            <CurrencyTooltip
              type="treats"
              treatsPerSecond={treatsPerSecond}
              conversionRate={conversionRate}
              loveMultiplier={loveMultiplier}
              currentTreats={treats}
            >
              <div className="currency-chip">
                <FishIcon className="currency-icon" />
                <span className="currency-value">{treats.toFixed(0)}</span>
              </div>
            </CurrencyTooltip>
          </div>

        </div>
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
            headTiltAngle={headTiltAngle}
            pounceTarget={pounceTarget}
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
          />
        </div>
        <div className="upgrades-container">
          <button
            onClick={(e) => {
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
                setWandInitialPosition({ x: e.clientX, y: e.clientY });
              }
              
              catActions.toggleWandMode();
            }}
          >
            {wandMode ? 'Put away wand' : 'Play with wand'}
          </button>

        </div>
      </div>
      <TabbedPanel
        jobLevels={jobLevels}
        jobExperience={jobExperience}
        onPromote={handlePromotion}
        onTrain={handleTraining}
        unlockedJobs={gameState.unlockedJobs}
        thingQuantities={thingQuantities}
        onPurchaseThing={handlePurchaseThing}
        playingUpgradeLevels={playingUpgradeLevels}
        onPlayingUpgrade={handlePlayingUpgrade}
        lovePerClick={lovePerClick}
        lovePerPounce={lovePerPounce}
        activeGoals={activeGoals}
        completedGoals={completedGoals}
        currentLove={love}
        currentTreats={treats}
      />
    </div>
  );
}

export default App; 