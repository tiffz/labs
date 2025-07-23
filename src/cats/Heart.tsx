import React, { useRef, useLayoutEffect } from 'react';
import HeartIcon from './HeartIcon';
import './cats.css';

interface HeartProps {
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  animationDuration: number;
  onMount?: (el: HTMLDivElement) => void;
}

const Heart: React.FC<HeartProps> = ({
  x,
  y,
  translateX,
  rotation,
  scale,
  animationDuration,
  onMount,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current && onMount) {
      onMount(ref.current);
    }
  }, [onMount]);

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
          '--animation-duration': `${animationDuration}s`,
        } as React.CSSProperties
      }
    >
      <HeartIcon stroke="white" strokeWidth="2" />
    </div>
  );
};

export default Heart;
