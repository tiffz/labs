import React, { useRef } from 'react';
import HeartIcon from '../../icons/HeartIcon';
import '../../styles/cats.css';

interface HeartProps {
  id: number;
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
  onAnimationEnd: () => void;
}

const Heart: React.FC<HeartProps> = ({
  id,
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
      data-heart-id={id}
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
