import React from 'react';
import Tooltip, { type TooltipProps } from '@mui/material/Tooltip';

const TOOLTIP_SLOT_PROPS = {
  tooltip: {
    sx: {
      fontFamily: 'var(--pulse-mono)',
      fontSize: '0.75rem',
      bgcolor: 'var(--pulse-surface)',
      color: 'var(--pulse-text)',
      border: '1px solid var(--pulse-accent)',
      borderRadius: 0,
      padding: '8px 12px',
      maxWidth: 240,
      lineHeight: 1.5,
      whiteSpace: 'pre-line' as const,
    },
  },
  arrow: {
    sx: {
      color: 'var(--pulse-accent)',
    },
  },
};

interface PulseTooltipProps {
  title: React.ReactNode;
  children: React.ReactElement;
  placement?: TooltipProps['placement'];
}

/**
 * Count Me In themed tooltip with mobile-friendly touch defaults.
 * Shares a single visual style with the rest of the pulse UI.
 */
export default function PulseTooltip({
  title,
  children,
  placement = 'top',
}: PulseTooltipProps): React.ReactElement {
  return (
    <Tooltip
      title={title}
      arrow
      placement={placement}
      slotProps={TOOLTIP_SLOT_PROPS}
      enterTouchDelay={0}
      leaveTouchDelay={4000}
    >
      {children}
    </Tooltip>
  );
}
