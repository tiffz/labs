import Box from '@mui/material/Box';
import type { ReactElement } from 'react';

const LYREFLY_FEATHER_SRC = '/icons/lyrefly-feather.png';

export type LyreflyLogomarkProps = {
  size?: number;
  className?: string;
};

export function LyreflyLogomark({ size = 28, className }: LyreflyLogomarkProps): ReactElement {
  return (
    <Box
      component="span"
      className={['lyrefly-logomark', className].filter(Boolean).join(' ')}
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        '& img': {
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
        },
      }}
    >
      <img src={LYREFLY_FEATHER_SRC} alt="" aria-hidden width={size} height={size} decoding="async" />
    </Box>
  );
}
