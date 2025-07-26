/**
 * Cat System Integration Hook
 * 
 * Orchestrates the game state and animation controller.
 * Provides a clean, simple interface for React components.
 * This replaces the complex useWandSystem with better separation of concerns.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  onEnergyChanged?: (newEnergy: number) => void;
  
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
  onEnergyChanged,
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
      onEnergyChanged: (newEnergy) => {
        onEnergyChanged?.(newEnergy);
        // Update React state to trigger re-render
        setCatState(prev => ({ ...prev, energy: newEnergy }));
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

    // Sync initial state once, but preserve any existing wandMode state
    const initialState = catGameStateRef.current.getState();
    setCatState(prevState => ({
      ...initialState,
      wandMode: prevState.wandMode, // Preserve existing wandMode state
    }));
    setAnimationState(animationControllerRef.current.getReactState());

    return () => {
      // Cleanup
      animationControllerRef.current?.cleanup();
    };
  }, [onEnergyChanged, onHeartSpawned, onLoveGained, onTrackableHeartSet, onTreatsGained]); // Clean initialization - no energy dependency

  // Separate effect: Sync energy when it changes
  useEffect(() => {
    if (catGameStateRef.current) {
      // Update the game state's energy and trigger React re-render
      catGameStateRef.current.getActions().setEnergy(initialEnergy);
      setCatState(prev => ({ ...prev, energy: initialEnergy }));
    }
  }, [initialEnergy]);

  // Sync cat state changes to React state on demand
  const forceUpdate = useCallback(() => {
    if (!catGameStateRef.current || !animationControllerRef.current) return;
    
    const newCatState = catGameStateRef.current.getState();
    const newAnimationState = animationControllerRef.current.getReactState();
    

    
    setCatState(newCatState);
    setAnimationState(newAnimationState);
  }, []);

  // Mouse tracking and wand logic for when wand mode is active
  useEffect(() => {
    if (!catState.wandMode) return;

    let wandPosition = { x: 0, y: 0 };
    let lastPosition = { x: 0, y: 0 };
    let lastMoveTime = Date.now();
    const velocityHistory: number[] = [];

    const handleMouseMove = (event: MouseEvent) => {
      wandPosition = { x: event.clientX, y: event.clientY };
    };

    const updateWandStats = () => {
      if (!catGameStateRef.current) return;

      const now = Date.now();
      const timeDelta = now - lastMoveTime;

      if (timeDelta > 16) {
        const distance = Math.hypot(wandPosition.x - lastPosition.x, wandPosition.y - lastPosition.y);
        const velocity = distance / timeDelta;

        velocityHistory.push(velocity);
        if (velocityHistory.length > 20) velocityHistory.shift();

        // Update GameState with current mouse data
        catGameStateRef.current.getActions().processWandMovement(wandPosition, now);

        lastPosition = wandPosition;
        lastMoveTime = now;
      }

      // Update React state with latest debug values
      forceUpdate();
    };

    document.addEventListener('mousemove', handleMouseMove);
    const interval = setInterval(updateWandStats, 50); // 20fps for wand tracking

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [catState.wandMode, forceUpdate]);

  // Animation state will be updated on-demand via forceUpdate() calls
  // CSS/SVG animations handle smooth transitions without React state updates

  // === Public API ===

  const actions = {
    // Wand system
    toggleWandMode: useCallback(() => {
      if (!catGameStateRef.current) {
        console.error('useCatSystem: catGameStateRef.current is null!');
        return;
      }
      
      catGameStateRef.current.getActions().toggleWandMode();
      
      forceUpdate();
    }, [forceUpdate]),

    handleWandMovement: useCallback((position: { x: number; y: number }) => {
      catGameStateRef.current?.getActions().processWandMovement(position, Date.now());
      // Note: Don't forceUpdate on movement to avoid performance issues
    }, []),

    handleWandClick: useCallback(() => {
      catGameStateRef.current?.getActions().processWandClick(Date.now());
      animationControllerRef.current?.onWandClicked(); // Trigger wand shake animation
      forceUpdate();
    }, [forceUpdate]),

    // Cat-specific actions only
    addEnergy: useCallback((amount: number) => {
      catGameStateRef.current?.getActions().updateEnergy(amount);
      forceUpdate();
    }, [forceUpdate]),

    // Utility
    resetPounceSystem: useCallback(() => {
      catGameStateRef.current?.getActions().resetConfidence();
      forceUpdate();
    }, [forceUpdate]),
  };

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