import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';

/** Subsection label on song-related screens (performance editor, etc.). */
export function SongPageSubheading(props: { children: ReactNode; sx?: SxProps<Theme> }): ReactElement {
  const { children, sx } = props;
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        mb: 1,
        mt: 0.5,
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}
