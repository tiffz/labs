import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';

export type LabsListLoadingStateProps = {
  /** Accessible status label (shown to screen readers; spinner variant also shows visible copy). */
  label?: string;
  /** Centered spinner + caption, or skeleton rows shaped like a list/table. */
  variant?: 'spinner' | 'skeleton';
  /** Skeleton row count when `variant="skeleton"`. */
  skeletonRows?: number;
  sx?: SxProps<Theme>;
};

/**
 * Distinct loading affordance for list and table screens — use while async/local DB
 * data is still resolving. Do not reuse empty-state copy or “Nothing here yet” patterns.
 */
export function LabsListLoadingState({
  label = 'Loading',
  variant = 'spinner',
  skeletonRows = 6,
  sx,
}: LabsListLoadingStateProps): ReactElement {
  if (variant === 'skeleton') {
    return (
      <Stack
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
        spacing={1.25}
        sx={{ width: 1, py: 2, ...sx }}
      >
        {Array.from({ length: skeletonRows }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={44}
            width={i % 2 === 0 ? '100%' : '92%'}
            sx={{ borderRadius: 1, opacity: Math.max(0.55, 0.9 - i * 0.04) }}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 8,
        ...sx,
      }}
    >
      <CircularProgress size={32} aria-hidden />
      <Typography variant="body2" color="text.secondary">
        {label}…
      </Typography>
    </Box>
  );
}
