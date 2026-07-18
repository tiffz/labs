import Chip from '@mui/material/Chip';
import type { ReactElement } from 'react';

import { formatPublishDateDisplay } from '../utils/publishDateUtils';

export type LyreflyDateChipProps = {
  /** ISO timestamp or YYYY-MM-DD calendar day. */
  value: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Read-only date chip. Shares the same visual language as {@link PublishDateChip}
 * (`.lyrefly-date-chip`) so shelf, sketchbook, memories, and publish surfaces match.
 */
export function LyreflyDateChip({
  value,
  ariaLabel = 'Date',
  className,
}: LyreflyDateChipProps): ReactElement {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T12:00:00.000Z`
    : value;
  return (
    <Chip
      className={['lyrefly-date-chip', className].filter(Boolean).join(' ')}
      size="small"
      variant="outlined"
      label={formatPublishDateDisplay(iso)}
      aria-label={ariaLabel}
    />
  );
}
