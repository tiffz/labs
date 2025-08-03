/**
 * Cat System Integration Hook
 * 
 * Orchestrates the game state and animation controller.
 * Provides a clean, simple interface for React components.
 * This replaces the complex useWandSystem with better separation of concerns.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CatGameStateManager } from '../game/GameState';
import { CatAnimationController } from '../animation/AnimationController';
import type { CatGameState, CatGameEvents } from '../game/GameState';
import type { AnimationEvents } from '../animation/AnimationController';

interface CatSystemProps {
  // Cat-specific initial state
  initialEnergy?: number;
  
  // Global game state (passed in, not managed here)
  currentLove?: number;
  currentTreats?: number;
  
  // External callbacks for global systems
  onLoveGained?: (amount: number) => void;    // Request to add love to global system
  onTreatsGained?: (amount: number) => void;  // Request to add treats to global system

  
  // Animation callbacks
  onHeartSpawned?: (position: { x: number; y: number }) => void;
  onTrackableHeartSet?: (heartId: number | null) => void;
}

export const useCatSystem = ({
  initialEnergy = 100,
  currentLove = 0,
  currentTreats = 0,
  onLoveGained,
  onTreatsGained,
  onHeartSpawned,
  onTrackableHeartSet,
}: CatSystemProps = {}) => {
  
  // React state for triggering re-renders (cat-specific only)
  const [catState, setCatState] = useState<CatGameState>(() => ({
    energy: initialEnergy,
    pounceConfidence: 0,
    wandMode: false,
    cursorVelocity: 0,
    proximityMultiplier: 1,
    movementNovelty: 1,
    clickExcitement: 0,
    lastClickTime: 0,
    lastPounceTime: 0,
    lastPlayTime: 0,
  }));

  const [animationState, setAnimationState] = useState(() => ({
    isPouncing: false,
    isPlaying: false,
    isShaking: false,
    isEarWiggling: false,
    isHappyPlaying: false,
    pounceTarget: { x: 0, y: 0 },
    excitementLevel: 0,
  }));



  // Persistent instances (don't recreate on every render)
  const catGameStateRef = useRef<CatGameStateManager | null>(null);
  const animationControllerRef = useRef<CatAnimationController | null>(null);

  // Initialize systems
  useEffect(() => {

    // Cat game events that trigger animations and global systems
    const catGameEvents: CatGameEvents = {
      onPounceTriggered: (pounceData) => {
  
        animationControllerRef.current?.onPounceTriggered(pounceData);
        
        // Calculate love reward based on pounce intensity and energy
        const energyBoost = 1 + (pounceData.catEnergy || 100) / 100;
        const baseReward = 3; // Base love per pounce
        const distanceBonus = Math.min(5, pounceData.distance / 40); // Distance bonus
        const pounceLove = Math.round((baseReward + distanceBonus) * energyBoost);
        

        
        // Give love reward AND trigger heart spawning
        onLoveGained?.(pounceLove); // Update global love counter
        animationControllerRef.current?.onLoveGained(pounceLove); // Spawn hearts at wand position
      },
      onPlayingTriggered: (playData) => {
        animationControllerRef.current?.onPlayingTriggered(playData);
      },
      onLoveGained: (amount) => {
    
        // Trigger animation AND request global love update
        animationControllerRef.current?.onLoveGained(amount);
        onLoveGained?.(amount);
      },
      onTreatsGained: (amount) => {
        onTreatsGained?.(amount);
      },
    };

    // Animation events that trigger external callbacks
    const animationEvents: AnimationEvents = {
      onHeartSpawned: (position) => {
        onHeartSpawned?.(position);
      },
      onTrackableHeartSet: (heartId) => {
        onTrackableHeartSet?.(heartId);
      },
    };

    // Create cat game state manager (only manages cat-specific state)
    // Initialize with default energy - we'll sync the real energy separately
    catGameStateRef.current = new CatGameStateManager({
      energy: 100, // Default energy for initialization
    }, catGameEvents);

    // Create animation controller
    animationControllerRef.current = new CatAnimationController(animationEvents);

    // Sync initial state from game state manager (trust its wandMode state)
    const initialState = catGameStateRef.current.getState();
    setCatState(initialState);
    setAnimationState(animationControllerRef.current.getReactState());

    return () => {
      // Cleanup
      animationControllerRef.current?.cleanup();
    };
  }, [onHeartSpawned, onLoveGained, onTrackableHeartSet, onTreatsGained]); // Clean initialization - no energy dependency

  // Separate effect: Sync energy when it changes
  useEffect(() => {
    if (catGameStateRef.current) {
      // Update the game state's energy and trigger React re-render
      catGameStateRef.current.getActions().setEnergy(initialEnergy);
      setCatState(prev => ({ ...prev, energy: initialEnergy }));
    }
  }, [initialEnergy]);

  // Create a stable reference to forceUpdate to prevent actions recreation
  const forceUpdateRef = useRef<() => void>(() => {});
  
  // Sync cat state changes to React state on demand
  const forceUpdate = useCallback(() => {
    if (!catGameStateRef.current || !animationControllerRef.current) return;
    
    const newCatState = catGameStateRef.current.getState();
    const newAnimationState = animationControllerRef.current.getReactState();
    
    
    
    // Only update React state if values actually changed to prevent unnecessary re-renders
    setCatState(prevCatState => {
      const hasChanged = (
        prevCatState.energy !== newCatState.energy ||
        prevCatState.wandMode !== newCatState.wandMode ||
        prevCatState.pounceConfidence !== newCatState.pounceConfidence ||
        prevCatState.cursorVelocity !== newCatState.cursorVelocity ||
        prevCatState.proximityMultiplier !== newCatState.proximityMultiplier ||
        prevCatState.movementNovelty !== newCatState.movementNovelty
      );
      return hasChanged ? newCatState : prevCatState;
    });
    
    setAnimationState(prevAnimationState => {
      const hasChanged = (
        prevAnimationState.isPouncing !== newAnimationState.isPouncing ||
        prevAnimationState.isPlaying !== newAnimationState.isPlaying ||
        prevAnimationState.isShaking !== newAnimationState.isShaking ||
        prevAnimationState.isEarWiggling !== newAnimationState.isEarWiggling ||
        prevAnimationState.isHappyPlaying !== newAnimationState.isHappyPlaying ||
        prevAnimationState.pounceTarget.x !== newAnimationState.pounceTarget.x ||
        prevAnimationState.pounceTarget.y !== newAnimationState.pounceTarget.y
      );
      return hasChanged ? newAnimationState : prevAnimationState;
    });
  }, []);
  
  // Update the ref so actions can always access the latest forceUpdate
  forceUpdateRef.current = forceUpdate;

  // Mouse tracking and wand logic for when wand mode is active
  useEffect(() => {
    if (!catState.wandMode) return;

    let wandPosition = { x: 0, y: 0 };
    let lastPosition = { x: 0, y: 0 };
    let lastMoveTime = Date.now();
    let lastUpdateTime = Date.now();
    const velocityHistory: number[] = [];

    const handleMouseMove = (event: MouseEvent) => {
      wandPosition = { x: event.clientX, y: event.clientY };
      lastMoveTime = Date.now();
    };

    const updateWandStats = () => {
      if (!catGameStateRef.current) return;

      const now = Date.now();
      const timeDelta = now - lastUpdateTime;
      
      // Calculate distance for both velocity and update logic
      const distance = Math.hypot(wandPosition.x - lastPosition.x, wandPosition.y - lastPosition.y);

      if (timeDelta > 16) {
        const velocity = distance / timeDelta;

        velocityHistory.push(velocity);
        if (velocityHistory.length > 20) velocityHistory.shift();

        // Update GameState with current mouse data
        catGameStateRef.current.getActions().processWandMovement(wandPosition, now);

        lastPosition = wandPosition;
        lastUpdateTime = now;
      }

      // Only force update if there's been recent movement (within 1000ms), we're in wand mode, and there's actual movement
      const hasRecentMovement = (now - lastMoveTime) < 1000;
      const isStillWandMode = catGameStateRef.current?.getState().wandMode;
      const hasSignificantMovement = distance > 10; // Only update for significant mouse movement
      
      if (process.env.NODE_ENV !== 'test' && isStillWandMode && hasRecentMovement && hasSignificantMovement) {
        forceUpdateRef.current?.();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    
    // Smart interval that only runs when needed and less frequently
    let interval: NodeJS.Timeout | undefined;
    if (process.env.NODE_ENV !== 'test') {
      // Reduce frequency to 500ms (2fps) and only update when there's significant change
      interval = setInterval(updateWandStats, 500);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [catState.wandMode]); // Remove forceUpdate from dependencies

  // Animation state will be updated on-demand via forceUpdate() calls
  // CSS/SVG animations handle smooth transitions without React state updates

  // === Public API ===

  const actions = useMemo(() => ({
    // Wand system
    toggleWandMode: () => {
      if (!catGameStateRef.current) {
        console.error('useCatSystem: catGameStateRef.current is null!');
        return;
      }
      
      catGameStateRef.current.getActions().toggleWandMode();
      
      forceUpdateRef.current?.();
    },

    handleWandMovement: (position: { x: number; y: number }) => {
      catGameStateRef.current?.getActions().processWandMovement(position, Date.now());
      // Note: Don't forceUpdate on movement to avoid performance issues
    },

    handleWandClick: () => {
      catGameStateRef.current?.getActions().processWandClick(Date.now());
      animationControllerRef.current?.onWandClicked(); // Trigger wand shake animation
      forceUpdateRef.current?.();
    },

    // Cat-specific actions only
    addEnergy: (amount: number) => {
      catGameStateRef.current?.getActions().updateEnergy(amount);
      forceUpdateRef.current?.();
    },

    // Utility
    resetPounceSystem: () => {
      catGameStateRef.current?.getActions().resetConfidence();
      forceUpdateRef.current?.();
    },
  }), []); // No dependencies - actions object is stable and uses refs for latest values

  return {
    // Current state (for rendering)
    catState,
    animationState,
    
    // Actions
    actions,
    
    // Cat-specific convenience getters
    isWandMode: catState.wandMode,
    energy: catState.energy,
    
    // Global state (passed in, not managed here)
    love: currentLove,
    treats: currentTreats,
    
    // Animation state getters
    isPouncing: animationState.isPouncing,
    isPlaying: animationState.isPlaying,
    isShaking: animationState.isShaking,
    isEarWiggling: animationState.isEarWiggling,
    isHappyPlaying: animationState.isHappyPlaying,
    pounceTarget: animationState.pounceTarget,
    excitementLevel: animationState.excitementLevel,
    
    // Debug values
    pounceConfidence: catState.pounceConfidence,
    cursorVelocity: catState.cursorVelocity,
    proximityMultiplier: catState.proximityMultiplier,
    movementNovelty: catState.movementNovelty,
    clickExcitement: catState.clickExcitement,
  };
}; 