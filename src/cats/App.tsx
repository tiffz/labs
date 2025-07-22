import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Cat from './Cat';
import Heart from './Heart';

interface HeartType {
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

  const handleCatClick = (event: React.MouseEvent) => {
    setTreats(treats + treatsPerClick);
    setIsPetting(true);
    setTimeout(() => setIsPetting(false), 200);

    const now = Date.now();
    const interval = now - lastClickTime;

    const newHeart: HeartType = {
      id: now,
      x: event.clientX,
      y: event.clientY,
      translateX: Math.random() * 40 - 20, // -20px to 20px
      rotation: Math.random() * 60 - 30, // -30deg to 30deg
      scale: Math.random() * 0.4 + 0.8, // 0.8 to 1.2
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
        hearts.map((heart, index) => (
          <Heart
            key={heart.id}
            onMount={
              index === hearts.length - 1
                ? (el) => setLastHeart(el)
                : undefined
            }
            x={heart.x}
            y={heart.y}
            translateX={heart.translateX}
            rotation={heart.rotation}
            scale={heart.scale}
          />
        )),
        document.getElementById('heart-container')!
      )}
      <h1>Cat Clicker</h1>
      <div className="stats-container">
        <p>Treats: {treats}</p>
        <p>Treats per click: {treatsPerClick}</p>
        <p>Treats per second: {treatsPerSecond}</p>
      </div>
      <div className="cat-container">
        <Cat
          onClick={handleCatClick}
          onEyeClick={handleEyeClick}
          isPetting={isPetting}
          isStartled={isStartled}
          wiggleDuration={wiggleDuration}
          lastHeart={lastHeart}
        />
      </div>
      <div className="upgrades-container">
        <button onClick={handleUpgradeTreatsPerClick} disabled={treats < treatsPerClick * 10}>
          Upgrade treats per click (Cost: {treatsPerClick * 10})
        </button>
        <button onClick={handleUpgradeTreatsPerSecond} disabled={treats < (treatsPerSecond + 1) * 15}>
          Upgrade treats per second (Cost: {(treatsPerSecond + 1) * 15})
        </button>
      </div>
    </div>
  );
}

export default App; 