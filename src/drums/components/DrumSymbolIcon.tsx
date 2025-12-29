import React from 'react';
import type { DrumSound } from '../types';

interface DrumSymbolIconProps {
  sound: DrumSound;
  size?: number;
  className?: string;
}

// Use exact same paths as drumSymbols.ts
const DRUM_SYMBOL_PATHS = {
  dum: 'M 6 -7 Q -2 -7, -2 0 Q -2 7, 6 7 L 6 13',
  tak: 'M -6 6 L 0 -6 L 6 6',
  ka: 'M -6 -6 L 0 6 L 6 -6',
} as const;

const DrumSymbolIcon: React.FC<DrumSymbolIconProps> = ({ sound, size = 16, className = '' }) => {
  if (sound === 'rest') {
    return (
      <span className={className} style={{ fontSize: `${size * 0.75}px` }}>
        —
      </span>
    );
  }

  // Adjust viewBox to accommodate dum symbol which extends to y=13
  // Use -8 -8 16 24 to give extra space at bottom for dum's vertical line
  const viewBox = '-8 -8 16 24';
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}
    >
      {sound === 'dum' && (
        <path
          d={DRUM_SYMBOL_PATHS.dum}
          stroke="currentColor"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {sound === 'tak' && (
        <path
          d={DRUM_SYMBOL_PATHS.tak}
          stroke="currentColor"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
      )}
      {sound === 'ka' && (
        <path
          d={DRUM_SYMBOL_PATHS.ka}
          stroke="currentColor"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
      )}
      {sound === 'slap' && (
        <circle
          cx="0"
          cy="0"
          r="7.5"
          fill="currentColor"
          stroke="none"
        />
      )}
    </svg>
  );
};

export default DrumSymbolIcon;

