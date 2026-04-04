import React from 'react';

interface MaterialIconProps {
  icon: string;
  className?: string;
  color?: string;
  size?: number;
}

const ICON_ALIASES: Record<string, string> = {
  // Legacy name used in Cats controls; not reliably available in all symbol sets.
  magic_button: 'auto_fix_high',
};

const MaterialIcon: React.FC<MaterialIconProps> = ({ 
  icon, 
  className,
  color,
  size
}) => {
  const resolvedIcon = ICON_ALIASES[icon] ?? icon;
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
      {resolvedIcon}
    </span>
  );
};

export default MaterialIcon; 