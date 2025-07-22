import React, { useState, useEffect } from 'react';
import './cats.css';

interface WandToyProps {
  isShaking: boolean;
  initialPosition: { x: number; y: number };
}

const WandToy: React.FC<WandToyProps> = ({ isShaking, initialPosition }) => {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      className={`wand-toy ${isShaking ? 'shaking' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
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
