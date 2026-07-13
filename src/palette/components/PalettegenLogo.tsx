import type { ReactElement } from 'react';

export type PalettegenLogoProps = {
  size?: number;
};

/** Circle-cluster mark — soft, intentional paint-dab layout. */
export function PalettegenLogo({ size = 32 }: PalettegenLogoProps): ReactElement {
  return (
    <svg className="palettegen-logo" viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="palettegen-logo-bg" x1="8" y1="6" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f1630" />
          <stop offset="100%" stopColor="#120d1c" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="12" fill="url(#palettegen-logo-bg)" />
      <circle cx="20" cy="21" r="5.2" fill="#ff4d9d" />
      <circle cx="12.5" cy="15.5" r="4.1" fill="#fbbf24" />
      <circle cx="27.8" cy="14.8" r="3.8" fill="#38bdf8" />
      <circle cx="29.5" cy="24.5" r="4.4" fill="#2dd4a8" />
      <circle cx="14.2" cy="27.8" r="3.6" fill="#a78bfa" />
      <circle cx="21.5" cy="12" r="2.6" fill="#fb7185" opacity="0.92" />
    </svg>
  );
}
