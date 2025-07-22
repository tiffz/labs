import React from 'react';
import './cats.css';

interface ZzzProps {
  x: number;
  y: number;
  translateX: number;
  rotation: number;
  scale: number;
}

const Zzz: React.FC<ZzzProps> = ({ x, y, translateX, rotation, scale }) => {
  const style: React.CSSProperties = {
    left: `${x}px`,
    top: `${y}px`,
    '--translate-x': `${translateX}px`,
    '--rotation': `${rotation}deg`,
    '--scale': scale,
  } as React.CSSProperties;

  return (
    <div className="zzz" style={style}>
      Z
    </div>
  );
};

export default Zzz;
