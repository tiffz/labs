import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { ReactElement, ReactNode } from 'react';

export type SessionAdvanceActionTooltipProps = {
  children: ReactNode;
  title: string;
};

export function SessionAdvanceActionTooltip({
  children,
  title,
}: SessionAdvanceActionTooltipProps): ReactElement {
  return (
    <Tooltip
      arrow
      describeChild
      enterDelay={300}
      placement="top"
      disableInteractive
      title={title}
    >
      <Box component="span" sx={{ display: 'inline-flex', justifyContent: 'center', maxWidth: '100%' }}>
        {children}
      </Box>
    </Tooltip>
  );
}
