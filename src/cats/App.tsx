import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import Cat from './Cat';
import Heart from './Heart';
import Zzz from './Zzz';
import WandToy from './WandToy';
import DevPanel from './DevPanel';
import HeartIcon from './HeartIcon';
import FishIcon from './FishIcon';
import CatFact from './CatFact';
import JobPanel from './JobPanel';
import { catFacts } from './catFacts';
import { jobData } from './jobData';

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
  const [lastClickTime, setLastClickTime] = useState(0);
  const [wiggleDuration, setWiggleDuration] = useState<number | null>(null);
  const [hearts, setHearts] = useState<HeartType[]>([]);
  const [isStartled, setIsStartled] = useState(false);
  const [lastHeart, setLastHeart] = useState<HTMLDivElement | null>(null);
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
      // Takes ~10 mins to fully regenerate from 0
      setEnergy(currentEnergy => Math.min(100, currentEnergy + 100 / 600));
    }, 1000);

    return () => clearInterval(energyInterval);
  }, []);

  const handleCatClick = (event: React.MouseEvent) => {
    const energyMultiplier = 1 + energy / 100; // up to 2x
    const loveFromClick = Math.round(lovePerClick * energyMultiplier);
    setLove(t => t + loveFromClick);

    // Deplete energy from petting
    setEnergy(e => Math.max(0, e - 1));
    
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);

    const now = Date.now();

    // --- JUMP LOGIC ---
    if (!wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 500; // how far back to look for clicks
      const JUMP_CLICK_THRESHOLD = 4; // how many clicks needed to be a 'burst'
      const JUMP_CHANCE = 0.1 + (energy / 100) * 0.5; // 10% to 60% chance based on energy

      clickTimestampsRef.current.push(now);
      // Remove clicks that are too old to be part of the burst
      clickTimestampsRef.current = clickTimestampsRef.current.filter(
        (timestamp) => now - timestamp < JUMP_WINDOW_MS
      );
      if (isDevMode) {
        setRapidClickCount(clickTimestampsRef.current.length);
      }
      
      if (clickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD) {
        if (Math.random() < JUMP_CHANCE) {
          setLove(current => current + loveFromClick); // Bonus love!
          setIsJumping(true);
          // Reset burst detection after a successful jump
          clickTimestampsRef.current = [];
          if (isDevMode) {
            setRapidClickCount(0);
          }
          setTimeout(() => {
            setIsJumping(false);
          }, 500); // Duration of the jump animation
        }
      }
    }

    const interval = now - lastClickTime;

    const maxHeartSize = 2.0;
    const minHeartSize = 0.5;
    // Logarithmic growth for heart size
    const growthFactor = 0.2;
    const calculatedScale =
      minHeartSize + Math.log(lovePerClick) * growthFactor;
    const baseScale = Math.min(calculatedScale, maxHeartSize);
    const randomScale = baseScale + (Math.random() - 0.5) * 0.2; // Add some variation

    const newHeart: HeartType = {
      id: now,
      x: event.clientX,
      y: event.clientY,
      translateX: Math.random() * 40 - 20, // -20px to 20px
      rotation: Math.random() * 60 - 30, // -30deg to 30deg
      scale: randomScale,
      animationDuration: 1,
    };
    setHearts((currentHearts) => [...currentHearts, newHeart]);

    setTimeout(() => {
      setHearts((currentHearts) =>
        currentHearts.filter((heart) => heart.id !== newHeart.id)
      );
      setLastHeart(null);
    }, 1000);

    if (interval < 300) { // Fast click detected
      // Map the click interval (50ms-300ms) to an animation duration (0.4s-1.0s)
      const clampedInterval = Math.max(50, Math.min(interval, 300));
      // Faster click (smaller interval) -> shorter duration
      const newDuration = 0.4 + ((clampedInterval - 50) / (300 - 50)) * 0.6;
      
      setWiggleDuration(newDuration);
      setTimeout(() => setWiggleDuration(null), newDuration * 1000);
    }
    setLastClickTime(now);
  };

  const handleWandClick = () => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
    // Significantly increase the confidence from a direct shake action
    pounceConfidenceRef.current += 35;
    
    // Shaking the toy costs a little energy
    setEnergy(e => Math.max(0, e - 0.5));

    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      shakeTimeoutRef.current = window.setTimeout(
        () => setIsShaking(false),
        500
      );
    });

    if (isPouncing) {
      setIsPlaying(true);
      setLove((currentLove) => currentLove + 1); // Subsequent clicks are worth 1
      setTimeout(() => setIsPlaying(false), 300);
      return;
    }

    if (!catRef.current) return;
  };

  useEffect(() => {
    if (!wandMode) {
      pounceConfidenceRef.current = 0;
      if (isDevMode) {
        setPounceConfidenceDisplay(0);
      }
      return;
    }

    const pouncePlanningInterval = setInterval(() => {
      if (!catRef.current) return;

      // Drain a tiny bit of energy just for keeping the cat engaged with the wand
      setEnergy(e => Math.max(0, e - 0.05));

      const catRect = catRef.current.getBoundingClientRect();
      const catCenterX = catRect.left + catRect.width / 2;
      const catCenterY = catRect.top + catRect.height / 2;
      const currentWandPosition = wandPositionRef.current;
      const distanceToCat = Math.sqrt(
        Math.pow(currentWandPosition.x - catCenterX, 2) +
          Math.pow(currentWandPosition.y - catCenterY, 2)
      );

      // --- Confidence Calculation ---
      const now = Date.now();
      const timeDelta = now - lastWandMoveTimeRef.current;
      let proximityMultiplier = 1.0;
      const veryCloseDistance = 60; // The "super interested" zone
      const nearDistance = 220; // The "moderately interested" zone

      if (distanceToCat < veryCloseDistance) {
        // When very close, even tiny movements are exciting. Exponentially ramp up multiplier.
        proximityMultiplier = 1 + Math.pow((veryCloseDistance - distanceToCat) / 25, 2.2);
      } else if (distanceToCat < nearDistance) {
        // When near, there's some interest, but not a huge boost.
        const progress = (distanceToCat - veryCloseDistance) / (nearDistance - veryCloseDistance);
        proximityMultiplier = 1.0 - progress * 0.7; // goes from 1.0 down to 0.3
      } else {
        // When far, cat is less interested, velocity is less impactful.
        proximityMultiplier = 0.3;
      }

      let velocityConfidence = 0;
      let suddenStopConfidence = 0;
      let suddenStartConfidence = 0;

      // timeDelta check to avoid noisy calculations on first render or lag
      if (timeDelta > 16) { 
        const distanceMoved = Math.sqrt(
          Math.pow(currentWandPosition.x - lastWandPositionRef.current.x, 2) +
            Math.pow(currentWandPosition.y - lastWandPositionRef.current.y, 2)
        );

        const velocity = distanceMoved / timeDelta;
        
        // --- Boredom / Novelty Calculation ---
        velocityHistoryRef.current.push(velocity);
        if (velocityHistoryRef.current.length > 20) { // Look at a shorter history (~2s)
          velocityHistoryRef.current.shift(); 
        }

        const highVelocityThreshold = 1.5;
        const recentFastMoves = velocityHistoryRef.current.filter(v => v > highVelocityThreshold).length;
        const historyRatio = velocityHistoryRef.current.length > 0 ? recentFastMoves / velocityHistoryRef.current.length : 0;
        
        if (historyRatio > 0.5) { // Lower threshold to trigger boredom
            // If most of the recent movements were fast, the cat gets bored faster.
            movementNoveltyRef.current = Math.max(0.1, movementNoveltyRef.current - 0.1);
        } else {
            // If movement is not boring, novelty regenerates faster.
            movementNoveltyRef.current = Math.min(1.0, movementNoveltyRef.current + 0.06);
        }
        const movementNovelty = movementNoveltyRef.current;

        // --- Confidence from Movement ---
        if (velocity > 0.1) { 
          // Raw velocity confidence, dampened by boredom
          velocityConfidence = (velocity * 8) * movementNovelty; 
        }
        
        // Sudden Stop bonus, amplified by proximity
        if (lastVelocityRef.current > 1.6 && velocity < 0.3) {
            suddenStopConfidence = (20 * proximityMultiplier);
        }

        // Sudden Start bonus, also amplified by proximity
        if (lastVelocityRef.current < 0.4 && velocity > 1.5) {
            suddenStartConfidence = (25 * proximityMultiplier);
        }

        // Update refs for next calculation
        lastVelocityRef.current = velocity;
      }
      lastWandMoveTimeRef.current = now;
      lastWandPositionRef.current = currentWandPosition;
      
      // Combine confidences. More energy makes the cat more playful.
      const energyBoost = 1 + (energyRef.current / 100); // up to 2x confidence boost
      const totalConfidenceGain = (velocityConfidence + suddenStopConfidence + suddenStartConfidence);
      pounceConfidenceRef.current += totalConfidenceGain * energyBoost;

      // Decay confidence over time. Slower decay to reward sustained play.
      pounceConfidenceRef.current = Math.max(
        0,
        pounceConfidenceRef.current * 0.90
      );

      if (isDevMode) {
        setPounceConfidenceDisplay(pounceConfidenceRef.current);
        setLastVelocityDisplay(lastVelocityRef.current);
        setProximityMultiplierDisplay(proximityMultiplier);
        setMovementNoveltyDisplay(movementNoveltyRef.current);
      }

      // Pounce condition
      if (pounceConfidenceRef.current > 75 && !isPouncing) {
        pounceConfidenceRef.current = 0; // Reset after pouncing
        velocityHistoryRef.current = []; // Clear history after pounce
        movementNoveltyRef.current = 1.0; // Reset boredom as well

        // Pouncing costs more energy
        setEnergy(e => Math.max(0, e - 5));

        const vectorX = currentWandPosition.x - catCenterX;
        const vectorY = currentWandPosition.y - catCenterY;
        const pounceDistance = Math.sqrt(
          vectorX * vectorX + vectorY * vectorY
        );
        const maxPounce = 30 + Math.random() * 20;
        const angle = Math.atan2(vectorY, vectorX);
        const randomAngleOffset = (Math.random() - 0.5) * 0.4;
        const newAngle = angle + randomAngleOffset;

        const pounceX =
          pounceDistance > 0 ? Math.cos(newAngle) * maxPounce : 0;
        const pounceY =
          pounceDistance > 0 ? Math.sin(newAngle) * maxPounce : 0;

        setPounceTarget({ x: pounceX, y: pounceY });

        const pounceLove = Math.round(
          (lovePerPounce + pounceDistance / 20) * energyBoost
        );
        setLove((currentLove) => currentLove + pounceLove);

        // Create a burst of hearts at the click location
        const newHearts: HeartType[] = [];
        const heartCount = Math.max(1, Math.round(pounceDistance / 40));
        for (let i = 0; i < heartCount; i++) {
          newHearts.push({
            id: Date.now() + i,
            x: currentWandPosition.x + (Math.random() - 0.5) * 40,
            y: currentWandPosition.y + (Math.random() - 0.5) * 40,
            translateX: Math.random() * 60 - 30,
            rotation: Math.random() * 80 - 40,
            scale: Math.random() * 0.5 + 0.5,
            animationDuration: Math.random() * 0.5 + 0.5,
          });
        }
        setHearts((currentHearts) => [...currentHearts, ...newHearts]);
        setTrackableHeartId(newHearts[newHearts.length - 1].id);

        // Remove the hearts after a delay
        setTimeout(() => {
          setHearts((currentHearts) =>
            currentHearts.filter(
              (heart) => !newHearts.some((nh) => nh.id === heart.id)
            )
          );
        }, 1000);

        setIsPouncing(true);
        setTimeout(() => {
          setIsPouncing(false);
        }, 500);

        // Clear the heart tracking after the hearts have disappeared
        setTimeout(() => {
          setTrackableHeartId(null);
        }, 1000);
      }
    }, 100);

    return () => {
      clearInterval(pouncePlanningInterval);
    };
  }, [
    wandMode,
    isPouncing,
    lovePerPounce,
    isDevMode,
  ]);

  const handleEyeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isStartled) {
      return;
    }
    setIsStartled(true);
    setTimeout(() => {
      setIsStartled(false);
    }, 500);
  };

  const handleEarClick = (ear: 'left' | 'right', event: React.MouseEvent) => {
    if (wigglingEar) {
      return;
    }
    handleCatClick(event);
    setWigglingEar(ear);
    setTimeout(() => {
      setWigglingEar(null);
    }, 500);
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

  useEffect(() => {
    if (trackableHeartId === null) {
      setLastHeart(null);
    }
  }, [trackableHeartId]);

  useEffect(() => {
    let drowsinessTimer: number;
    let sleepTimer: number;

    const resetInactivityTimer = () => {
      wakeUp();
      clearTimeout(drowsinessTimer);
      clearTimeout(sleepTimer);
      drowsinessTimer = window.setTimeout(() => {
        setIsDrowsy(true);
      }, 20000); // 20 seconds
      sleepTimer = window.setTimeout(() => {
        setIsDrowsy(false);
        setIsSleeping(true);
      }, 30000); // 30 seconds
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
      if (zzzTimeoutRef.current) {
        clearTimeout(zzzTimeoutRef.current);
      }
      zzzTimeoutRef.current = window.setTimeout(() => {
        // Calculate position right before spawning
        let spawnX = window.innerWidth / 2;
        let spawnY = window.innerHeight / 2 - 20;

        if (catRef.current) {
          const catRect = catRef.current.getBoundingClientRect();
          // Approximate position of the cat's head within the SVG
          spawnX = catRect.left + catRect.width * 0.5;
          spawnY = catRect.top + catRect.height * 0.2;
        }

        setZzzs((currentZzzs) => [
          ...currentZzzs,
          {
            id: Date.now(),
            x: spawnX + (Math.random() * 40 - 20),
            y: spawnY + (Math.random() * 20 - 10),
            translateX: Math.random() * 40 - 20,
            rotation: Math.random() * 60 - 30,
            scale: Math.random() * 0.4 + 0.8,
          },
        ]);
        const nextDelay = Math.max(minDelay, delay * decayFactor);
        scheduleNextZzz(nextDelay);
      }, delay);
    };

    if (isSleeping) {
      scheduleNextZzz(initialDelay);
    } else {
      if (zzzTimeoutRef.current) {
        clearTimeout(zzzTimeoutRef.current);
      }
    }

    return () => {
      if (zzzTimeoutRef.current) {
        clearTimeout(zzzTimeoutRef.current);
      }
    };
  }, [isSleeping]);

  useEffect(() => {
    const treatInterval = setInterval(() => {
      setTreats((prevTreats) => prevTreats + treatsPerSecond);
    }, 1000);

    return () => {
      clearInterval(treatInterval);
    };
  }, [treatsPerSecond]);

  const handleUpgradeLovePerClick = () => {
    const cost = lovePerClick * 10;
    if (love >= cost) {
      setLove(love - cost);
      setLovePerClick(lovePerClick + 1);
    }
  };

  const handlePromotion = (jobId: string) => {
    const currentLevel = jobLevels[jobId] || 0;
    const job = jobData.find(j => j.id === jobId);
    if (!job || currentLevel >= job.levels.length) {
      return; // Job not found or max level
    }

    const promotionCost = job.levels[currentLevel].cost;
    if (love >= promotionCost) {
      setLove(l => l - promotionCost);
      setJobLevels(prevLevels => ({
        ...prevLevels,
        [jobId]: currentLevel + 1,
      }));
    }
  };

  useEffect(() => {
    if (wandMode) {
      document.body.classList.add('wand-mode-active');
    } else {
      document.body.classList.remove('wand-mode-active');
    }
    return () => {
      document.body.classList.remove('wand-mode-active');
    };
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
              onMount={
                heart.id === trackableHeartId
                  ? (el) => setLastHeart(el)
                  : undefined
              }
              x={heart.x}
              y={heart.y}
              translateX={heart.translateX}
              rotation={heart.rotation}
              scale={heart.scale}
              animationDuration={heart.animationDuration}
            />
          ))}
          {zzzs.map((zzz) => (
            <Zzz
              key={zzz.id}
              x={zzz.x}
              y={zzz.y}
              translateX={zzz.translateX}
              rotation={zzz.rotation}
              scale={zzz.scale}
            />
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
            isPetting={isPetting}
            isStartled={isStartled}
            isSleeping={isSleeping}
            isDrowsy={isDrowsy}
            isPouncing={isPouncing}
            isJumping={isJumping}
            isPlaying={isPlaying}
            pounceTarget={pounceTarget}
            wigglingEar={wigglingEar}
            wiggleDuration={wiggleDuration}
            lastHeart={lastHeart}
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