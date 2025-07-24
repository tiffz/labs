import React from 'react';
import '../../styles/cats.css';

interface ZzzProps {
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
  onAnimationEnd: () => void;
}

const Zzz: React.FC<ZzzProps> = ({
  x,
  y,
  translateX,
  rotation,
  scale,
  onAnimationEnd,
}) => {
  const style: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    '--translate-x': `${translateX}px`,
    '--rotation': `${rotation}deg`,
    '--scale': scale,
  } as React.CSSProperties;

  return (
    <div className="zzz" style={style} onAnimationEnd={onAnimationEnd}>
      Z
    </div>
  );
};

export default Zzz;
