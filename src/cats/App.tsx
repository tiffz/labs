import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Cat from './Cat';
import Heart from './Heart';
import Zzz from './Zzz';
import WandToy from './WandToy';

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
  const [treats, setTreats] = useState(0);
  const [treatsPerClick, setTreatsPerClick] = useState(1);
  const [treatsPerSecond, setTreatsPerSecond] = useState(0);
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
  const [treatsPerPounce, setTreatsPerPounce] = useState(3);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  const catRef = useRef<SVGSVGElement>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const [wandPosition, setWandPosition] = useState({ x: 0, y: 0 });
  const pounceConfidenceRef = useRef(0);
  const lastWandPositionRef = useRef({ x: 0, y: 0 });
  const lastWandMoveTimeRef = useRef(0);

  const handleCatClick = (event: React.MouseEvent) => {
    setTreats(treats + treatsPerClick);
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);

    const now = Date.now();

    // --- JUMP LOGIC ---
    if (!wandMode && !isJumping) {
      const JUMP_WINDOW_MS = 500; // how far back to look for clicks
      const JUMP_CLICK_THRESHOLD = 4; // how many clicks needed to be a 'burst'
      const JUMP_CHANCE = 0.4; // 40% chance to jump on a burst

      clickTimestampsRef.current.push(now);
      // Remove clicks that are too old to be part of the burst
      clickTimestampsRef.current = clickTimestampsRef.current.filter(
        (timestamp) => now - timestamp < JUMP_WINDOW_MS
      );
      
      if (clickTimestampsRef.current.length >= JUMP_CLICK_THRESHOLD) {
        if (Math.random() < JUMP_CHANCE) {
          setTreats(current => current + treatsPerClick); // Bonus treats!
          setIsJumping(true);
          // Reset burst detection after a successful jump
          clickTimestampsRef.current = [];
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
      minHeartSize + Math.log(treatsPerClick) * growthFactor;
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
    pounceConfidenceRef.current += 15;
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
      setTreats((currentTreats) => currentTreats + 1); // Subsequent clicks are worth 1
      setTimeout(() => setIsPlaying(false), 300);
      return;
    }

    if (!catRef.current) return;
  };

  useEffect(() => {
    if (!wandMode) {
      pounceConfidenceRef.current = 0;
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      setWandPosition({ x: event.clientX, y: event.clientY });
    };
    document.addEventListener('mousemove', handleMouseMove);

    const pouncePlanningInterval = setInterval(() => {
      if (!catRef.current) return;

      const catRect = catRef.current.getBoundingClientRect();
      const catCenterX = catRect.left + catRect.width / 2;
      const catCenterY = catRect.top + catRect.height / 2;
      const distanceToCat = Math.sqrt(
        Math.pow(wandPosition.x - catCenterX, 2) +
          Math.pow(wandPosition.y - catCenterY, 2)
      );

      // --- Confidence Calculation ---

      // 1. Proximity: Closer is better. Confidence increases exponentially as the toy gets closer.
      let proximityConfidence = 0;
      if (distanceToCat < 300) {
        proximityConfidence = Math.pow((300 - distanceToCat) / 50, 2);
      }
      
      const now = Date.now();
      const distanceMoved = Math.sqrt(
        Math.pow(wandPosition.x - lastWandPositionRef.current.x, 2) +
          Math.pow(wandPosition.y - lastWandPositionRef.current.y, 2)
      );
      const timeDelta = now - lastWandMoveTimeRef.current;
      
      // 2. Velocity: Faster is better.
      let velocityConfidence = 0;
      if (distanceMoved > 5 && timeDelta > 0) {
        const velocity = distanceMoved / timeDelta;
        velocityConfidence = velocity * 10; // A direct multiplier for speed
        if (velocity > 1.2) {
            velocityConfidence += 30; // Bonus for very fast movement
        }
        lastWandMoveTimeRef.current = now;
        lastWandPositionRef.current = wandPosition;
      }
      
      // Combine confidences
      pounceConfidenceRef.current += proximityConfidence + velocityConfidence;

      // Decay confidence over time
      pounceConfidenceRef.current = Math.max(
        0,
        pounceConfidenceRef.current * 0.9
      );

      // Pounce condition
      if (pounceConfidenceRef.current > 75 && !isPouncing) {
        pounceConfidenceRef.current = 0; // Reset after pouncing

        const vectorX = wandPosition.x - catCenterX;
        const vectorY = wandPosition.y - catCenterY;
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

        const treatsForPounce = Math.round(
          treatsPerPounce + pounceDistance / 20
        );
        setTreats((currentTreats) => currentTreats + treatsForPounce);

        // Create a burst of hearts at the click location
        const newHearts: HeartType[] = [];
        const heartCount = Math.max(1, Math.round(pounceDistance / 40));
        for (let i = 0; i < heartCount; i++) {
          newHearts.push({
            id: Date.now() + i,
            x: wandPosition.x + (Math.random() - 0.5) * 40,
            y: wandPosition.y + (Math.random() - 0.5) * 40,
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
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(pouncePlanningInterval);
    };
  }, [
    wandMode,
    isPouncing,
    treatsPerPounce,
    wandPosition,
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
    const cost = treatsPerPounce * 10;
    if (treats >= cost) {
      setTreats(treats - cost);
      setTreatsPerPounce(treatsPerPounce + 5);
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
        setZzzs((currentZzzs) => [
          ...currentZzzs,
          {
            id: Date.now(),
            x: window.innerWidth / 2 + Math.random() * 20 - 10,
            y: window.innerHeight / 2 - 20 + Math.random() * 10,
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

  const handleUpgradeTreatsPerClick = () => {
    const cost = treatsPerClick * 10;
    if (treats >= cost) {
      setTreats(treats - cost);
      setTreatsPerClick(treatsPerClick + 1);
    }
  };

  const handleUpgradeTreatsPerSecond = () => {
    const cost = (treatsPerSecond + 1) * 15;
    if (treats >= cost) {
      setTreats(treats - cost);
      setTreatsPerSecond(treatsPerSecond + 1);
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
      <h1>Cat Clicker</h1>
      <div className="stats-container">
        <p>Treats: {treats}</p>
        <p>Treats per click: {treatsPerClick}</p>
        <p>Treats per second: {treatsPerSecond}</p>
      </div>
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
        <button onClick={handleUpgradeTreatsPerClick} disabled={treats < treatsPerClick * 10}>
          Upgrade treats per click (Cost: {treatsPerClick * 10})
        </button>
        <button onClick={handleUpgradePounce} disabled={treats < treatsPerPounce * 10}>
          Upgrade pounce power (Cost: {treatsPerPounce * 10})
        </button>
        <button onClick={handleUpgradeTreatsPerSecond} disabled={treats < (treatsPerSecond + 1) * 15}>
          Upgrade treats per second (Cost: {(treatsPerSecond + 1) * 15})
        </button>
      </div>
    </div>
  );
}

export default App; 