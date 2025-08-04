import React, { useEffect, useRef } from 'react';
import '../../styles/cats.css';
import type { MouseState } from '../../hooks/useMouseTracking';

interface WandToyProps {
  isShaking: boolean;
  initialPosition: { x: number; y: number };
  mouseState: MouseState;
}

const WandToy: React.FC<WandToyProps> = ({ isShaking, initialPosition, mouseState }) => {
  const lastPositionRef = useRef(initialPosition);
  const wandRef = useRef<HTMLDivElement>(null);
  const currentPositionRef = useRef(initialPosition);

  useEffect(() => {
    const handleMouseMove = (newPosition: { x: number; y: number }) => {
      // Update position directly in DOM without React state update
      if (wandRef.current) {
        wandRef.current.style.left = `${newPosition.x}px`;
        wandRef.current.style.top = `${newPosition.y}px`;
        
        // Apply wiggle effect directly to DOM for better performance
        const deltaX = newPosition.x - lastPositionRef.current.x;
        const deltaY = newPosition.y - lastPositionRef.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        const maxWiggle = 35;
        const velocityFactor = 1.5;
        let wiggleAmount = Math.min(distance * velocityFactor, maxWiggle);

        // Add horizontal direction to the wiggle
        wiggleAmount *= Math.sign(deltaX);

        // Add some randomness
        wiggleAmount += (Math.random() - 0.5) * 10;
        
        // Apply transform directly to DOM (no React re-render)
        wandRef.current.style.transform = `translate(-50%, 0) rotate(${wiggleAmount}deg)`;
        
        // Automatically decay the wiggle effect via CSS transition
        setTimeout(() => {
          if (wandRef.current) {
            wandRef.current.style.transform = 'translate(-50%, 0) rotate(0deg)';
          }
        }, 100);
      }

      currentPositionRef.current = newPosition;
      lastPositionRef.current = newPosition;
    };

    // Register with unified mouse tracking system
    const unsubscribe = mouseState.onMouseMove(handleMouseMove);

    return unsubscribe;
  }, [mouseState]);

  return (
    <div
      ref={wandRef}
      className={`wand-toy ${isShaking ? 'shaking' : ''}`}
      style={{
        left: `${initialPosition.x}px`,
        top: `${initialPosition.y}px`,
        transform: 'translate(-50%, 0)',
        transformOrigin: '50% 0',
        transition: 'transform 0.1s ease-out', // Smooth wiggle decay
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
