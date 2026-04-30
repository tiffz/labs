import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';

/** Compact status pill used in account menu and connection chips. */
export function EncoreStatusPill(props: {
  tone: 'ok' | 'error' | 'warning' | 'info' | 'idle';
  label: string;
  icon?: ReactNode;
}): ReactElement {
  const { tone, label, icon } = props;
  const colorMap: Record<typeof tone, { bg: string; fg: string }> = {
    ok: { bg: alpha('#16a34a', 0.12), fg: '#15803d' },
    error: { bg: alpha('#dc2626', 0.12), fg: '#b91c1c' },
    warning: { bg: alpha('#d97706', 0.12), fg: '#b45309' },
    info: { bg: alpha('#2563eb', 0.12), fg: '#1d4ed8' },
    idle: { bg: alpha('#475569', 0.1), fg: '#475569' },
  };
  const c = colorMap[tone];
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: 1,
        py: 0.375,
        borderRadius: 999,
        bgcolor: c.bg,
        color: c.fg,
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
      }}
    >
      {icon}
      {label}
    </Box>
  );
}
