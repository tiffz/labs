import React, { useState, useEffect, useRef } from 'react';
import '../../styles/cats.css';

interface WandToyProps {
  isShaking: boolean;
  initialPosition: { x: number; y: number };
}

const WandToy: React.FC<WandToyProps> = ({ isShaking, initialPosition }) => {
  const [position, setPosition] = useState(() => initialPosition);
  const [wiggle, setWiggle] = useState(0);
  const lastPositionRef = useRef(initialPosition);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPosition = { x: event.clientX, y: event.clientY };
      setPosition(newPosition);

      const deltaX = newPosition.x - lastPositionRef.current.x;
      const deltaY = newPosition.y - lastPositionRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      const maxWiggle = 35;
      const velocityFactor = 1.5;
      let newWiggle = Math.min(distance * velocityFactor, maxWiggle);

      // Add horizontal direction to the wiggle
      newWiggle *= Math.sign(deltaX);

      // Add some randomness
      newWiggle += (Math.random() - 0.5) * 10;
      
      setWiggle(newWiggle);

      lastPositionRef.current = newPosition;
    };

    document.addEventListener('mousemove', handleMouseMove);

    const smoothWiggle = () => {
      setWiggle(currentWiggle => currentWiggle * 0.85);
      animationFrameRef.current = requestAnimationFrame(smoothWiggle);
    };
    animationFrameRef.current = requestAnimationFrame(smoothWiggle);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`wand-toy ${isShaking ? 'shaking' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, 0) rotate(${wiggle}deg)`,
        transformOrigin: '50% 0',
      }}
    >
      <svg
        width="50"
        height="50"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id="featherGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#4A90E2', stopOpacity: 1 }} />
            <stop
              offset="100%"
              style={{ stopColor: '#D0021B', stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>
        <g transform="translate(0, 5)">
          <path
            d="M 50 0 Q 65 50, 50 90 Q 35 50, 50 0"
            fill="url(#featherGradient)"
            transform="rotate(-20, 50, 0)"
          />
          <path
            d="M 50 0 Q 65 50, 50 90 Q 35 50, 50 0"
            fill="url(#featherGradient)"
            transform="rotate(20, 50, 0)"
          />
          <path
            d="M 50 0 Q 65 50, 50 90 Q 35 50, 50 0"
            fill="url(#featherGradient)"
          />
        </g>
      </svg>
    </div>
  );
};

export default WandToy;
