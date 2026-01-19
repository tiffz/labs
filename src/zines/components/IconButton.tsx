/* eslint-disable react/prop-types */
import React, { memo } from 'react';

interface IconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  icon: 'replace' | 'remove' | 'swap' | 'link' | 'unlink';
  title?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'danger';
  className?: string;
  disabled?: boolean;
}

const ICONS = {
  replace: '↻',
  remove: '×',
  swap: '⇄',
  link: '🔗',
  unlink: '⛓️‍💥',
};

const IconButton: React.FC<IconButtonProps> = memo(({
  onClick,
  icon,
  title,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
}) => {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm';
  const variantClasses = variant === 'danger'
    ? 'bg-amber-100 text-amber-600 hover:bg-red-100 hover:text-red-600'
    : 'bg-amber-100 text-amber-600 hover:bg-teal-100 hover:text-teal-600';
  const disabledClasses = disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110';

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`rounded-full flex items-center justify-center transition-all ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
      title={title}
    >
      {ICONS[icon]}
    </button>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
