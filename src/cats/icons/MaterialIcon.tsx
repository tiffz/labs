import React from 'react';

interface MaterialIconProps {
  icon: string;
  className?: string;
  color?: string;
  size?: number;
}

const MaterialIcon: React.FC<MaterialIconProps> = ({ 
  icon, 
  className,
  color,
  size
}) => {
  const style: React.CSSProperties = {};
  if (color) {
    style.color = color;
  }
  if (size) {
    style.fontSize = `${size}px`;
  }

  return (
    <span
      className={`material-symbols-outlined ${className || ''}`}
      style={style}
    >
      {icon}
    </span>
  );
};

export default MaterialIcon; 