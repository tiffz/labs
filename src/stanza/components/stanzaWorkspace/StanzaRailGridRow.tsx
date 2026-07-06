import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

export type StanzaRailGridRowVariant = 'pitch' | 'calibration';

export interface StanzaRailGridRowProps {
  variant?: StanzaRailGridRowVariant;
  children: ReactNode;
  className?: string;
}

/** Shared horizontal grid for practice rail field groups. */
export default function StanzaRailGridRow({
  variant = 'pitch',
  children,
  className,
}: StanzaRailGridRowProps): React.ReactElement {
  return (
    <Box
      className={[
        'stanza-rail-grid-row',
        variant === 'pitch' ? 'stanza-rail-pitch-row' : 'stanza-rail-calibration-grid',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Box>
  );
}
