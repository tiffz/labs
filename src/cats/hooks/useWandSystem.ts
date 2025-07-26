import { useState, useEffect, useRef, useCallback } from 'react';

export interface WandSystemState {
  // Core State
  wandMode: boolean;
  isShaking: boolean;
  isPouncing: boolean;
  isPlaying: boolean;
  pounceTarget: { x: number; y: number };
  wandInitialPosition: { x: number; y: number };
  
  // Debug/Dev State
  pounceConfidence: number;
  lastVelocity: number;
  proximityMultiplier: number;
  movementNovelty: number;
}

export interface WandSystemActions {
  toggleWandMode: (initialPosition: { x: number; y: number }) => void;
  handleWandClick: () => void;
  setEnergy: (energy: number) => void; // For energy updates from parent
}

export interface WandSystemCallbacks {
  onLoveGained: (amount: number) => void;
  onHeartSpawned: (hearts: Array<{
    id: number;
    x: number;
    y: number;
    translateX: number;
    rotation: number;
    scale: number;
    animationDuration: number;
  }>) => void;
  onTrackableHeartSet: (heartId: number | null) => void;
  onEnergyChanged: (energyDelta: number) => void;
}

interface UseWandSystemProps {
  catRef: React.RefObject<SVGSVGElement>;
  lovePerPounce: number;
  energy: number;
  callbacks: WandSystemCallbacks;
}

// === CONSTANTS ===
const ANIMATION_DURATIONS = {
  POUNCE: 500,
  PLAYING_DURING_POUNCE: 500,
  PLAYING_REGULAR: 300,
  SHAKE: 500,
  HEART_CLEANUP: 1000,
} as const;

const COOLDOWNS = {
  POUNCE: 1200,
  PLAYING_DURING_POUNCE: 150,
  PLAYING_REGULAR: 300,
} as const;

const CONFIDENCE_THRESHOLDS = {
  POUNCE_TRIGGER: 85,
  VELOCITY_MIN: 0.1,
  SUDDEN_STOP_MIN: 1.6,
  SUDDEN_STOP_MAX: 0.3,
  SUDDEN_START_MAX: 0.4,
  SUDDEN_START_MIN: 1.5,
  CONFIDENCE_DECAY: 0.90,
} as const;

const CONFIDENCE_MULTIPLIERS = {
  VELOCITY: 12,
  SUDDEN_STOP: 30,
  SUDDEN_START: 35,
  CLICK_BOOST: 18,
} as const;

export const useWandSystem = ({
  catRef,
  lovePerPounce,
  energy,
  callbacks
}: UseWandSystemProps) => {
  // === CORE STATE ===
  const [wandMode, setWandMode] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isPouncing, setIsPouncing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pounceTarget, setPounceTarget] = useState({ x: 0, y: 0 });
  const [wandInitialPosition, setWandInitialPosition] = useState({ x: 0, y: 0 });

  // === INTERNAL TRACKING STATE ===
  const wandPositionRef = useRef({ x: 0, y: 0 });
  const shakeTimeoutRef = useRef<number | null>(null);
  const pounceConfidenceRef = useRef(0);
  const lastWandPositionRef = useRef({ x: 0, y: 0 });
  const lastWandMoveTimeRef = useRef(0);
  const lastVelocityRef = useRef(0);
  const velocityHistoryRef = useRef<number[]>([]);
  const movementNoveltyRef = useRef(1.0);
  const energyRef = useRef(energy);
  const lastPounceTimeRef = useRef(0);
  const lastPlayTimeRef = useRef(0);

  // === DEBUG STATE ===
  const [pounceConfidenceDisplay, setPounceConfidenceDisplay] = useState(0);
  const [lastVelocityDisplay, setLastVelocityDisplay] = useState(0);
  const [proximityMultiplierDisplay, setProximityMultiplierDisplay] = useState(1);
  const [movementNoveltyDisplay, setMovementNoveltyDisplay] = useState(1.0);

  // === REFS FOR POUNCE STATE ===

  // Update energy ref when energy changes
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  // === MOUSE TRACKING ===
  useEffect(() => {
    if (!wandMode) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      wandPositionRef.current = { x: event.clientX, y: event.clientY };
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [wandMode]);

  // === POUNCE PLANNING SYSTEM ===
  useEffect(() => {
    if (!wandMode) {
      pounceConfidenceRef.current = 0;
      setPounceConfidenceDisplay(0);
      return;
    }

    // Initialize timing when wand mode starts
    lastWandMoveTimeRef.current = Date.now();

    const pouncePlanningInterval = setInterval(() => {
      if (!catRef.current) return;

      const catRect = catRef.current.getBoundingClientRect();
      const catCenterX = catRect.left + catRect.width / 2;
      const catCenterY = catRect.top + catRect.height / 2;
      const currentWandPosition = wandPositionRef.current;
      const distanceToCat = Math.hypot(currentWandPosition.x - catCenterX, currentWandPosition.y - catCenterY);

      const now = Date.now();
      const timeDelta = now - lastWandMoveTimeRef.current;
      let proximityMultiplier = 0.3;
      const veryCloseDistance = 60;
      const nearDistance = 220;

      // Calculate proximity multiplier
      if (distanceToCat < veryCloseDistance) {
        proximityMultiplier = 1 + Math.pow((veryCloseDistance - distanceToCat) / 25, 2.2);
      } else if (distanceToCat < nearDistance) {
        const progress = (distanceToCat - veryCloseDistance) / (nearDistance - veryCloseDistance);
        proximityMultiplier = 1.0 - progress * 0.7;
      }

      let velocityConfidence = 0, suddenStopConfidence = 0, suddenStartConfidence = 0;

      if (timeDelta > 16) { 
        const distanceMoved = Math.hypot(
          currentWandPosition.x - lastWandPositionRef.current.x, 
          currentWandPosition.y - lastWandPositionRef.current.y
        );
        const velocity = distanceMoved / timeDelta;
        
        velocityHistoryRef.current.push(velocity);
        if (velocityHistoryRef.current.length > 20) velocityHistoryRef.current.shift(); 

        const highVelocityThreshold = 1.5;
        const recentFastMoves = velocityHistoryRef.current.filter(v => v > highVelocityThreshold).length;
        const historyRatio = velocityHistoryRef.current.length > 0 ? recentFastMoves / velocityHistoryRef.current.length : 0;
        
        movementNoveltyRef.current = historyRatio > 0.5 
            ? Math.max(0.1, movementNoveltyRef.current - 0.1)
            : Math.min(1.0, movementNoveltyRef.current + 0.06);

        if (velocity > CONFIDENCE_THRESHOLDS.VELOCITY_MIN) velocityConfidence = (velocity * CONFIDENCE_MULTIPLIERS.VELOCITY) * movementNoveltyRef.current; 
        if (lastVelocityRef.current > CONFIDENCE_THRESHOLDS.SUDDEN_STOP_MIN && velocity < CONFIDENCE_THRESHOLDS.SUDDEN_STOP_MAX) suddenStopConfidence = (CONFIDENCE_MULTIPLIERS.SUDDEN_STOP * proximityMultiplier);
        if (lastVelocityRef.current < CONFIDENCE_THRESHOLDS.SUDDEN_START_MAX && velocity > CONFIDENCE_THRESHOLDS.SUDDEN_START_MIN) suddenStartConfidence = (CONFIDENCE_MULTIPLIERS.SUDDEN_START * proximityMultiplier);
        
        lastVelocityRef.current = velocity;
      }
      lastWandMoveTimeRef.current = now;
      lastWandPositionRef.current = currentWandPosition;
      
      const energyBoost = 1 + (energyRef.current / 100);
      const totalConfidenceGain = (velocityConfidence + suddenStopConfidence + suddenStartConfidence);
      pounceConfidenceRef.current += totalConfidenceGain * energyBoost;
      pounceConfidenceRef.current = Math.max(0, pounceConfidenceRef.current * CONFIDENCE_THRESHOLDS.CONFIDENCE_DECAY);

      // Update debug displays (always update so they're available when dev mode is toggled)
      setPounceConfidenceDisplay(pounceConfidenceRef.current);
      setLastVelocityDisplay(lastVelocityRef.current);
      setProximityMultiplierDisplay(proximityMultiplier);
      setMovementNoveltyDisplay(movementNoveltyRef.current);

      // === POUNCE TRIGGER ===
      const timeSinceLastPounce = now - lastPounceTimeRef.current;
      
      if (pounceConfidenceRef.current > CONFIDENCE_THRESHOLDS.POUNCE_TRIGGER && !isPouncing && timeSinceLastPounce > COOLDOWNS.POUNCE) {
        pounceConfidenceRef.current = 0;
        velocityHistoryRef.current = [];
        movementNoveltyRef.current = 1.0;
        lastPounceTimeRef.current = now;
        callbacks.onEnergyChanged(-5);

        const vectorX = currentWandPosition.x - catCenterX;
        const vectorY = currentWandPosition.y - catCenterY;
        const pounceDistance = Math.hypot(vectorX, vectorY);
        
        // Even more aggressive pouncing - scale based on distance to wand
        const baseMaxPounce = 50; // Increased from 35
        const distanceBonus = Math.min(25, pounceDistance / 6); // Up to 25px bonus, more sensitive to distance
        const maxPounce = baseMaxPounce + distanceBonus + Math.random() * 20;
        
        const angle = Math.atan2(vectorY, vectorX);
        const randomAngleOffset = (Math.random() - 0.5) * 0.3;
        const newAngle = angle + randomAngleOffset;

        const pounceX = pounceDistance > 0 ? Math.cos(newAngle) * maxPounce : 0;
        const pounceY = pounceDistance > 0 ? Math.sin(newAngle) * maxPounce : 0;

        setPounceTarget({ x: pounceX, y: pounceY });

        const pounceLove = Math.round((lovePerPounce + pounceDistance / 20) * energyBoost);
        callbacks.onLoveGained(pounceLove);

        // Spawn hearts
        const newHearts = Array.from({ length: Math.max(1, Math.round(pounceDistance / 40)) }, (_, i) => ({
            id: Date.now() + i,
            x: currentWandPosition.x + (Math.random() - 0.5) * 40,
            y: currentWandPosition.y + (Math.random() - 0.5) * 40,
            translateX: Math.random() * 60 - 30,
            rotation: Math.random() * 80 - 40,
            scale: Math.random() * 0.5 + 0.5,
            animationDuration: Math.random() * 0.5 + 0.5,
        }));
        
        callbacks.onHeartSpawned(newHearts);
        const lastHeartId = newHearts[newHearts.length - 1]?.id;
        if (lastHeartId) callbacks.onTrackableHeartSet(lastHeartId);

        setIsPouncing(true);
        setTimeout(() => setIsPouncing(false), ANIMATION_DURATIONS.POUNCE);
        setTimeout(() => callbacks.onTrackableHeartSet(null), ANIMATION_DURATIONS.HEART_CLEANUP);
      }
    }, 100);

    return () => clearInterval(pouncePlanningInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wandMode, isPouncing, lovePerPounce]); // callbacks and catRef intentionally omitted to prevent restarts

  // === ACTIONS ===
  const toggleWandMode = useCallback((initialPosition: { x: number; y: number }) => {
    setWandMode(prev => {
      const newMode = !prev;
      if (newMode) {
        setWandInitialPosition(initialPosition);
        document.body.classList.add('wand-mode-active');
      } else {
        document.body.classList.remove('wand-mode-active');
      }
      return newMode;
    });
  }, []);

  // === SIMPLIFIED PLAYING STATE HANDLER ===
  const handleWandClick = useCallback(() => {
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    pounceConfidenceRef.current += CONFIDENCE_MULTIPLIERS.CLICK_BOOST;
    
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimeoutRef.current = window.setTimeout(() => setIsShaking(false), ANIMATION_DURATIONS.SHAKE);
    });
    
    // Unified playing state logic
    if (wandMode) {
      const now = Date.now();
      const timeSinceLastPlay = now - lastPlayTimeRef.current;
      const isInPounceMode = isPouncing;
      
      const playCooldown = isInPounceMode ? COOLDOWNS.PLAYING_DURING_POUNCE : COOLDOWNS.PLAYING_REGULAR;
      const playDuration = isInPounceMode ? ANIMATION_DURATIONS.PLAYING_DURING_POUNCE : ANIMATION_DURATIONS.PLAYING_REGULAR;
      const loveReward = isInPounceMode ? 2 : 1;
      
      if (timeSinceLastPlay > playCooldown) {
        lastPlayTimeRef.current = now;
        setIsPlaying(true);
        callbacks.onLoveGained(loveReward);
        setTimeout(() => setIsPlaying(false), playDuration);
      }
    }
  }, [isPouncing, wandMode, callbacks]);

  // === CLEANUP ===
  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      document.body.classList.remove('wand-mode-active');
    };
  }, []);

  // === RETURN STATE AND ACTIONS ===
  const state: WandSystemState = {
    wandMode,
    isShaking,
    isPouncing,
    isPlaying,
    pounceTarget,
    wandInitialPosition,
    pounceConfidence: pounceConfidenceDisplay,
    lastVelocity: lastVelocityDisplay,
    proximityMultiplier: proximityMultiplierDisplay,
    movementNovelty: movementNoveltyDisplay,
  };

  const actions: WandSystemActions = {
    toggleWandMode,
    handleWandClick,
    setEnergy: () => {
      // This is now handled by the parent component
      // We don't need to do anything here since energy comes from props
    },
  };

  return { state, actions };
}; 