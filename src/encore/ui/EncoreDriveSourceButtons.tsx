import Button, { type ButtonProps } from '@mui/material/Button';
import type { ReactElement } from 'react';
import { GoogleDriveBrandIcon } from '../components/EncoreBrandIcon';

const driveGlyphSx = { fontSize: 20 } as const;

export function EncoreBrowseDriveButton(
  props: Omit<ButtonProps, 'startIcon'> & {
    /** When false, the button is disabled (in addition to `disabled`). */
    signedIn?: boolean;
  },
): ReactElement {
  const { signedIn = true, disabled, children = 'Browse Drive', ...rest } = props;
  return (
    <Button
      variant="outlined"
      startIcon={<GoogleDriveBrandIcon sx={driveGlyphSx} aria-hidden />}
      {...rest}
      disabled={disabled || !signedIn}
    >
      {children}
    </Button>
  );
}
