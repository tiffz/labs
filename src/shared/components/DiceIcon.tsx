import React from 'react';

type DiceIconVariant = 'single' | 'multiple';

interface DiceIconProps {
  variant?: DiceIconVariant;
  size?: number;
  className?: string;
  opacity?: number;
}

// Source paths from Material Design Icons (Pictogrammers):
// - dice-5-outline
// - dice-multiple-outline
const DICE_PATHS: Record<DiceIconVariant, string> = {
  single:
    'M19 5V19H5V5H19M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M7.5 6C6.7 6 6 6.7 6 7.5S6.7 9 7.5 9 9 8.3 9 7.5 8.3 6 7.5 6M16.5 15C15.7 15 15 15.7 15 16.5C15 17.3 15.7 18 16.5 18C17.3 18 18 17.3 18 16.5C18 15.7 17.3 15 16.5 15M16.5 6C15.7 6 15 6.7 15 7.5S15.7 9 16.5 9C17.3 9 18 8.3 18 7.5S17.3 6 16.5 6M12 10.5C11.2 10.5 10.5 11.2 10.5 12S11.2 13.5 12 13.5 13.5 12.8 13.5 12 12.8 10.5 12 10.5M7.5 15C6.7 15 6 15.7 6 16.5C6 17.3 6.7 18 7.5 18S9 17.3 9 16.5C9 15.7 8.3 15 7.5 15Z',
  multiple:
    'M14 8C13.45 8 13 7.55 13 7S13.45 6 14 6C14.55 6 15 6.45 15 7C15 7.55 14.55 8 14 8M12 12V19H5V12H12M12.78 10H4.22C3.55 10 3 10.55 3 11.22V19.78C3 20.45 3.55 21 4.22 21H12.78C13.45 21 14 20.45 14 19.78V11.22C14 10.55 13.45 10 12.78 10M19.78 3H11.22C10.55 3 10 3.55 10 4.22V8H12V5H19V12H16V14H19.78C20.45 14 21 13.45 21 12.78V4.22C21 3.55 20.45 3 19.78 3M17 8C16.45 8 16 7.55 16 7S16.45 6 17 6C17.55 6 18 6.45 18 7C18 7.55 17.55 8 17 8M17 11C16.45 11 16 10.55 16 10S16.45 9 17 9C17.55 9 18 9.45 18 10C18 10.55 17.55 11 17 11M7 15C6.45 15 6 14.55 6 14S6.45 13 7 13C7.55 13 8 13.45 8 14C8 14.55 7.55 15 7 15M10 18C9.45 18 9 17.55 9 17S9.45 16 10 16C10.55 16 11 16.45 11 17C11 17.55 10.55 18 10 18',
};

const DiceIcon: React.FC<DiceIconProps> = ({
  variant = 'single',
  size = 18,
  className,
  opacity = 0.88,
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    opacity={opacity}
    aria-hidden="true"
    className={className}
    focusable="false"
  >
    <path d={DICE_PATHS[variant]} />
  </svg>
);

export default DiceIcon;
