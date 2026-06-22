import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';
import { originalsDashboardSectionLabelSx } from '../originalsDashboardUi';

export type OriginalsDashboardSectionProps = {
  title: string;
  /** Optional actions aligned with the section label (edit, copy, etc.). */
  action?: ReactNode;
  children: ReactNode;
};

/** Flat subsection inside the song dashboard panel — label + content, no nested card. */
export function OriginalsDashboardSection({
  title,
  action,
  children,
}: OriginalsDashboardSectionProps): ReactElement {
  return (
    <Box component="section">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1,
        }}
      >
        <Typography component="h2" variant="caption" sx={originalsDashboardSectionLabelSx()}>
          {title}
        </Typography>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Box>
      {children ? <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{children}</Box> : null}
    </Box>
  );
}
