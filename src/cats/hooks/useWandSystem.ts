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
}

interface UseWandSystemProps {
  catRef: React.RefObject<SVGSVGElement>;
  lovePerPounce: number;
  isDevMode: boolean;
  callbacks: WandSystemCallbacks;
}

export const useWandSystem = ({
  catRef,
  lovePerPounce,
  isDevMode,
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
  const [energy, setEnergy] = useState(100);
  const wandPositionRef = useRef({ x: 0, y: 0 });
  const shakeTimeoutRef = useRef<number | null>(null);
  const pounceConfidenceRef = useRef(0);
  const lastWandPositionRef = useRef({ x: 0, y: 0 });
  const lastWandMoveTimeRef = useRef(0);
  const lastVelocityRef = useRef(0);
  const velocityHistoryRef = useRef<number[]>([]);
  const movementNoveltyRef = useRef(1.0);
  const energyRef = useRef(energy);

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
      if (isDevMode) setPounceConfidenceDisplay(0);
      return;
    }

    const pouncePlanningInterval = setInterval(() => {
      if (!catRef.current) return;
      setEnergy(e => Math.max(0, e - 0.05));

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

        if (velocity > 0.1) velocityConfidence = (velocity * 8) * movementNoveltyRef.current; 
        if (lastVelocityRef.current > 1.6 && velocity < 0.3) suddenStopConfidence = (20 * proximityMultiplier);
        if (lastVelocityRef.current < 0.4 && velocity > 1.5) suddenStartConfidence = (25 * proximityMultiplier);
        
        lastVelocityRef.current = velocity;
      }
      lastWandMoveTimeRef.current = now;
      lastWandPositionRef.current = currentWandPosition;
      
      const energyBoost = 1 + (energyRef.current / 100);
      const totalConfidenceGain = (velocityConfidence + suddenStopConfidence + suddenStartConfidence);
      pounceConfidenceRef.current += totalConfidenceGain * energyBoost;
      pounceConfidenceRef.current = Math.max(0, pounceConfidenceRef.current * 0.90);

      // Update debug displays
      if (isDevMode) {
        setPounceConfidenceDisplay(pounceConfidenceRef.current);
        setLastVelocityDisplay(lastVelocityRef.current);
        setProximityMultiplierDisplay(proximityMultiplier);
        setMovementNoveltyDisplay(movementNoveltyRef.current);
      }

      // === POUNCE TRIGGER ===
      if (pounceConfidenceRef.current > 75 && !isPouncing) {
        pounceConfidenceRef.current = 0;
        velocityHistoryRef.current = [];
        movementNoveltyRef.current = 1.0;
        setEnergy(e => Math.max(0, e - 5));

        const vectorX = currentWandPosition.x - catCenterX;
        const vectorY = currentWandPosition.y - catCenterY;
        const pounceDistance = Math.hypot(vectorX, vectorY);
        const maxPounce = 30 + Math.random() * 20;
        const angle = Math.atan2(vectorY, vectorX);
        const randomAngleOffset = (Math.random() - 0.5) * 0.4;
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
        setTimeout(() => setIsPouncing(false), 500);
        setTimeout(() => callbacks.onTrackableHeartSet(null), 1000);
      }
    }, 100);

    return () => clearInterval(pouncePlanningInterval);
  }, [wandMode, isPouncing, lovePerPounce, isDevMode, catRef, callbacks]);

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

  const handleWandClick = useCallback(() => {
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    pounceConfidenceRef.current += 35;
    setEnergy(e => Math.max(0, e - 0.5));
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimeoutRef.current = window.setTimeout(() => setIsShaking(false), 500);
    });
    if (isPouncing) {
      setIsPlaying(true);
      callbacks.onLoveGained(1);
      setTimeout(() => setIsPlaying(false), 300);
    }
  }, [isPouncing, callbacks]);

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
    setEnergy,
  };

  return { state, actions };
}; 