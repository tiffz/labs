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
  const [zzzs, setZzzs] = useState<ZzzType[]>([]);
  const zzzTimeoutRef = useRef<number | null>(null);
  const [wigglingEar, setWigglingEar] = useState<'left' | 'right' | null>(null);
  const [wandMode, setWandMode] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isPouncing, setIsPouncing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pounceTarget, setPounceTarget] = useState({ x: 0, y: 0 });
  const [treatsPerPounce, setTreatsPerPounce] = useState(3);
  const [trackableHeartId, setTrackableHeartId] = useState<number | null>(null);
  const catRef = useRef<SVGSVGElement>(null);
  const shakeTimeoutRef = useRef<number | null>(null);

  const handleCatClick = (event: React.MouseEvent) => {
    setTreats(treats + treatsPerClick);
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);

    const now = Date.now();
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

  const handleWandClick = (event: React.MouseEvent) => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
    }
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

    const catRect = catRef.current.getBoundingClientRect();
    const catCenterX = catRect.left + catRect.width / 2;
    const catCenterY = catRect.top + catRect.height / 2;

    const vectorX = event.clientX - catCenterX;
    const vectorY = event.clientY - catCenterY;
    const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
    const maxPounce = 40; // Max pounce distance in SVG units

    const pounceX = magnitude > 0 ? (vectorX / magnitude) * maxPounce : 0;
    const pounceY = magnitude > 0 ? (vectorY / magnitude) * maxPounce : 0;

    setPounceTarget({ x: pounceX, y: pounceY });
    setTreats((currentTreats) => currentTreats + treatsPerPounce);

    // Create a burst of hearts at the click location
    const newHearts: HeartType[] = [];
    for (let i = 0; i < 5; i++) {
      newHearts.push({
        id: Date.now() + i,
        x: event.clientX + (Math.random() - 0.5) * 40,
        y: event.clientY + (Math.random() - 0.5) * 40,
        translateX: Math.random() * 60 - 30,
        rotation: Math.random() * 80 - 40,
        scale: Math.random() * 0.5 + 0.5,
        animationDuration: Math.random() * 0.5 + 0.5, // 0.5s to 1s
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
  };

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
    setZzzs([]);
  }, []);

  useEffect(() => {
    if (trackableHeartId === null) {
      setLastHeart(null);
    }
  }, [trackableHeartId]);

  useEffect(() => {
    let inactivityTimer: number;

    const resetInactivityTimer = () => {
      wakeUp();
      clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        setIsSleeping(true);
      }, 30000); // 30 seconds
    };

    resetInactivityTimer();

    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('mousedown', resetInactivityTimer);

    return () => {
      clearTimeout(inactivityTimer);
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
          {wandMode && <WandToy isShaking={isShaking} />}
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
          catRef={catRef}
          onClick={handleCatClick}
          onEyeClick={handleEyeClick}
          onEarClick={handleEarClick}
          isPetting={isPetting}
          isStartled={isStartled}
          isSleeping={isSleeping}
          isPouncing={isPouncing}
          isPlaying={isPlaying}
          pounceTarget={pounceTarget}
          wigglingEar={wigglingEar}
          wiggleDuration={wiggleDuration}
          lastHeart={lastHeart}
        />
      </div>
      <div className="upgrades-container">
        <button onClick={() => setWandMode(!wandMode)}>
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