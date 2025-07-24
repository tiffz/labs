import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Cat from './components/cat/Cat';
import Heart from './components/cat/Heart';
import Zzz from './components/cat/Zzz';
import WandToy from './components/cat/WandToy';
import DevPanel from './components/ui/DevPanel';
import HeartIcon from './icons/HeartIcon';
import FishIcon from './icons/FishIcon';
import CatFact from './components/ui/CatFact';
import JobPanel from './components/jobs/JobPanel';
import { catFacts } from './data/catFacts';
import { jobData } from './data/jobData';
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

function App() {
  const [love, setLove] = useState(0);
  const [lovePerClick, setLovePerClick] = useState(1);
  const [treats, setTreats] = useState(0);
  const [jobLevels, setJobLevels] = useState<{ [key: string]: number }>({});
  const [isPetting, setIsPetting] = useState(false);
  const [hearts, setHearts] = useState<HeartType[]>([]);
  const [isStartled, setIsStartled] = useState(false);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [zzzs, setZzzs] = useState<ZzzType[]>([]);
  const zzzTimeoutRef = useRef<number | null>(null);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [wandMode, setWandMode] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const clickTimestampsRef = useRef<number[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [wandInitialPosition, setWandInitialPosition] = useState({ x: 0, y: 0 });
  const [isPouncing, setIsPouncing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pounceTarget, setPounceTarget] = useState({ x: 0, y: 0 });
  const [lovePerPounce, setLovePerPounce] = useState(3);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  const [isSmiling, setIsSmiling] = useState(false);
  const [headTiltAngle, setHeadTiltAngle] = useState(0);
  
  const catRef = useRef<SVGSVGElement>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const pounceConfidenceRef = useRef(0);
  const lastWandPositionRef = useRef({ x: 0, y: 0 });
  const lastWandMoveTimeRef = useRef(0);
  const lastVelocityRef = useRef(0);
  const velocityHistoryRef = useRef<number[]>([]);
  const movementNoveltyRef = useRef(1.0);
  const [energy, setEnergy] = useState(100); // Cat's energy, 0-100
  const [isDevMode, setIsDevMode] = useState(false);
  
  const cheekClickFlag = useRef(false);
  
  const [pounceConfidenceDisplay, setPounceConfidenceDisplay] = useState(0);
  const [lastVelocityDisplay, setLastVelocityDisplay] = useState(0);
  const [proximityMultiplierDisplay, setProximityMultiplierDisplay] = useState(1);
  const [movementNoveltyDisplay, setMovementNoveltyDisplay] = useState(1.0);
  const [rapidClickCount, setRapidClickCount] = useState(0);
  const [currentFact] = useState(catFacts[Math.floor(Math.random() * catFacts.length)]);

  const treatsPerSecond = useMemo(() => {
    return jobData.reduce((total, job) => {
      const currentLevel = jobLevels[job.id] || 0;
      if (currentLevel > 0) {
        return total + job.levels[currentLevel - 1].treatsPerSecond;
      }
      return total;
    }, 0);
  }, [jobLevels]);

  const energyRef = useRef(energy);
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  const wandPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      setIsDevMode(true);
    }
  }, []);

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
    if (pounceState.current.isActive) return;

    const energyMultiplier = 1 + energy / 100;
    const loveFromClick = Math.round(lovePerClick * energyMultiplier);
    setLove(t => t + loveFromClick);
    setEnergy(e => Math.max(0, e - 1));
    
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);

    const now = Date.now();

    if (!cheekClickFlag.current && !wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 500;
      const JUMP_CLICK_THRESHOLD = 4;
      const JUMP_CHANCE = 0.1 + (energy / 100) * 0.5;

      clickTimestampsRef.current.push(now);
      clickTimestampsRef.current = clickTimestampsRef.current.filter(
        (timestamp) => now - timestamp < JUMP_WINDOW_MS
      );
      if (isDevMode) setRapidClickCount(clickTimestampsRef.current.length);
      
      if (clickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD && Math.random() < JUMP_CHANCE) {
        setLove(current => current + loveFromClick);
        setIsJumping(true);
        clickTimestampsRef.current = [];
        if (isDevMode) setRapidClickCount(0);
        setTimeout(() => setIsJumping(false), 500);
      }
    }
    
    // Reset cheek flag after use
    if (cheekClickFlag.current) {
        cheekClickFlag.current = false;
    }

    const maxHeartSize = 2.0;
    const minHeartSize = 0.5;
    const growthFactor = 0.2;
    const calculatedScale = minHeartSize + Math.log(lovePerClick) * growthFactor;
    const baseScale = Math.min(calculatedScale, maxHeartSize);
    const randomScale = baseScale + (Math.random() - 0.5) * 0.2;

    const newHeart: HeartType = {
      id: now,
      x: event.clientX,
      y: event.clientY,
      translateX: Math.random() * 40 - 20,
      rotation: Math.random() * 60 - 30,
      scale: randomScale,
      animationDuration: 1,
    };
    setHearts((currentHearts) => [...currentHearts, newHeart]);
  };

  const removeHeart = (id: number) => {
    setHearts((currentHearts) =>
      currentHearts.filter((heart) => heart.id !== id)
    );
  };
  
  const handleWandClick = () => {
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
      setLove((currentLove) => currentLove + 1);
      setTimeout(() => setIsPlaying(false), 300);
    }
  };

  const pounceState = React.useRef({
    isActive: false,
  });

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

      if (distanceToCat < veryCloseDistance) {
        proximityMultiplier = 1 + Math.pow((veryCloseDistance - distanceToCat) / 25, 2.2);
      } else if (distanceToCat < nearDistance) {
        const progress = (distanceToCat - veryCloseDistance) / (nearDistance - veryCloseDistance);
        proximityMultiplier = 1.0 - progress * 0.7;
      }

      let velocityConfidence = 0, suddenStopConfidence = 0, suddenStartConfidence = 0;

      if (timeDelta > 16) { 
        const distanceMoved = Math.hypot(currentWandPosition.x - lastWandPositionRef.current.x, currentWandPosition.y - lastWandPositionRef.current.y);
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

      if (isDevMode) {
        setPounceConfidenceDisplay(pounceConfidenceRef.current);
        setLastVelocityDisplay(lastVelocityRef.current);
        setProximityMultiplierDisplay(proximityMultiplier);
        setMovementNoveltyDisplay(movementNoveltyRef.current);
      }

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
        setLove((currentLove) => currentLove + pounceLove);

        const newHearts: HeartType[] = Array.from({ length: Math.max(1, Math.round(pounceDistance / 40)) }, (_, i) => ({
            id: Date.now() + i,
            x: currentWandPosition.x + (Math.random() - 0.5) * 40,
            y: currentWandPosition.y + (Math.random() - 0.5) * 40,
            translateX: Math.random() * 60 - 30,
            rotation: Math.random() * 80 - 40,
            scale: Math.random() * 0.5 + 0.5,
            animationDuration: Math.random() * 0.5 + 0.5,
        }));
        setHearts((currentHearts) => [...currentHearts, ...newHearts]);
        const lastHeartId = newHearts[newHearts.length - 1]?.id;
        if (lastHeartId) setTrackableHeartId(lastHeartId);

        setTimeout(() => setHearts((currentHearts) => currentHearts.filter((heart) => !newHearts.some((nh) => nh.id === heart.id))), 1000);
        setIsPouncing(true);
        setTimeout(() => setIsPouncing(false), 500);
        setTimeout(() => setTrackableHeartId(null), 1000);
      }
    }, 100);

    return () => clearInterval(pouncePlanningInterval);
  }, [wandMode, isPouncing, lovePerPounce, isDevMode]);

  const handleEarClick = (ear: 'left' | 'right', event: React.MouseEvent) => {
    if (wigglingEar) return;
    handleCatClick(event);
    setWigglingEar(ear);
    setTimeout(() => setWigglingEar(null), 500);
  };
  
  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsStartled(true);
    setTimeout(() => setIsStartled(false), 500);
  };
  
  const handleNoseClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsSmiling(true);
    setLove((l) => l + 5);
    const now = Date.now();
    const newHeart: HeartType = {
      id: now,
      x: event.clientX,
      y: event.clientY,
      translateX: Math.random() * 20 - 10,
      rotation: Math.random() * 20 - 10,
      scale: 0.6,
      animationDuration: 0.8,
    };
    setHearts((currentHearts) => [...currentHearts, newHeart]);
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

  const handleUpgradeLovePerClick = () => {
    const cost = lovePerClick * 10;
    if (love >= cost) {
      setLove(love - cost);
      setLovePerClick(lovePerClick + 1);
    }
  };

  const handleUpgradePounce = () => {
    const cost = lovePerPounce * 10;
    if (love >= cost) {
      setLove(love - cost);
      setLovePerPounce(lovePerPounce + 5);
    }
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

  useEffect(() => {
    const treatInterval = setInterval(() => setTreats((prevTreats) => prevTreats + treatsPerSecond), 1000);
    return () => clearInterval(treatInterval);
  }, [treatsPerSecond]);

  const handlePromotion = (jobId: string) => {
    const currentLevel = jobLevels[jobId] || 0;
    const job = jobData.find(j => j.id === jobId);
    if (!job || currentLevel >= job.levels.length) return;
    const promotionCost = job.levels[currentLevel].cost;
    if (love >= promotionCost) {
      setLove(l => l - promotionCost);
      setJobLevels(prevLevels => ({...prevLevels, [jobId]: currentLevel + 1}));
    }
  };

  useEffect(() => {
    if (wandMode) document.body.classList.add('wand-mode-active');
    else document.body.classList.remove('wand-mode-active');
    return () => document.body.classList.remove('wand-mode-active');
  }, [wandMode]);

  return (
    <div className="game-container">
      {isDevMode && (
        <DevPanel
          energy={energy}
          pounceConfidence={pounceConfidenceDisplay}
          rapidClickCount={rapidClickCount}
          lastVelocity={lastVelocityDisplay}
          proximityMultiplier={proximityMultiplierDisplay}
          lovePerClick={lovePerClick}
          movementNovelty={movementNoveltyDisplay}
          treatsPerSecond={treatsPerSecond}
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
          <p><HeartIcon className="love-icon" /> {love.toFixed(0)}</p>
          <p><FishIcon className="treat-icon" /> {treats.toFixed(0)}</p>
        </div>
        <CatFact fact={currentFact} />
        <div className="cat-container">
          {wandMode && (
            <div className="wand-click-area" onClick={handleWandClick} />
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
            headTiltAngle={headTiltAngle}
            pounceTarget={pounceTarget}
            wigglingEar={wigglingEar}
            wiggleDuration={null}
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
              setWandMode(!wandMode);
              setWandInitialPosition({ x: e.clientX, y: e.clientY });
            }}
          >
            {wandMode ? 'Put away wand' : 'Play with wand'}
          </button>
          <button onClick={handleUpgradeLovePerClick} disabled={love < lovePerClick * 10}>
            More Love Per Pet (Cost: {lovePerClick * 10})
          </button>
          <button onClick={handleUpgradePounce} disabled={love < lovePerPounce * 10}>
            More Love From Pouncing (Cost: {lovePerPounce * 10})
          </button>
        </div>
      </div>
      <JobPanel
        jobLevels={jobLevels}
        onPromote={handlePromotion}
        currentLove={love}
      />
    </div>
  );
}

export default App; 