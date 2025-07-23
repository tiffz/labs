import React, { useRef } from 'react';
import HeartIcon from './HeartIcon';
import './cats.css';

interface HeartProps {
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
  onAnimationEnd: () => void;
}

const Heart: React.FC<HeartProps> = ({
  x,
  y,
  translateX,
  rotation,
  scale,
  animationDuration,
  onAnimationEnd,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="heart"
      ref={ref}
      style={
        {
          left: `${x}px`,
          top: `${y}px`,
          '--translate-x': `${translateX}px`,
          '--rotation': `${rotation}deg`,
          '--scale': scale,
          animationDuration: `${animationDuration}s`,
        } as React.CSSProperties
      }
      onAnimationEnd={onAnimationEnd}
    >
      <HeartIcon stroke="white" strokeWidth="2" />
    </div>
  );
};

export default Heart;
