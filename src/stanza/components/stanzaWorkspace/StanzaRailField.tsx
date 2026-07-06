import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface StanzaRailFieldProps {
  label: string;
  /** Uppercase micro-label for dense rail rows (pitch, calibration). */
  labelVariant?: 'default' | 'inline';
  /** Optional inherit/custom caption between label and control. */
  inheritanceHint?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Visual state for scoped fields that inherit from whole song. */
  inheritanceMode?: 'direct' | 'inherit' | 'custom';
}

/** Label + control column for practice rail grids. */
export default function StanzaRailField({
  label,
  labelVariant = 'default',
  inheritanceHint,
  children,
  className,
  inheritanceMode = 'direct',
}: StanzaRailFieldProps): React.ReactElement {
  return (
    <Box
      className={[
        'stanza-rail-field',
        inheritanceMode === 'inherit' ? 'stanza-rail-field--inherit' : '',
        inheritanceMode === 'custom' ? 'stanza-rail-field--custom' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Box className="stanza-rail-field__head">
        <Typography
          component="span"
          className={[
            'stanza-rail-field-label',
            labelVariant === 'inline' ? 'stanza-rail-field-label--inline' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
        </Typography>
        {inheritanceHint}
      </Box>
      {children}
    </Box>
  );
}
